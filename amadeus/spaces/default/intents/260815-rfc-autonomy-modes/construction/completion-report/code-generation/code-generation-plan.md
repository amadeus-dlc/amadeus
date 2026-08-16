# Code Generation Plan — unit completion-report(C9 / ADR-3)

## 拘束

- R-1(ADR-3): 完了境界(`completeWorkflowForTarget`、state確定後・completion JSON出力前)でauto-decision要約レポートを機械生成する。
- R-2(ADR-3・P2): 入力はAUTO_DECIDED監査行と`listProductionAutoDecisions`の出力のみ。LLMによる計数・散文の混入を禁止する。
- R-3(ADR-3): レポート生成はnon-blocking — 生成失敗(record dir不在・APIエラー・書込失敗)はcompletion JSONへ警告として記録するのみで、`complete-workflow`自体を失敗させない。
- R-5(Q2): `listProductionAutoDecisions`はページングを持つため、`nextCursor`がnullになるまで全ページ走査してから集計を確定する(1ページ目のみでの打ち切りを禁止)。
- R-8: AUTO_DECIDED監査行数と`listProductionAutoDecisions`件数が不一致の場合、不一致をレポートへ明記する(片方を無音優先しない)。
- 〔事後注記 2026-08-16: R-4 は TDD 順序 2 項の配線記述、R-6(basisKind 列挙・RecommendationOutcome 非依存)/ R-7(出力先 `<record>/completion/auto-decision-summary.md` 固定)は実装で充足 — 実測 traceability は code-summary.md 申し送り節。署名の pin 逸脱は E-260816-C9-SIGNATURE ユーザー裁定 B で追認済み〕

## TDD 順序(実施順)

1. `4d2fc1873`: `listProductionAutoDecisions`へのページングcursor貫通(R-5の前提となる純粋追加、既存呼出し元への影響なし)を先行実装。
2. `013e5740f`: `buildAutoDecisionSummary(pd, recordDir)`を実装し、AUTO_DECIDED監査行と`listProductionAutoDecisions`の最終ページまでの走査から集計。`completeWorkflowForTarget`のstate書込とcompletion JSON出力の間に配線(R-4)。record dir解決不能・list APIエラー・markdown書込失敗のすべての失敗経路を`auto_decision_summary_warning`へ解決(R-3)、外側try/catchをbackstopに。
3. `cd7c7cb1a`: unit test(`renderAutoDecisionSummaryMarkdown`の逐語転記、`formatSummaryBuildError`の全SummaryBuildError kind網羅)とintegration test(実`IntentAutonomyRepository`経由でAUTO_DECIDED監査トランザクションを実際にseedし、complete-workflowをend-to-endで駆動して集計値をpin。non-blockingの2falling proof: AUTO_DECIDED行0件、summaryパス書込失敗の両方でworkflow完了は継続)。

## 検証・配送

- swarm batch 2(completion-report / waiting-interruption)。
- referee: `32fa26c43 integrate bolt-completion-report (batch 2)` で `swarm-int-rfc0001` へ収束。base `54baec9ce`(batch1統合断面)。
- worktree: `.amadeus/worktrees/bolt-completion-report`、branch `bolt-completion-report`、HEAD `cd7c7cb1a`。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T12:01:04Z
- **Iteration:** 1
- **Scope decision:** none

buildAutoDecisionSummary signature in plan/summary (pd, recordDir) contradicts domain-entities.md's non-refinable (recordDir) signature, undisclosed; other gaps are FOLLOW-UP/NIT.

### Findings

- BLOCKER | code-generation-plan.md:14, code-summary.md:14 vs domain-entities.md:6-7 | Both code-gen artifacts describe the implemented function as `buildAutoDecisionSummary(pd, recordDir)` (2 params), contradicting the approved domain-entities.md signature `buildAutoDecisionSummary(recordDir: string): SummaryDoc` which is explicitly annotated "署名は refine しない" (do not refine); this discrepancy is not disclosed in code-summary.md's 逸脱/申し送り section (lines 39-42), which only discloses the missing-builder-notes gap.
- FOLLOW-UP | code-generation-plan.md:5-9 vs business-rules.md:3-10 | The plan's 拘束 section enumerates only R-1/R-2/R-3/R-5/R-8; R-4 is addressed only inline in the TDD-order narrative (line 14) and R-6/R-7 are never cited anywhere in the plan or code-summary.md, leaving those two business rules without explicit traceability evidence in the code-generation artifacts.
- FOLLOW-UP | code-generation-plan.md:13-15 vs code-generation.md:98-127 | The plan uses a bare numbered TDD-commit list instead of the stage-mandated checkbox format ("- [ ] ..." per Step 2) and 'Step 1/Step 2' sequential labeling, a format deviation from the stage contract.
- FOLLOW-UP | code-summary.md:20,28,41 | Self-disclosed evidence gaps: builder notes for this unit are missing (unlike all other 11 units per the note), so verbatim Red-phase output could not be transcribed, and `bun run build` was not executed/recorded at code-generation time despite this unit touching packages/framework/core/tools files subject to project.md's build-regen mandate; disclosed honestly but unresolved at this stage.
- NIT | unit-of-work.md:14 vs code-summary.md:15-17 | The ~120-line estimate for U8 undercounts the delivered non-test source (7+197+52=256 lines) by roughly 2x; informational only, no budget was declared to enforce against.

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T12:42:42Z
- **Iteration:** 2
- **Scope decision:** none

Signature BLOCKER resolved via disclosed E-260816-C9-SIGNATURE ruling grounded in a real cross-doc self-contradiction; R-4/R-6/R-7 traceability now measured; remainder is FOLLOW-UP/NIT.

### Findings

- FOLLOW-UP | code-generation-plan.md:12-16 vs .claude/amadeus-common/stages/construction/code-generation.md:98-127,150 | Plan still uses a bare numbered '1./2./3.' TDD-commit list instead of the stage-mandated checkbox format ('- [ ] ...') and 'Step 1/Step 2...' sequential labeling; carried forward unresolved from iteration 1, not touched by this remediation pass.
- FOLLOW-UP | code-summary.md:20,28,41 | Builder notes for this unit remain permanently absent and `bun run build` was not executed/recorded at code-generation time; both are historical gaps that cannot be retroactively created, remain honestly disclosed but unresolved — treated as FOLLOW-UP, not blocker, given the PR merged with full CI green.
- NIT | unit-of-work.md:14 vs code-summary.md 実装summary (7+197+52=256 行) | U8 estimate ('~120 行') is still unrevised against the delivered non-test source of ~256 lines; informational only, no enforced budget was declared.
