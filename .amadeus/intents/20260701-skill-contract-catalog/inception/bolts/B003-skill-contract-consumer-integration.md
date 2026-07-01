# B003: Skill Contract consumer integration

## 概要

- validator、evaluator、decision review、learning review の Skill Contract 参照入口を追加する。

## 対象ユニット

- U003

## 設計

- [U003 Unit Design](../units/U003-skill-contract-consumer-integration/design.md)

## 完了条件

- validator または evaluator が Skill Contract を参照できる。
- decision review と learning review が入力にできる契約項目が生成物に含まれる。
- validator の `passed` は内容承認ではなく構造検出である境界が維持されている。
- `npm run typecheck` と `npm run contracts:check` が通る。

## 依存

- B001
- B002

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/generated/skill-contracts.ts`, `.agents/skills/amadeus-validator/validator/generated/skill-contracts.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | validator または evaluator の参照入口 | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | Skill Contract の生成 Markdown | 未確認 | なし | 未確認 |

## 未確認事項

- なし。
