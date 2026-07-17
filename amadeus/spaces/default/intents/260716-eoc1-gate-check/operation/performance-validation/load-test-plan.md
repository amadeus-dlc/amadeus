# Load Test Plan — eoc1-gate-check

## 上流入力(consumes 全数)

`../../construction/eoc1-gate-guard/nfr-design/performance-design.md`(O(n) 2KB)、`../../construction/eoc1-gate-guard/nfr-requirements/reliability-requirements.md`(RR-2)、`../../construction/build-and-test/build-test-results.md`、`../observability-setup/dashboards.md`(観測 N/A 根拠)。

## 適用判断(N/A、根拠付き — build-and-test:c1 同族)

負荷対象のサービス・スループット要件が不在(CLI ガード、gate-start 1回あたり単一ファイル読み)。負荷テストの機械追加はしない。実運用相当の検証は dogfooding 8回+corpus sweep(130ファイル一括駆動 — 実測で即時完了)が兼ねる。
