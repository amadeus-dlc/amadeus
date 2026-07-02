# B003 approval evidence 検査の実装

## 概要

`amadeus-validator` に `taskGeneration.status` が `passed` の場合の `kind: approval` evidence の実在検査を追加し、eval の改変ケースを先行して追加する Bolt である。

## 対象ユニット

- U002

## 設計

- [U002 Unit Design Brief](../units/U002-approval-evidence-validation/design.md)

## 完了条件

- `dev-scripts/evals/amadeus-validator/check.ts` に、approval evidence を除去した fixture が fail することの確認が追加され、実装前に失敗（RED）が記録されている。
- `passed` で `kind: approval` の evidence がない場合に validator が fail を返す。
- `ready_for_approval` は approval evidence なしで pass する。
- 既存の examples と `.amadeus/intents/**` が pass を維持し、`npm run test:all` が pass する。
- source validator と昇格先が promote 手順で同期されている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/AmadeusValidator.ts`, `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-validator/check.ts` | 未確認 | なし | 未確認 |

## 未確認事項

- approval evidence の `path` が指す成果物の種類を検査で限定するかは Task Generation と実装で確定する。
