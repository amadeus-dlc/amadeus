# B001 雛形生成スクリプトと eval の実装

## 概要

`skills/amadeus-validator/scripts/` に phase 遷移の `state.json` 雛形を生成、更新する同梱スクリプトを新設し、eval を先行追加（RED → GREEN）で実装する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-state-scaffold-contract/design.md)

## 完了条件

- 6 遷移（Intent Capture、Inception 開始と完了、Construction 開始、Functional Design、Bolt 準備、finalization）の雛形を生成、更新でき、生成直後の validator が `state.json` に起因する構造 fail を出さない。
- 既存の値と前 phase の状態ブロックを保持し、同じ遷移の再実行が冪等である。
- 生成済み契約（`validator/generated/**`）を実行時に参照し、状態語彙の直書きを最小にしている。
- eval が実装前の失敗（RED）を記録し、repo の標準検証（`test:it:*`）から実行される。
- 配布先ユーザー環境相当（repo root の開発用スクリプトを参照しない状態）で `bun` から実行できる。

## 依存

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/scripts/`（新設） | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` または `dev-scripts/evals/` 配下の eval | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `package.json`（eval の実行入口） | 未確認 | なし | 未確認 |

## 未確認事項

- 引数体系、出力形式、eval の置き場所は Task Generation と実装で確定する。
- 生成済み契約でカバーされない state 構造の定義方法は Task Generation と実装で確定する。
