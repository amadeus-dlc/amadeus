# Security Requirements — setup-foundation

> ステージ: nfr-requirements (3.2) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(fetch/extract)、ADR-003、construction フェーズ Security ルール

## SEC-F01: アーカイブ展開の経路安全性(最重要)

tar.gz 展開時、エントリパスを正規化し **展開先ディレクトリ外への書き出し(path traversal、`../` や絶対パス)を拒否**する。**リンク系エントリ(symlink・hardlink)は種別を問わず一律拒否**する(git archive 由来の codeload アーカイブは通常ファイルとディレクトリのみを含むため、リンクの出現自体が payload 異常)。違反エントリを検出したら `payload-invalid` として展開全体を中止(部分展開物は破棄)。

- 検証: 悪意あるエントリ(`../evil`、絶対パス、symlink、hardlink)を含むフィクスチャ tar でテスト(落ちる実証)
- 出典: BR-F10(payload-invalid)・BR-F06〜F08(取得失敗分類)の安全側具体化(business-rules)

## SEC-F02: 通信の最小面

- HTTPS のみ(api.github.com / codeload.github.com)。リダイレクトは同一2ホスト内のみ追従
- 認証情報を扱わない・保存しない・ログしない(ADR-003。GITHUB_TOKEN 拡張は将来スコープ)

## SEC-F03: 一時領域の衛生

- 展開は OS 一時ディレクトリ配下の専用サブディレクトリ(実行ごとに一意)で行い、プロセス終了時に削除する
- 一時領域のパスをマニフェスト等の永続成果物に書かない

## SEC-F04: 入力検証(システム境界)

- GitHub API 応答・アーカイブ内容は信頼しない入力として扱う: JSON は Result パース(Parse, Don't Validate)、タグ名は SemVer.parse を通過したもののみ使用
