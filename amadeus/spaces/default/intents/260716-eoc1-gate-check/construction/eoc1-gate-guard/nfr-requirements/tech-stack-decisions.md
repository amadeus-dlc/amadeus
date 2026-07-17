# Tech Stack Decisions — eoc1-gate-guard

## 上流入力(consumes 全数)

`../functional-design/domain-entities.md`、project.md Tech Stack(既決)、`../functional-design/business-rules.md`、`../functional-design/business-logic-model.md`、codekb `technology-stack.md`、`../../../inception/requirements-analysis/requirements.md`(FR-4 検証面)。

## 決定

追加依存ゼロ(bun/TS 標準のみ — readFileSync/Date.parse/RegExp)。lib 配置(既計測モジュール)・8コピー同期は既存 package.ts/promote:self 機構(新規機構ゼロ)。
