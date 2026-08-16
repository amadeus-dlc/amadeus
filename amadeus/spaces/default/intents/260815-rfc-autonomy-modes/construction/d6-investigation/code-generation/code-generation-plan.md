# Code Generation Plan — unit d6-investigation(FR-13 / RFC-0001 D6)

## 拘束
- ADR-11: 調査専用 — 修正・是正コードを書かない。発見欠陥は Issue draft として record に置き、起票はユーザー着手決定 + クロスレビュー 2 名成立が前提
- FD R-1〜R-3(business-rules.md): 実測のみ・一次記録は record・帰属切り分けは同一条件比較

## 手順(実施済み — swarm batch 1)
1. 現行コードの読解(orchestrate のゲート提示 / state の承認記録 / presence 検査 / 回復経路)
2. scratch fixture(repo 外、--project-dir override)での決定的再現
3. investigation-report.md へ 機序 / 一次証拠 / 再現手順 / 判定 / 帰属 / Issue draft を記録

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T11:01:05Z
- **Iteration:** 1
- **Scope decision:** none

d6-investigation code-gen artifacts stay within ADR-11 investigation-only scope, cross-reference cleanly (unit/PR/FR-13) across plan/summary/report; minor plan-formatting gaps only.

### Findings

- FOLLOW-UP | code-generation-plan.md:7-10 uses a plain numbered list ('1./2./3.') instead of the stage-mandated checkboxes for implementation steps, and omits the traceability line ('step -> story/intent') required even at Minimal depth by .claude/amadeus-common/stages/construction/code-generation.md §Step 2 — the FR-13 mapping is only implicit in the document title.
- FOLLOW-UP | code-generation-plan.md omits any step or explicit rationale addressing 'Test files are MANDATORY in the plan' (code-generation.md §Step 2). The omission is inferable from the ADR-11 investigation-only constraint stated in 拘束, but is not spelled out as a deliberate, reasoned exemption the way this project's norm elsewhere requires for absent-NFR test omissions (cid:build-and-test:c2-no-test-theatre-for-absent-nfr pattern) — worth making explicit rather than implicit.
- FOLLOW-UP | pr-convergence-report.md:3 records 'kind: converged' (pre-merge, generated 2026-08-15T22:50:54Z) while the attested context states the PR is already MERGED (squash acbf30bc2 on main). Team learnings cid:pr-convergence:c1-2 (2026-08-15) establish 'kind: landed', bound to the merge commit SHA, as the correct post-merge finalization record; this report was not refreshed after the merge landed, so the finalization artifact is one lifecycle step behind the real PR state.
- NIT | code-summary.md:9-10 cites specific counts and a file:line ('172-count series', 'corpus 32 cases / semi milestone 15 cases', ':805-806') that trace to R-2's numbers-from-command-output-only requirement (business-rules.md:5), but full verification requires reading investigation-report.md, which is explicitly out of this review's scope — listed in requestedReads rather than second-guessed here.
