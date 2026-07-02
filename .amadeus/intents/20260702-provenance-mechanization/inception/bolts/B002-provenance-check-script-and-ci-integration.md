# B002 provenance:check の dev-script と eval の実装、CI 組み込み

## 概要

記録済みの値を再計算して照合し、drift（md5 不一致、commit 不一致、参照先欠落）を検出して失敗として報告する `provenance:check` を新設し、eval を先行追加（RED → GREEN）で実装したうえで `npm run test:all` の chain に組み込む Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-provenance-record-contract/design.md)

## 完了条件

- `provenance:check` が `provenance/` ディレクトリが存在する Intent だけを検査対象にする（既存 Intent への遡及なし）。
- md5 不一致、commit 不一致、参照先欠落を検出して失敗として報告する。
- `provenance:check` の実行が `npm run test:all` の chain に含まれ、drift があると標準検証が fail する。
- eval が実装前の失敗（RED）を記録し、repo の標準検証（`test:it:*`）から実行される。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `dev-scripts/`（`provenance:check` 新設） | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/` 配下の eval（新設） | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `package.json`（`provenance:check` の実行入口、`test:all` chain への組み込み） | 未確認 | なし | 未確認 |

## 未確認事項

- eval の置き場所と `test:all` chain 内の組み込み位置（`test:it:all` 内の順序）は Task Generation と実装で確定する。
