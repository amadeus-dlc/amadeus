# Business Rules — U9: metrics-subset

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: Meter Provider が生成できる instrument は Counter と Histogram のみ。Observable callback（ObservableCounter／Gauge 等）と任意 aggregation の生成経路を持たない（FR-EXP-5）
- BR-2: Metric の失敗は常に fail-open。fatal latch を set せず、呼出し側へ例外を伝播させず、workflow を停止させない（FR-MLM-1 の計測経路、FR-EVT-6 の失敗契約に従う）
- BR-3: Metric Store は machine-local JSONL とし、network flush・Collector 依存を持たない。短命 process が即時終了しても計測済み record が残る（FR-EXP-5、NFR-2 と整合）
- BR-4: Metric record は発行時点の active Context の trace ID・span ID を保持する形式を取る。相関情報を後付けで推測しない（FR-MLM-1）
- BR-5: Metric の出力先は Metric Store に限定し、audit JSONL（canonical Journal）へ混入させない（telemetry 経路の分離。services.md の通信契約どおり）

## 条件付き振る舞い

- BR-6: active Context が存在しない状況での計測は、相関フィールドを空にして成功扱いとする。欠落をエラーにしない（fail-open の一貫適用。FR-MLM-1）
- BR-7: Metric Store への append 失敗時は、失敗した record を捨てて後続計測を継続する。retry・queue は持たない（同期・短命 process の前提に適合。FR-EXP-5）
- BR-8: exporter は U4 の hardened `LocalMetricExporter`（`export(metric): void`）をそのまま利用し、本 Unit で exporter を差し替え・再実装しない（unit-of-work.md の U9 依存関係どおり）
- BR-9: redaction policy は U4 側の二層（write-time＋export 境界）に委譲し、Metric 属性に機微情報（prompt・argv・credential・無許可パス）を計測側で付与しない（FR-DST-3 と整合）
- BR-10: Meter Provider の二重登録は不変条件違反として例外とする（fail-open の対象外。登録契約は tracer-provider の不変条件に揃える）
