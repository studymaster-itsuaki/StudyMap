# BGM OFF保存経路の調査と設定分離（2026-10-12）

## 結論と未確定事項

HEAD 99436cf のコードを全検索。修正前のOFF保存箇所は core/bgm.js の pause() → write(KEY_ON, "off") のみ。
内部呼び出しは document click（data-studymap-bgmに一致）→ toggle() → pause()。外部公開 window.StudyMapBGM.pause() と .toggle() からも到達できるが、リポジトリ内に外部APIの呼び出し元はない。

初期化・pageshowはresume()へ進む。resume()のcatchは表示状態だけを更新する。audio pauseイベントは診断のみ。pagehide・storage・pageshowの停止はネイティブaudio.pause()で、設定を保存する独自pause()とは別。visibilitychangeは診断のみ。UI同期update()は文字列・属性更新だけ。小学生HTMLはpwa.js、診断、bgm.js、sfx.jsを読み込み、旧互換処理からのOFF呼出しは見つからない。

実機の「このページの書込みoff」は独自pause()の実行を示すが、その呼び出し元は旧診断にはない。直近例外は成功後も残るため、NotAllowedErrorとOFF書込みの前後関係や因果関係も表示値だけでは確定しない。今回の実機根本原因を特定済みとは扱わない。

## 前回の調査・テストの不足

既存調査文書は配信・キャッシュと診断の競合が中心。既存7テストはplay拒否、ライフサイクル、模擬ボタン操作を扱うが、外部APIのpause/toggleとスクリプト生成clickを検証しない。診断もsource/stack/isTrustedを持たず、OFF保存箇所から実機の呼出し元まで遡れなかった。実機で何が呼んだかを見落とした理由は断定できない。

## 変更

- core/bgm.js：pause()は再生停止のみとしON設定を維持。公開toggle()も再生状態を切替え、OFFを保存しない。OFF保存はブラウザ由来のBGMボタンclickに限るdisableFromButton()へ移動。スクリプト生成clickは無視。通常のタッチからブラウザが生成するclickやキーボードによるボタン操作は対象。UIデザイン変更なし。
- 同ファイル：設定書込みsource/stack、停止source/stack、ボタンtype/isTrusted/操作前状態を診断へ記録。BGM版 bgm-diag-20261012-3。
- core/bgm-diagnostic.js：直近制御とボタン操作を表示。診断版 diag-20261012-3。書込みスタックは直近10イベントから消えても直近書込み欄に残る。
- tests/bgm.test.cjs：公開API、スクリプトclick、明示OFFのsource/stack、トップON→遷移先拒否→通常操作復帰→reload→複数ページ→戻る→OFF保持を追加。

公開APIのpause/toggleの意味は変わるが、リポジトリ内の呼出し元はない。停止後の通常操作はON意図に従って再生を再試行する。拒否時の再試行と保存位置復元は既存実装を維持。

## テスト

node --test tests/*.test.cjs：20/20成功。git diff --check成功。
修正前コードに新テストを実行：公開pauseとスクリプトclickの2件が失敗。NotAllowedError単独からOFFになる現象は修正前でも模擬再現せず、これらの2経路が実機で使われた証拠ではない。
DOM・メディア・ページ切替はNode VMによる模擬。Safari実機、実ブラウザの履歴キャッシュやユーザーアクティベーションの検証は未実施。
通知音、Beta2.2、学習データ、画像、HTML/CSS、サービスワーカーは変更なし。既存.DS_Store差分を維持。Commit/Push/公開は未実施。

## iPhoneでの次の確認

この変更を配信する別途承認済み手段が必要。現在の公開サイトには未反映。
1. 更新版を開き、BGM bgm-diag-20261012-3／診断JS diag-20261012-3を確認。サイトデータは消さない。
2. トップでON、再生と保存onを確認して小学生コースへ移動。
3. 拒否された場合も解釈ON／保存on／blockedまたはpausedであることを確認。BGMボタン以外の見出し等を通常タップして再生復帰を確認。診断を開く操作自体でも再試行される点に注意。
4. OFFが出た場合は「直近書込み」「直近制御」「直近BGMボタン」「時系列」を記録。source、stack、trustedから呼出し元を絞る。trusted=trueでも意図したタップだったかは実機操作と照合する。
5. BGMボタンで明示OFFにし、source=bgm-button.click／readBack=offを確認。通常タップ・reload・戻るでもOFF維持を確認。
6. 再びONにしてreload、戻る、日本地理など複数ページ遷移を確認。拒否時は通常タップで保存位置付近から復帰することを確認（位置保存は再生中1秒間隔とpagehide）。
