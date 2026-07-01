# U003: Skill Contract consumer integration

## ユニット

- validator、evaluator、decision review、learning review の Skill Contract 参照入口を扱う。

## 対象要求

- R005

## 価値境界

- この Unit は、consumer が Skill Contract を入力として参照できる入口を扱う。
- この Unit は、validator の構造検出と evaluator の品質評価を分ける。
- この Unit は、#257 と #259 の全実装を所有しない。

## 検証観点

- validator または evaluator が Skill Contract を参照できる。
- decision review と learning review が入力にできる契約項目が生成物に含まれる。
- validator の `passed` は内容承認ではなく構造検出として扱われる。

## 未確認事項

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/generated/skill-contracts.ts`, `.agents/skills/amadeus-validator/validator/generated/skill-contracts.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | validator または evaluator の参照入口 | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | Skill Contract の生成 Markdown | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U003-skill-contract-consumer-integration/design.md)
