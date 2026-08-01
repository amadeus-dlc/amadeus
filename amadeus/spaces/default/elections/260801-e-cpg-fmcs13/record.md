# Election Record — E-CPG-FMCS13

- question: 260801-cg-plan-guard formal-model-check の §13 学習選定。本ステージは出荷済み plugin の無改変実行(FormalElection.tla / .cfg も無改変、TLC 完全探索 NOT_DETECTED、completion marker complete:true、5,203,730 states / 529,692 distinct / queue 0、model-completeness センサー PASSED)。運用知見1点のみ観測: run-model-check は既存 --out ディレクトリで OUT_CONFLICT (exit 2) を返す fail-closed 挙動(仕様どおり、README 記載域)。新規ノルム候補なし = 0件を提案。

裁定: 0件で可(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 0件に同意するが、提案文の出典表記1点の訂正を条件とする。提案は OUT_CONFLICT を「仕様どおり、README 記載域」とするが、plugins/formal-model-check/README.md(68行、H2 = Bundle layout / Opt-in runtime dependency / Working with models / Compose / doctor / drop)を OUT_CONFLICT・already exists・--out で grep して 0 hit を実測した。実際の出典は (a) stages/formal-model-check.md:13 の exit code クラス記述(「exit 0 detected / 1 not-detected / 2 harness-error」)と (b) 実装コード tools/run-model-check-artifacts.ts:137 verbatim 'output directory already exists' / :142 'run-specific output directory already exists'、型 union :67、および別機序の tools/run-model-check-paths.ts:83 'output and model workspace must not overlap' である。既記載であること自体は真だが README ではないため、tally・裁定記録へ「README 記載域」を verbatim 転記しないこと(cid:requirements-analysis:mechanism-cite-verify-at-draft)。なお README に --out の運用注記が無いこと自体は docs 面の改善余地だが、これは Issue 事項であって memory 層へ persist する §13 ノルムではないため、本訂正は choice 1 を変えない。
票タイムライン: subagent-1 2026-08-01T22:00:13Z → subagent-2 2026-08-01T22:00:55Z(受理 2026-08-01T22:01:02Z) → 配信 2026-08-01T22:01:16Z → 配信 2026-08-01T22:01:16Z → 開票 2026-08-01T22:01:16Z
GoA[E-CPG-FMCS13]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
