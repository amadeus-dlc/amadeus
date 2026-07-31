# Reliability Requirements — U9: metrics-subset

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## fail-open 契約

- Metric の失敗は常に fail-open。fatal latch を set せず、呼出し側へ例外を伝播させず、workflow を停止させない（BR-2、FR-EVT-6）
- Metric Store への append 失敗時は失敗した record を捨てて後続計測を継続する。retry・queue は持たない（BR-7）
- active Context 非存在時は相関フィールドを空にして成功扱いとし、欠落をエラーにしない（BR-6、FR-MLM-1）
- Meter Provider の二重登録のみ fail-open 対象外とし、不変条件違反として例外とする（BR-10）

## Metric Store の耐久性

- Metric Store は machine-local JSONL の append-only とし、書込済み record を更新・削除する経路を持たない（BR-3）
- 短命 process が network flush を必要とせず即時終了しても、計測済み record が Metric Store に残る（BR-3、NFR-2）
- 既存 telemetry buffer と同じ lockless O_APPEND 1 行書込の様式に従い、行粒度の interleave を許容する（technology-stack.md 現行断面）

## 検証

- append 強制失敗時に例外非伝播・latch 非 set・後続計測継続をテストで固定（VER-3 の telemetry fail-open 検証）
- 二重登録時に例外が発生することをテストで固定（BR-10）
