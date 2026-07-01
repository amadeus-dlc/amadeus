# B001: discovery dry-run mode contract

## 概要

- `amadeus-discovery` の `dry-run` mode 契約を整える。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design](../units/U001-discovery-dry-run-contract/design.md)

## 完了条件

- `skills/amadeus-discovery/SKILL.md` の mode 説明に `dry-run` が追加されている。
- `dry-run` の入力対象と出力項目が説明されている。
- `dry-run` の副作用禁止が説明されている。
- `dry-run` と `scaffold-only` の差分が説明されている。
- `dry-run` が `amadeus-history-review` と `amadeus-learning-review` の結果を入力にできるが、過去分析と学習分類を所有しないことが説明されている。

## 依存

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-discovery/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-discovery/SKILL.md` | 未確認 | なし | 未確認 |

## 未確認事項

- `dry-run` が内部 skill を直接起動するか、結果を入力として受け取るだけにするかは Construction で確認する。
- 出力形式に機械向け JSON を含めるかは Construction で確認する。
