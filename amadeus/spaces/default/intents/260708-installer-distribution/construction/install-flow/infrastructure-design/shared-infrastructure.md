# Shared Infrastructure — install-flow

> ステージ: infrastructure-design (3.4) / Unit: install-flow / 作成: 2026-07-08
> 出典: U1 shared-infrastructure.md、`../nfr-design/logical-components.md`

## 共有面(U2 が提供)

| 共有物 | 提供元 | 消費者 |
|--------|--------|--------|
| フィクスチャアーカイブ生成ヘルパー(dist → tar.gz、**codeload 形状 = 単一トップレベルラッパーディレクトリを再現** — cicd-pipeline.md の禁止事項参照) | U2(テストインフラ) | U3 の upgrade E2E(導入済みフィクスチャ) |
| 一時ターゲットディレクトリのセットアップ/破棄ヘルパー | U2 | U3 |
| applier/verifier/reporter/wizard 実装 | U2 | U3(本番コード共有) |
