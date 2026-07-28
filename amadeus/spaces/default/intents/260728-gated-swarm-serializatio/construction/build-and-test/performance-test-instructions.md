# Performance Test Instructions — 260728-gated-swarm-serializatio

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 比例選定の根拠: 承認済み要件(requirements.md NFR-1/NFR-2)に性能 NFR は存在しない(code-generation-plan.md にも性能設計なし)。

## 選定判断(比例原則)

本 intent は engine の判定分岐追加であり、性能契約(応答時間・スループット等)への trace が存在しないため、専用性能テストは**生成しない**(cid:build-and-test:bt-proportional-selection — 戦略名だけで検査を機械追加しない)。

## 代替観測

- 追加分岐は `next` 1回あたり O(batches) の state フィールド read のみで、既存の readBoltDagBatches 走査に相乗り(新規 I/O なし)— code-summary.md の実装所在から確認。
- 既存 CI の wall-clock drift 監視(run-tests.sh 出力)が退行の受け皿として継続稼働。
