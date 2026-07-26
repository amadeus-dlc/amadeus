<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-26T05:22:49Z — 差分リフレッシュの base は cid:reverse-engineering:rescan-base-ancestry に従い、re-scans/ 全 record の observed のうち HEAD(e12259ba7)の祖先で距離最小の 11f1ad61f(260725-worktree-ref-fixes の observed、dist=4)を採用。非祖先の observed 2件(70336937 / 4a0f91ad)は除外を実測(git merge-base --is-ancestor)。
- 2026-07-26T05:22:49Z — 区間4コミットに PR #1483(standing grants solo 化 = Issue #1497 の患部導入)と PR #1493 を含むため、RE の focus は grant 機構+スコープ解決経路に置く(cid:reverse-engineering:c2 の bugfix 面適用)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-26T05:37:26Z — RE 実測で Issue 未報告の欠陥 B(walking-skeleton 除外の無音不発 = project.md Forbidden 直撃)を発見。両症状の根本原因は単一(standingGrantSatisfiesGate の stage.scopes 直読)であることを実測確定。要件段で両症状をスコープに含めるかの裁定が必要。
- 2026-07-26T05:37:26Z — codekb 出力は宣言センサー3種の filter に構造不適合(cid:re-sensors-codekb-filter-mismatch)。成功扱いせず、H2 機械確認(全10ファイル ≥ 9)+上流入力の実参照検証で代替(cid:reverse-engineering:c3-codekb-sensor 準拠)。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-26T05:37:26Z — evaluateStandingGrantGateEligibility の isPerUnitStage: false ハードコード(amadeus-lib.ts:4012-4013)は per-unit 中間ゲートを grant が覆いうる別軸。本 intent のスコープ内かは requirements で裁定する。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
