# Performance Test Instructions — eoc1-gate-check

## 上流入力(consumes 全数)

`../eoc1-gate-guard/nfr-design/performance-design.md`、`../eoc1-gate-guard/code-generation/code-summary.md`。

## 適用判断(N/A、根拠付き)

性能 SLO なし(nfr-design どおり単一ファイル読み O(n)、n=2KB 級 — gate-start 全体に対し無視可能)— build-and-test:c1 により検査の機械追加なし。
