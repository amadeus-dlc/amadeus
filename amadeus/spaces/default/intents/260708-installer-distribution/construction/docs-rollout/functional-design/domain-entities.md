# Domain Entities — docs-rollout

> ステージ: functional-design (3.1) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-014、CON-006)、`../../../inception/units-generation/unit-of-work.md`(U5 — root I1/I2 移管済み)

## 適用外の宣言(ドメイン型なし)

本 Unit は docs(README / CHANGELOG)と宣言的メタデータ(root package.json)のみを変更し、**新規のドメイン型・コードを導入しない**。既存の t68(`tests/unit/t68-version-changelog-sync.test.ts`)が三者同期(AMADEUS_VERSION / CHANGELOG 見出し / README バッジ)の検証語彙を既に所有しており、新たな検証コードも不要(再利用棚卸し)。

## 変更対象の構造

| 対象 | 変更 | 検証 |
|------|------|------|
| README.md 導入セクション | ワンライナー(`bunx @amadeus-dlc/setup install`)を主経路に。ハーネス選択(4択ウィザード+`--harness` 例)を明記。`cp -r dist/<harness>` は README から**削除**し docs/guide のトラブルシュートへ移設(business-logic-model の単一決定) | FR-014 受け入れ基準(grep 2点: cp -r 主経路の不在/bunx・npx・ハーネス選択・install・upgrade 言及の存在) |
| README.md バッジ | framework 版バンプに同期 | t68 |
| CHANGELOG.md | `## [X.Y.Z] - date` 見出し+installer 導線の変更内容 | t68 |
| packages/framework/core/tools/amadeus-version.ts | AMADEUS_VERSION バンプ(+`bun scripts/package.ts`/`promote:self` で dist・セルフインストールへ反映、同一コミット) | t68(dist/claude コピーの内部整合)+dist:check/promote:self:check(全 dist ツリーが core を反映 — 相補的2機構) |
| root package.json | I1: license `(MIT OR Apache-2.0)` / I2: repository.url 是正+`repository.directory` 削除(旧モノレポ残骸 — raid-log I2 の対応欄どおり)(U4 から移管) | 目視+npm ページは publish 後検証(U4 手順書6) |
