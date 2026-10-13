# iPhone Chrome 旧BGM対策（2026-10-13）

## 原因と確認事実

- 調査時HEAD: eb07c17。作業開始時の既存差分は .DS_Store のみ。Commit/Pushは行っていない。
- 実機報告: Safariは bgm-gesture-20261013-1、Chromeトップは bgm-diag-20261012-3。版クエリ付きBGM単体では新版取得可能。
- ローカル・公開中のBGM参照は全8画面で版なし。トップだけにクエリを付けても子scriptのURLは変わらない。これが旧HTTPキャッシュを再利用できる経路。
- 2026-10-13 23:31 JST頃、公開先の8画面とSW・BGMをGET。全て200、Cache-Control: max-age=600。版なしBGMもこの調査環境では新版。Chrome実機でどのHTTPキャッシュ／SWが旧版を返したかは未確定。最新版が配信できない恒常的な問題は確認されない。
- 現行SWはnetwork-first、HTML/core JSはno-cache、同一現行cacheの完全一致URLだけを通信失敗時に参照。クエリを無視するfetch処理はない。ただしprecacheはpathnameに変換し、将来の版クエリが落ちる構造だった。

## 最小修正

8画面: index.html、elementary/index.html、junior/index.html、packages/japan/{index.html,genre.html,play.html,specialty-learn.html,image-credits.html}。

- BGM: core/bgm.js?v=bgm-gesture-20261013-1 に統一。
- 診断とPWA登録scriptも ?v=20261013-1。診断コードは維持し、HTMLマーカーのみ cache-20261013-1 に更新。診断JS表示は従来の diag-20261012-3。
- service-worker.js: sw-cache-20261013-1、保存先 studymap-beta2.3-audio-v4。precacheはhrefでクエリ保持、版付きscriptを追加。旧HTML互換の版なしscriptも保存。
- 新SWはHTML/navigation/core JSをcache:reloadで取得し、ブラウザHTTPキャッシュを迂回。画像等の取得方針、audio/range除外、完全一致フォールバック、HTTPエラー扱い、skipWaiting/claimは維持。旧cacheは残すが参照しない。
- core/pwa.js: SW登録URLとscopeは固定したまま updateViaCache:none。SW更新時のHTTPキャッシュを利用しない設定（https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache）。

## 旧HTMLからの通常更新

既存登録のSWはオンラインのscope内遷移／登録処理で更新確認される。SW自体を変更したため、旧HTMLしか最初に表示されなくても、新SWのinstall成功→skipWaiting→claim後に通常再読み込みすれば、新SWがHTMLとcore JSをHTTPキャッシュを迂回して取得する。既に実行された旧JSはclaimだけでは置換されないので再読み込みが必要。自動リロードは学習途中の操作を壊し得るため追加しない。

これはネットワークと配信が新版を返し、precacheの全ファイル取得が成功することを前提とする。公開反映途中、CDNの旧応答、SW更新確認の遅延、オフライン、install失敗まで即時収束は保証できない。新SW版が出ない場合、scriptクエリだけの効果と混同せずHTML/SW診断を記録する。index.html別名や任意ページクエリの未保存URLに対するオフライン制限は従来どおり。

## 検証

- tests/bgm.test.cjs + tests/cache-update.test.cjs: 32/32成功（Node DOM/media/SW模擬）。
- ON保持、保存位置、拒否後のpointer/touch/click/keydown復帰、明示OFF、touch+click重複、通知音独立ON/OFF、学習記録保持。
- install失敗、claim、HTML/JSのHTTPキャッシュ迂回、版クエリのprecache/network/cacheキー保持、別クエリ／旧版なしcacheへの誤フォールバック防止、全8HTMLの版・順序・相対URL、固定SW URL/scopeと更新設定、診断競合。
- git diff --check成功。HTML差分は3script参照とHTML版表示のみ。BGM本体・診断JS・sfx・Beta2.2の画面ロジック・画像・学習処理は変更なし。iPhone Safari/Chrome実機での音声とブラウザ実SW更新は未検証。

## GitHub Desktopで公開するファイル

本番用10ファイル: 上記8HTML、core/pwa.js、service-worker.js。
記録用2ファイル: tests/cache-update.test.cjs、本書 docs/bgm-chrome-cache-fix.md。
既存の .DS_Store はこの修正に含めない。core/bgm.jsは既にHEADの新版で、今回の変更対象ではない。

## 公開後の最短実機確認

1. GitHub Pagesの反映完了後、iPhone Chromeで https://studymaster-itsuaki.github.io/StudyMap/ をオンラインで開く。数秒待ち、通常再読み込み。履歴・サイトデータ削除は不要。
2. BGM診断で HTML cache-20261013-1、BGM JS bgm-gesture-20261013-1、SW sw-cache-20261013-1、cache studymap-beta2.3-audio-v4 を確認。診断JSは diag-20261012-3 のままで正常。HTML版はパネル見出しに表示。
3. ONのまま小学生コースへ移動し、同じBGM版と保存生値 on を確認。再生待ちなら画面を一度タップ。OFFを明示した後は通常タップで再生しないことも確認。通知音も一度確認。
4. Safariでも同じ版を確認。全画面の経路はトップ→小学生→日本地理→ジャンル→プレイ、特産品学習、画像クレジット、および中学生。
5. 旧版なら10分程度後に再度オンラインで開いて再読み込み。なお旧版の場合はURL・HTML版・BGM版・制御SW版・cache名・BGM読込URLを記録。新SW版が出ているかが次の切り分けポイント。
