# B002: representative skill adoption

## 概要

- 代表 skill の昇格と eval 整合確認を行う。

## 対象ユニット

- U002

## 設計

- [U002 Unit Design](../units/U002-skill-adoption-verification/design.md)

## 完了条件

- 昇格先 skill が source skill と同じ報告契約を持つ。
- 昇格が必要な場合は `dev-scripts/promote-skill.ts` を使っている。
- `dev-scripts/evals/llm-templates/check.ts` または `dev-scripts/evals/amadeus-templates/check.ts` が、報告契約の存在または対象外理由を確認できる。
- `npm run typecheck` が pass する。
- `npm run diff:check` が pass する。
- 対象 Intent の validator が pass する。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.agents/skills/amadeus-ideation/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-inception/SKILL.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.agents/skills/amadeus-construction/SKILL.md` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `dev-scripts/evals/llm-templates/check.ts` | 未確認 | なし | 未確認 |
| IT005 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-templates/check.ts` | 未確認 | なし | 未確認 |

## 未確認事項

- 関連 eval の最小実行範囲は Construction で確定する。
