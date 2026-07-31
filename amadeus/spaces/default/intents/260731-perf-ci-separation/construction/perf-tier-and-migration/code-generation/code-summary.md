# Code Summary — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U1 FD)、code-generation-plan.md

実装 branch: `bolt-perf-tier-and-migration`(PR #1848)。コミット列: 5f5ead68b(Red spec)/ ac4f80799(perf tier)/ 76edf056e(移設)/ e8b55dd68(registry+t112 fixture)/ e81c9427d(分類器 branch coverage)。

## 実装内容

- perf tier: `tests/lib/run-tests-args.ts` 新設(Level に "perf"、ParsedArgs.runPerf、ParseArgsIo 注入 — runner が import 不能なため seam 抽出。t220↔run-tests-totals の既習様式)+ run-tests.ts の --perf 分岐(e2e 同型・parallel 可)
- 移設: business-rules.md BR-U1-5 の目録どおり6ファイル(t258/t257/t259 分割、t269/t-plugin whole、t292 実時間2件)。covers: 両側保持、`// size: large`、旧 @test-size 注釈是正(domain-entities.md の台帳どおり)
- t258 timeout 250_000(導出式コメント verbatim — BR-U1-7)、t257 は 120_000 維持
- coverage: TEST_TIERS+perf、registry regen(ratchet held 302/547)、allowlist remap 0件該当(271エントリ全列挙)、patch-gate 125/125

## 検証(全 exit 0)

typecheck / lint(284 warnings = 前後同数)/ dist:check / promote:self:check / --ci(674 files、perf 0 実行)/ --perf(6 files green)/ coverage:ci / registry --check / project-gate --check(88.30% vs 40.94%)/ patch-gate --check / t05 / t-test-size-drift 系。Red 実測 4 fail → Green 14 pass。除外述語の落ちる実証 = probe --ci 0 / --perf 1(非コミット)。詳細: scratchpad/bolt1-verification.md(builder 報告)

## 逸脱(全て申告済み・裁定済み)

1. FR-5b baseline 再カット見送り — ユーザー承認(要件前提訂正を requirements.md に記録)
2. argv seam の io 注入抽出 — 既習様式準拠で受理
3. 分類器の共有抽出(tests/lib/guard-corpus-ast.ts)— canonical 1定義で受理
