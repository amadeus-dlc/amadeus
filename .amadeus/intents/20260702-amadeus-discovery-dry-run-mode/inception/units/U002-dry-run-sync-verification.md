# U002: dry-run sync verification

## ユニット

- `dry-run` 契約の source skill、昇格先成果物、eval の同期検証を定義する。

## 対象要求

- R005

## 価値境界

- source skill と昇格先成果物の同期を promote-skill で追跡できるようにする。
- text contract または関連 eval で `dry-run` 契約を検出できるようにする。
- 対象 Intent の validator 結果を PR 準備条件へ渡す。

## 検証観点

- promote-skill の実行結果が残っている。
- source skill と昇格先成果物が同期されている。
- text contract が `dry-run` mode、出力項目、副作用禁止、consumer 境界を検出できる。
- validator が対象 Intent を pass として検出する。

## 未確認事項

- text contract で読み取り専用性をどこまで検出するかは Construction で確認する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-templates/check.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/promote-skill.ts` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.agents/skills/amadeus-discovery/SKILL.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-dry-run-sync-verification/design.md)
