# integration-test instructions（260706-runtime-graph-registrati）

上流入力: [code-summary.md](../runtime-graph-registration/code-generation/code-summary.md)

## 適用判断

hook・learnings・runtime compile の統合検証は repo 標準の検証連鎖に集約する。加えて本 Intent 自身が実地検証になっている（下記 3）。

## 手順

1. `npm run test:all` — 全 eval 連鎖。exit 0 を pass とする。
2. `npm run parity:check` — 上流 parity（engineFileExceptions 宣言 2 ファイル分を含む）。
3. 実地確認 — 本 Intent の code-generation gate で `amadeus-learnings.ts surface --slug code-generation` が自己修復つきで成立した（memory_entries_total: 6、candidates 5 件。前 Intent 260706-engine-consistency では同じ呼び出しが stage not found で fail していた）。
