<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T11:49:39Z — U2 builder 申告4件を一次証拠から一意の執行として受理: plugin.json 最小形(build fail-closed の実測 MALFORMED が根拠 — U3 が拡張)/ override の emit 先行順序(fail-closed 側への一意な倒し方 — テスト固定済み)/ severity 写像の実測限定(BR-U2-10 準拠)/ 型 import 粒度(辺集合6本不変)
- 2026-08-05T11:49:39Z — U3 builder の docs/t93 追加(ブリーフ指定外)は Mandated(EN/JA 対訳同期・センサー台帳 sentinel)の規範適用として受理

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T11:49:39Z — swarm referee(check/finalize)を使わず conductor 検証+cherry-pick 取込で代替(E-PCP-CGBLK 裁定 choice 1、2-0): Claude Code worktree 隔離セッション下では swarm prepare の .amadeus/worktrees へ builder subagent も conductor も git 操作が構造的に拒否されるため。代替の検証水準 = fidelity diff 空の機械確認+conductor での検証コマンド再実行(typecheck/lint/対象スイート/build)+builder 側 test:ci 全体 PASS(U2: 843 files / U3: 847 files ×2)。ゲートで開示
- 2026-08-05T11:49:39Z — FR-4b は E-PCP-ADDEV(2-0)で契約準拠形へ申告改訂済み(AD 段)。CG では改訂後契約どおり実装(gh runner 4契約 assertion 固定)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-05T11:49:39Z — walking-skeleton(U1)の単独ゲートは autonomy full の grant(walking-skeleton interaction kind を含む)により engine が batch 1 へ統合発出 — bolt-plan の Batch 1/2 分割より engine directive を優先し、skeleton の確信仮説(FR-2a 成立)は U1 の TDD 最初の Red で確認する形に倒した(結果: 成立 — t445 の compose E2E green)

- 2026-08-05T11:59:53Z — 【追記】approve 時の plan-drift ガード(swarmEvidenceVerdict — 並行宣言 batch は SWARM_COMPLETED 必須)が E-PCP-CGBLK 経路(referee 不使用)と非両立と判明。SWARM_COMPLETED の正規 emit は finalize のみで、bolt worktree への実装反映手段(amadeus-worktree merge)も main checkout のブランチ占有により不能を実測。ガードの Approved exit (a) に従い、既決裁定から一意に導かれる執行として bolt_dag を直列宣言へ是正(理由付き — unit-of-work-dependency.md の是正注記)+ recompile → approve 通過。論理 topology(U1∦U2)の記録は保持

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
