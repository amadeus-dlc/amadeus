# B002 既存検証との整合確認

## 概要

wave 実行契約の追加が既存の検証と契約に影響しないことを確認する。
e2e eval（mock）の非破壊確認、影響がある場合の期待値調整、skill-forge 確認の記録を含む。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-bolt-wave-execution-contract/design.md)

## 完了条件

- 標準検証（`npm run test:all`。`test:e2e:construction:*` の mock eval を含む）が pass する。
- e2e eval の期待出力に影響がある場合は、調整の範囲と理由が記録されている。
- skill-forge 確認（skill 境界、本文指示の矛盾、eval coverage）の結果が PR 説明に記録されている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/llm-templates/`（影響がある場合のみ） | 未確認 | なし | 未確認 |

## 未確認事項

- e2e eval（mock）の期待出力への影響の有無は Construction で確認する。
