# トラマメMondアーカイブ（試作版）

GitHub Pagesでそのまま公開できる静的サイトの試作です。

## 今回の試作でできること

- 話題ごとの表示
- 質問 → 回答のカード表示
- 関連質問をツリー化できるデータ構造
- Mond / X へのリンク
- キーワード検索
- スマホ対応
- `data.json` を編集するだけで掲載内容を追加・変更できる構成

## GitHub Pagesで公開する

1. GitHubで新しいPublicリポジトリを作る（例: `toramame-mond-archive`）
2. このフォルダの中身をリポジトリのルートへアップロード
3. GitHubの `Settings` → `Pages`
4. `Build and deployment` の `Source` を `Deploy from a branch`
5. Branchを `main` / `/ (root)` にしてSave
6. 数分待つと公開URLが表示されます

## 回答を追加する

基本的には `data.json` の `topics` にデータを追加します。
サイト本体（HTML/CSS）を触る必要はありません。

### ツリーの考え方

各回答には `id` があり、`children` に子となる回答のIDを並べます。

例:

    A
    ├─ B
    └─ C
       └─ D

なら、

- Aの `children`: ["B", "C"]
- Cの `children`: ["D"]

とします。

## 本番化するとき

試作を気に入ってもらえたら、次の段階で「ブラウザ上の管理画面から追加・並べ替えできる仕組み」に置き換えられます。
