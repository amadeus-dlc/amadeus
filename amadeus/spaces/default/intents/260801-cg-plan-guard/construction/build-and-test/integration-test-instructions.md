# Integration Test Instructions — 260801-cg-plan-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(4 unit)

## 手順

- `bash tests/run-tests.sh --integration --filter "t399|t403|t402|t133|t135|t251"`
- t399(13 — 同 grep 実測): BoltDagOutcome 判定表(SKIP suffix 行含む)+compile exit code 契約+stale graph 除去。
- t403 integration(10): 発行ガードの next 経由駆動(redirect ask / 3部様式 / 非発動6行)。
- t402 integration(12)+corpus(12): approve 突合の実 record 11件 sweep(拒否5/通過6 — FD 期待表一致)。
- pin 群: t133(compile 契約改訂後)/ t135(ladder redirect 経由)/ t251(skeleton 前 autonomy 未設定)。

## 実測

全対象 green(統合断面、coverage:ci 内で全数実行済み)。docs ガード(t132 / t174)green(Bolt 4 検証)。
