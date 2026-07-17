# Deployment Architecture — eoc1-gate-guard

## 上流入力(consumes 全数)

`../nfr-requirements/tech-stack-decisions.md`(追加依存ゼロ)、`../functional-design/business-logic-model.md`、`../../../inception/requirements-analysis/requirements.md`(FR-4 dist 同期)、`../nfr-design/performance-design.md`(コスト評価)、`../nfr-design/security-design.md`(層別表)。

## 配布(既存機構への合流 — ci-pipeline:c2 同型)

- 正本: `packages/framework/core/tools/amadeus-lib.ts`(述語)+`amadeus-state.ts`(配線)— `bun scripts/package.ts`+`promote:self` で dist×6+self-install×2 の8コピー同期(既存ドリフトガード dist:check / promote:self:check が同期を強制)
- CI: 既存 ci.yml がそのまま検証面(新規 workflow なし)
- インフラ変更: なし(record 書き込みも検査自体は読み取り専用 — セキュリティレビュー: 攻撃面追加ゼロは security-design 層別表参照)
- ロールバック: 通常 PR revert(deployment-pipeline:c3 準拠)— 検査は state 非破壊のため revert 副作用なし
