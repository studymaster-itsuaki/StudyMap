# StudyMap Beta 1

## Beta 1 の変更点

- 個人名・兄弟別の入口を廃止し、トップを「小学生コース」「中学生コース」に変更
- `elementary/` と `junior/` を追加し、コース別URLを直接共有可能に変更
- 旧 `users/younger/`・`users/older/` は新コースへ自動転送して互換性を維持
- スマホを最優先に、iPad・PCにも対応するレスポンシブ調整を実施
- PWA用のmanifest、アイコン、Service Workerを追加
- iPhone/iPadのホーム画面追加と、対応ファイルのオフラインキャッシュに対応
- 日本地理（学ぶ・練習・チャレンジ）と共通BGM・効果音の既存構成を維持
- 名産品学習画面に残っていた、存在しない旧BGM要素を参照するコードを削除

## コース別URL

GitHub Pagesの公開URLが `https://ユーザー名.github.io/StudyMap/` の場合：

- 小学生コース: `https://ユーザー名.github.io/StudyMap/elementary/`
- 中学生コース: `https://ユーザー名.github.io/StudyMap/junior/`

## BGMについて

このZIPには著作権上の理由からBGM実音源が含まれていません。従来どおり、利用する音源を次の名前で配置してください。

`assets/audio/bgm.mp3`

効果音はブラウザで生成する方式のため、追加ファイルは不要です。

## 公開後の確認

1. トップから小学生・中学生の両コースを開く
2. コース別URLを直接開く
3. 小学生コースから日本地理を開き、4分野の学ぶ・練習・チャレンジを確認
4. BGM・効果音のON/OFFとページ移動後の状態保持を確認
5. iPhoneのSafariで「共有」→「ホーム画面に追加」を実行
6. ホーム画面のアイコンから全画面表示で起動することを確認

PWAの動作確認は、ローカルファイルを直接開くのではなく、GitHub PagesなどHTTPS上で行ってください。
