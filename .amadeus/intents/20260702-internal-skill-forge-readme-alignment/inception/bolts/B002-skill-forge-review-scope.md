# B002: skill-forge review scope

## 概要

`skill-forge` で確認する観点と対象範囲を定義する。

## 対象ユニット

- U002

## 設計

- [design.md](../units/U002-skill-forge-review-contract/design.md)

## 完了条件

- trigger description、skill 本文、eval、Codex metadata、昇格先成果物の確認観点を分けている。
- 静的 review に留めるか、eval workflow まで実行するかを判断できる。
- Codex metadata が存在しない場合の扱いを未確認事項または後続判断として記録している。
- README 分類と skill-forge 確認観点が矛盾しない。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.agents/skills/skill-forge/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-*` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/*/evals/evals.json` | 未確認 | なし | 未確認 |

## 未確認事項

- eval workflow を実行するかは Construction で確定する。
- Codex metadata を新規生成するかは Construction で確定する。
