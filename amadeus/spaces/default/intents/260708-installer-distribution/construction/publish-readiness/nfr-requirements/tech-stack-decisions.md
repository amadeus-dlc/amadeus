# Tech Stack Decisions — publish-readiness

> ステージ: nfr-requirements (3.2) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(PackContract/PackReport)・`business-logic-model.md`、U1 tech-stack-decisions(フロア 18.3)

| 領域 | 決定 | 根拠 |
|------|------|------|
| pack 実行 | `npm pack --dry-run --json`(npm CLI — 開発時ツール、実行時依存ではない) | FR-018 の実ツール検証(c4)。bun pm pack は出力契約が異なるため採用しない(npm 互換の検証は npm 自身で行う) |
| テスト実装 | 既存 bun:test + tests/integration 層 | BR-P04(新規ランナー禁止) |
| JSON 比較(ドリフトテスト) | 標準 JSON.parse+ソート比較 | 依存ゼロ |
| 手順書配置 | `docs/guide/publishing-setup.md` | 既存 docs/guide 構造への追加(新規体系を作らない) |

- 注: npm CLI は GitHub ホスト型 ubuntu-latest ランナーの標準プリインストール(actions/runner-images のツールセット)とメンテナ環境の双方に既存。新規セットアップ不要 — **前提**: この可用性は初回 CI 実行(pack 契約テストのグリーン)で実測確認する
