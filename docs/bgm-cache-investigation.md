# iPhone BGM 診断・キャッシュ調査（2026-10-12）

## 確認した事実

調査開始時のHEADは059f52f（Add temporary BGM diagnostics）。既存の差分は.DS_Storeのみ。Commit/Pushは実施しない。

対象8画面：index.html、elementary/index.html、junior/index.html、packages/japan/index.html、genre.html、play.html、specialty-learn.html、image-credits.html。すべてHTML診断マーカーと診断パネルを持ち、正しい相対パスでbgm-diagnostic.js→bgm.jsを同期読込する。参照漏れ・順序逆転はない。トップの小学生リンクはelementary/で、elementary/index.htmlと一致する。

2026-10-12 21:55頃JSTの公開先GETでは8画面、core/bgm.js、core/bgm-diagnostic.js、service-worker.jsがローカルとバイト単位で一致。各応答はCache-Control: max-age=600。この確認は現在の配信であり、実機撮影時やiPhone内の内容を証明しない。

/StudyMap/elementary は301で /StudyMap/elementary/ に移動。/StudyMap/ と /StudyMap/index.html、および /StudyMap/elementary/ と /StudyMap/elementary/index.html はそれぞれ200で同内容を返す。SWにはURL正規化がなく、それぞれ別キャッシュキー。precacheはトップのみ両形を登録し、小学生は末尾slash形のみ。通常のリンクは末尾slashなのでindex.html表記の差だけで今回の症状は断定できない。専用の配信設定ファイルは見つからない。

## 特定した不具合と混在経路

1. 診断のprobeはcontrollerchange前後で並行し、旧問い合わせの2秒タイマーが新版の応答表示を上書きする。修正前コードで「SW版応答」履歴と「版応答なし」が同居する状態を再現。この表示から旧SWが現在制御しているとは断定できない。
2. 診断版SWはmessage handlerを持つ。過去のd1d01ce/824b4aaにはない。postMessageはその瞬間のcontroller宛てで、install中の新版に転送されない。SW版応答の履歴は、応答可能なworkerから少なくとも一度返答が来たことを示す。
3. 既存fetchはnetwork-firstだがfetch(request)は通常のHTTPキャッシュを使用できる。HTMLとJS、画面ごとに取得時刻が違えば、600秒の鮮度内で新HTMLと旧JS・旧HTMLが混在し得る。installのaddAllもHTTPキャッシュを避けていなかった。
4. 診断版と直前版はstudymap-beta2.3-audio-v2を共有する。新SWのinstall中にも旧SWが同じ保存先へ書き込める。installの全precache成功後にskipWaiting、activateでclients.claimするが、取得済みHTML/JSは差し替わらない。取得の途中で制御が切り替わることもある。
5. 診断版は旧キャッシュを残し、fetch失敗時はcaches.matchで全キャッシュを検索する。古いキャッシュの一致が先に返る可能性がある。さらに遷移先が見つからない場合、トップHTMLを別URLに返し、相対JSパスまで変わる経路がある。
6. BGM本体は最初に版を記録してからaudio要素や保存値を扱う。新版が通常どおり実行されれば後段の再生拒否や例外だけでは「版未確認」にならない。旧JS、読込失敗、構文解析失敗などは候補。現状の参照・順序から恒常的なパス不良は見つからない。保存値offだけでは誰がいつ書いたか分からず、自動再生制限が保存をOFFにした証拠ではない。

## 実装

- core/bgm-diagnostic.js：診断JS版をdiag-20261012-2へ。前probeを取消し、古い返答・タイマーを無視。BGM script読込完了／失敗、実行例外、API有無を表示。
- service-worker.js：sw-diag-20261012-2、専用cache studymap-beta2.3-audio-v3。installはcache:reloadでprecache。HTML/navigation・core JSはcache:no-cacheで再検証。フォールバックは現cacheの同一URLのみ。HTTPエラーはそのまま返し、別画面用トップHTMLは返さない。範囲外プロジェクトを対象外にする。
- tests/cache-update.test.cjs：更新・応答・キャッシュ分離・診断競合の10テスト。

旧キャッシュは証拠として保持し、検索対象から除外。削除やHTML/JS URLの一括変更は不要と判断。BGM本体・設定保存・通知音・学習データ・Beta2.2・既存.DS_Store差分には変更なし。HTMLマーカーとBGM本体版は1のまま、診断JSとSW版だけ2になる。

## 検証と限界

修正前の診断競合テスト2件は失敗し、報告と同じ表示矛盾を再現。修正後の追加10件と既存BGM7件が成功。8HTMLのマーカー・相対参照・読込順を検査。SW/DOMはNode VMによる模擬テストで、Safari実機・ブラウザの実SW更新を検証したものではない。

初回の旧SW制御ページは混在し得る。新版のinstall完了・claim後、通常再読込で新方針に移行する。precacheの一部が失敗すれば旧SWのまま残る。オフラインで未保存のURL（クエリ付きやindex.html別名を含む）を開くと通信エラーになる。誤ったトップ画面を表示しないための意図した制限。CDNが古い応答を返す状況まで原子的更新を保証するものではない。

## iPhoneの最短確認（別途公開した後）

1. Safariキャッシュ・サイトデータを消さず、オンラインでトップを開き、数秒待って通常再読み込みを1回行う。更新版が出なければそこで表示を記録する。
2. 診断JS diag-20261012-2、SW sw-diag-20261012-2、cache studymap-beta2.3-audio-v3、BGM bgm-diag-20261012-1を確認。BGMをONにし、保存生値on・書込みreadBackを撮影。
3. 小学生コースへ1回移動。操作前のパネル（閉じていれば開く）を撮影。URL、HTML版、BGM版、保存値、SW版を比較。パネル操作が再生再試行を誘発し得る点は従来と同じ。
4. パネル自体が無ければ、その画面とアドレスを記録して止める。日本地理以降への移動やキャッシュ全消去は不要。
