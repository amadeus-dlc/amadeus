# Performance Test 手順 — Slop cleanup

上流入力: `code-generation-plan.md`、`code-summary.md`

## 適用判定

今回の要件には latency、throughput、resource usage の定量的 NFR がなく、変更はコメント、未読フィールド、Markdown 空白に限定される。実行経路、アルゴリズム、I/O、データ量は変わらないため、load / stress / soak test は非適用とする。

## 代替検証

性能退行を生む runtime 差分がないことを次で確認する。

- Journal はコメント以外の runtime 行が不変である。
- Observability は読まれていない `registered` の宣言・初期化だけが削除されている。
- `t357-observability-seam` で disabled 時の zero-cost と flush 契約が成功する。

## 再判定条件

Journal の serialize / parse、observability の event generation、filesystem / network I/O、buffering、sampling を変更する場合は本判定を破棄し、定量目標を定義して benchmark または load test を追加する。
