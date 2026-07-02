# U002 approval evidence の検査

## ユニット

`taskGeneration.status` が `passed` の場合に、人間承認の evidence が存在することを `amadeus-validator` で構造検査できるようにする Unit である。

## 対象要求

- R004
- R005

## 価値境界

この Unit は、validator への approval evidence 検査の追加と、その eval の先行追加（RED → GREEN）、validator の promote 同期を扱う。

承認内容の妥当性判断、approval evidence が指す成果物の内容検査、skill 本文の契約変更（U001）は扱わない。

## 検証観点

- approval evidence を除去した fixture で validator が fail する（eval の RED 記録がある）。
- `ready_for_approval` は approval evidence なしで pass する。
- 既存の examples と `.amadeus/intents/**` が pass を維持する。
- `npm run test:it:amadeus-validator` が pass する。
- source validator と昇格先が promote 手順で同期されている。

## 未確認事項

- approval evidence の `path` が指す成果物の種類を検査で限定するかは Construction で判断する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/AmadeusValidator.ts`, `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-validator/check.ts` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-approval-evidence-validation/design.md)
