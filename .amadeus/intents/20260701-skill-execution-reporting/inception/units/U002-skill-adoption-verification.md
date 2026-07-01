# U002: skill adoption verification

## ユニット

- 代表 skill への反映、昇格、eval 整合確認を扱う。

## 対象要求

- R004

## 価値境界

- U001 で定義した共通契約を、source skill、昇格先 skill、関連 eval に同じ意味で反映できる状態へする。
- 代表 skill の対象範囲と、対象外にする skill または eval の理由を追跡できるようにする。

## 検証観点

- source skill と昇格先 skill が同じ報告契約を持つ。
- 昇格が必要な場合は `dev-scripts/promote-skill.ts` を使っている。
- `dev-scripts/evals/llm-templates/check.ts` または `dev-scripts/evals/amadeus-templates/check.ts` の確認範囲が Construction 成果物から追跡できる。
- 対象 Intent の validator が pass する。

## 未確認事項

- `amadeus-discovery` と `amadeus-validator` を初回反映対象に含めるかは、Construction で差分規模を見て決める。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.agents/skills/amadeus-ideation/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-inception/SKILL.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.agents/skills/amadeus-construction/SKILL.md` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `dev-scripts/evals/llm-templates/check.ts` | 未確認 | なし | 未確認 |
| IT005 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-templates/check.ts` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-skill-adoption-verification/design.md)
