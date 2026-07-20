# Performance Test Instructions — goa-sparse-family

上流入力(consumes 全数): `../goa-sparse-acceptance/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../goa-sparse-acceptance/code-generation/code-summary.md`（`code-summary`）、`../goa-sparse-acceptance/nfr-design/performance-design.md`。

## 検証方式

常駐service/RPS/latency SLOは非該当。固定 wall-clock を gate にせず、`tests/unit/t-norm-metrics.test.ts` の production-coincident seam を実行する。

```sh
bun test tests/unit/t-norm-metrics.test.ts
```

## 構造的性能基準

- `N=1/2/4` の合成入力で head数とrecord数が比例する。
- offsets は厳密単調、実 `RegExp.exec` 呼出しは `H+1`。
- recordごとの全文再走査、silent sampling、先頭N件打切りを行わない。
- 実memory corpusの母数は実行時に導出し、履歴値をcapacity定数にしない。

## 非該当項目

load/stress/soak、autoscaling、network throughput、CPU/memory SLOはservice/resource非追加のためN/A。wall-clockは診断値に限り、合否へ使用しない。
