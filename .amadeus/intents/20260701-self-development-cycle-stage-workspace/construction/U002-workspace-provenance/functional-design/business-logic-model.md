# Business Logic Model

## 目的

workspace 対応記録と検証証拠を、PR 準備条件と後続 Intent から追跡できる実装対象として固定する。

## 対象 Unit

U002 workspace provenance。

## 業務ロジック

- build workspace は、エージェント、skill、validator、開発用スクリプトを動かす場所として記録する。
- target workspace は、変更差分、自己開発用 `.amadeus/`、作業中の成果物を置く場所として記録する。
- host environment は、昇格済み skill または生成された skill が動作する環境として記録する。
- target artifacts は、skill が生成、更新、検証する成果物集合として記録する。
- provenance は、対象 Intent の traceability、decisions、PR 説明のいずれかから追跡できる形で残す。

## 入力

- build workspace の path と commit。
- target workspace の path と commit。
- 利用した skill、validator、開発用スクリプト。
- stage 判定の根拠。
- validator と標準検証の結果。

## 出力

- provenance の最低記録項目。
- PR 準備条件で参照する workspace 対応記録。
- 後続 Intent に渡す検証証拠。

## 未確認事項

- 証拠を JSON として標準化する必要があるかは、後続 Intent で判断する。
