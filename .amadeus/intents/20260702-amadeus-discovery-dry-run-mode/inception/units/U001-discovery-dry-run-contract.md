# U001: discovery dry-run contract

## ユニット

- `amadeus-discovery dry-run` の読み取り専用候補表示契約を定義する。

## 対象要求

- R001
- R002
- R003
- R004

## 価値境界

- 入力テーマまたは探索対象から Intent 候補を表示する。
- `.amadeus/` 成果物、GitHub Issue、Intent Record を作らない。
- `scaffold-only` とは別の読み取り専用 mode として扱う。
- `amadeus-history-review` と `amadeus-learning-review` の結果を入力にできるが、それらの責務を所有しない。

## 検証観点

- `dry-run` mode が skill 本文から確認できる。
- 入力対象と出力項目が skill 本文から確認できる。
- 副作用禁止が skill 本文から確認できる。
- `scaffold-only` との差分が説明されている。
- 過去分析と学習分類を所有しないことが説明されている。

## 未確認事項

- `dry-run` が内部 skill を直接起動するか、呼び出し元から結果を受け取るだけにするかは Construction で確認する。
- 出力形式に機械向け JSON を含めるかは Construction で確認する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-discovery/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-discovery/SKILL.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-discovery-dry-run-contract/design.md)
