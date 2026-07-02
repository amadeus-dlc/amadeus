# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | `provenance:generate` の dev-script と eval を実装する。 | U001 | [design.md](units/U001-provenance-record-contract/design.md) | なし | [B001-provenance-generate-script-and-eval.md](bolts/B001-provenance-generate-script-and-eval.md) |
| B002 | `provenance:check` の dev-script と eval を実装し、`npm run test:all` chain へ組み込む。 | U001 | [design.md](units/U001-provenance-record-contract/design.md) | B001 | [B002-provenance-check-script-and-ci-integration.md](bolts/B002-provenance-check-script-and-ci-integration.md) |
| B003 | 記録方法（policies.md、development.md）と検査責務境界（decisions）の文書整合を行う。 | U001 | [design.md](units/U001-provenance-record-contract/design.md) | B001, B002 | [B003-record-method-and-boundary-documentation.md](bolts/B003-record-method-and-boundary-documentation.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | 生成スクリプトの存在と記録形式が、照合と文書記述の前提であるため。 |
| B002 | B001 | 照合は B001 が生成する記録形式を対象にするため。 |
| B003 | B001, B002 | 文書整合は、生成と照合の実装方針を反映するため。 |
