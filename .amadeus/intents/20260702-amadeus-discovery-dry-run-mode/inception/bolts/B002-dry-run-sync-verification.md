# B002: dry-run sync verification

## 概要

- `dry-run` 契約を昇格先成果物と text contract で検証できるようにする。

## 対象ユニット

- U002

## 設計

- [U002 Unit Design](../units/U002-dry-run-sync-verification/design.md)

## 完了条件

- `.agents/skills/amadeus-discovery/SKILL.md` が promote-skill で更新されている。
- `dev-scripts/evals/amadeus-templates/check.ts` または同等の eval が、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` 差分、consumer 境界を検出できる。
- 対象 Intent の validator が pass している。
- 必要な標準検証が pass している。
- 検証結果が Construction の `test-results.md` に記録されている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.agents/skills/amadeus-discovery/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-templates/check.ts` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `dev-scripts/promote-skill.ts` | 未確認 | なし | 未確認 |

## 未確認事項

- text contract だけで読み取り専用性を十分に検出できない場合、Construction で追加検証を検討する。
