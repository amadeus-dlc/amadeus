# U002: skill-forge 確認契約

## ユニット

`skill-forge` の確認範囲と source skill / 昇格先成果物の整合確認を定義する。

## 対象要求

- R002
- R003
- R005

## 価値境界

- `skill-forge` で確認する観点を選べることを扱う。
- source skill と昇格先成果物の差分確認、昇格手段、検証入口を扱う。
- README だけを直して skill 契約や検証とのずれを残さないことを扱う。
- README の公開入口分類そのものは U001 で扱う。

## 検証観点

- trigger description、skill 本文、eval、Codex metadata、昇格先成果物の確認範囲を分けている。
- source skill と昇格先成果物を分けて確認している。
- `dev-scripts/promote-skill.ts` の利用要否を確認している。
- `contracts:check`、`test:it:promote-skill`、`validate:workspace` などの検証候補を記録している。

## 未確認事項

- eval workflow まで実行するかは Construction で確定する。
- Codex metadata を新規生成するかは Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-*` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-*` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/*/evals/evals.json` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `package.json` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-skill-forge-review-contract/design.md)
