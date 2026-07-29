# Reliability Design — U9: metrics-subset

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の中核（fail-open 契約・Metric Store の耐久性）に対する設計。

## fail-open の設計

- Metric の失敗は常に fail-open: fatal latch を set せず、呼出し側へ例外を伝播させず、workflow を停止しない（BR-2、FR-EVT-6）。exporter は失敗を catch して即時 return する
- Metric Store への append 失敗時は失敗した record を捨てて後続計測を継続する。retry・queue を持たない（BR-7）
- active Context 非存在時は相関フィールドを空にして成功扱いとし、欠落をエラーにしない（BR-6、FR-MLM-1）
- 唯一の例外: Meter Provider の二重登録は不変条件違反として例外とする（fail-open 対象外、BR-10）。tracer-provider と同じ登録契約に揃える

## 耐久性の設計

- Metric Store は machine-local JSONL の append-only とし、書込済み record を更新・削除する経路を持たない（BR-3）
- 短命 process が network flush を必要とせず即時終了しても計測済み record が残る（NFR-2）。計測は同期 append で完了するため flush 漏れの経路が存在しない
- 既存 telemetry buffer と同じ lockless O_APPEND 1 行書込の様式に従い、行粒度の interleave を許容する（technology-stack.md 現行断面）

## 検証設計

- append 強制失敗時に例外非伝播・latch 非 set・後続計測継続をテストで固定（VER-3 の telemetry fail-open 検証、テスト先行）
- 二重登録時に例外が発生することをテストで固定（BR-10）
- active Span 配下での計測で出力 record の trace ID・span ID 一致を固定し、Context 非存在時は相関フィールドが空であることを固定（FR-MLM-1）
