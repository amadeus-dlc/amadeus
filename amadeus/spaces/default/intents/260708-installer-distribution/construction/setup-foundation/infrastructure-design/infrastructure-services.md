# Infrastructure Services — setup-foundation

> ステージ: infrastructure-design (3.4) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-design/security-design.md`・`performance-design.md`、ADR-003

## 利用する外部サービス(実行時)

| サービス | 用途 | 契約/制限 | 障害時挙動 |
|----------|------|-----------|-----------|
| GitHub REST API(api.github.com) | バージョン解決(releases/tags) | 認証なし 60 req/h/IP。1実行 ≤2req(BR-F09) | rate-limit 分類+待機案内(FR-012) |
| GitHub codeload | タグアーカイブ配信 | 認証なし・公開リポジトリ | 1回リトライ→分類エラー |
| OS 一時領域 | 展開作業域 | mkdtemp 一意・終了時削除(SIGINT/SIGTERM 込み) | 容量不足は fs エラーとして分類 |

- 新規のインフラサービス契約(クラウド・SaaS)はゼロ
