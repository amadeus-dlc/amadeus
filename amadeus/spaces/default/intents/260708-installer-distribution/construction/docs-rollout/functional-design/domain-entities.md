# Domain Entities — docs-rollout

> ステージ: functional-design (3.1) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-014、CON-006)、`../../../inception/units-generation/unit-of-work.md`(U5 — root I1/I2 移管済み)

## 適用外の宣言(ドメイン型なし)

本 Unit は docs(README / CHANGELOG)と宣言的メタデータ(root package.json)のみを変更し、**新規のドメイン型・コードを導入しない**。既存の t68(`tests/unit/t68-version-changelog-sync.test.ts`)が三者同期(AMADEUS_VERSION / CHANGELOG 見出し / README バッジ)の検証語彙を既に所有しており、新たな検証コードも不要(再利用棚卸し)。

## 変更対象の構造

| 対象 | 変更 | 検証 |
|------|------|------|
| README.md 導入セクション | ワンライナー(`bunx @amadeus-dlc/setup install`)を主経路に。`cp -r dist/<harness>` は手動代替として降格 or 削除 | FR-014 受け入れ基準(grep で主経路確認) |
| README.md バッジ | framework 版バンプに同期 | t68 |
| CHANGELOG.md | `## [X.Y.Z] - date` 見出し+installer 導線の変更内容 | t68 |
| packages/framework/core/tools/amadeus-version.ts | AMADEUS_VERSION バンプ | t68 |
| root package.json | I1: license `(MIT OR Apache-2.0)` / I2: repository.url 是正(U4 から移管) | 目視+npm ページは publish 後検証(U4 手順書6) |
