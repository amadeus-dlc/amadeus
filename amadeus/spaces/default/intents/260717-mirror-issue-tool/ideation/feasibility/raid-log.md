# RAID Log — amadeus-mirror ツール

上流入力(consumes 全数): intent-statement.md(intent-capture)

## Risks(リスク)

- R1(中): park 状態の機械可読取得が state ファイルの prose 依存になりうる — design 段で状態行の正フィールドを確定(2026-07-17 起票)
- R2(低): gh 一時失敗 — sync 冪等性で回復可能

## Assumptions(前提)

- A1: gh CLI が認証済みで存在する(実測済み 2026-07-17。未認証環境ではツールは loud エラー)
- A2: ミラー Issue は amadeus-dlc/amadeus リポジトリに起票する(単一リモート)

## Issues(課題)

- なし(2026-07-17 時点)

## Dependencies(依存)

- D1: norm PR #1159 のマージ(運用ノルムの main 反映)— ツール実装自体はブロックしないが、運用開始の前提
- D2: intents.json / summary --json の現行様式 — 様式変更時は追随が必要(repo ローカルツールのため同一 PR で追随可能)
