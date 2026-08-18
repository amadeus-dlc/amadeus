# Code Generation Plan — Unit issue-evidence-upstream(Bolt 1、#3181)

上流入力: `unit-of-work.md`(U1 定義・規模枠)、`unit-of-work-story-map.md`(Unit 内実装順 7 slice)、`requirements.md`(FR-EVD-1〜8 / FR-MEAS / NFR)、application-design(`decisions.md` ADR-1、`component-methods.md` の seam、`components.md` C1/C2/C3/C4/C5-U1面/C6)。

## 実装計画(dispatch 時に確定)

- **実行形態**: swarm Batch 1(cap 1)、builder subagent を bolt worktree `bolt-issue-evidence-upstream`(base = origin/main `23d4ae767`)へ dispatch。conductor は worktree 準備・permit 管理・裁定・取込を所有
- **TDD 順序**: story-map の 7 slice(FR-EVD-2/6 → 1 → 5 → 3/4 → 7 → 8 → MEAS)を vertical slice で1件ずつ Red→Green
- **所有ファイル**: C1 = `amadeus-github-gateway.ts` / C2 = `amadeus-utility.ts` / C3 = `amadeus-lib.ts` / 契約 C4 `requirements-analysis.md`・C6 `intent-capture.md`・C5 `reverse-engineering.md` の U1 面のみ / tests(t3181 系)+ 台帳(coverage-registry ほか)
- **検証**: typecheck / lint / targeted テスト / build+dist 不変 / registry --check / graph export --check(フルスイート・coverage はリモート CI 正 — push-first)
- **禁止**: push・PR 作成・engine/state ツール(conductor 専任)、U2 面(Step 2 走査対象・除外規定)への接触

## 実行中の裁定(full autonomy 梯子、decision id 付き)

1. RE 契約への consumes 追加が codekb 9成果物へ引用義務を波及 → **frontmatter 撤去・本文消費のみ**(`auto-decision-81cb5ecf4cd5208495abcb51e7d399a5`、是正 commit `b44fadce3`)
2. commentsArgv の --include 非対応(--paginate と非両立の実測)による失敗分類の粗さ → **受容**(`auto-decision-1caf8124c00e9d3c9ccc7359ed388964`)
3. labels は pinned seam 外 → **「未取得」明示描画を受容**(`auto-decision-7808b4dd38352af44ef275ffe45b488b`)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T01:42:32Z
- **Iteration:** 1
- **Scope decision:** none

pr-convergence-report.md is correctly bound to PR #3190/bolt 1/unit issue-evidence-upstream with matching local/remote/pr heads; the RE-consumes ruling is consistent with FR-EVD-4's body-grep AC; LOC overrun is declared with attribution; no undeclared deviations or verification-theater found - remaining gaps are documentation-traceability items, not implementation defects.

### Findings

- FOLLOW-UP | code-summary.md lacks an explicit FR-EVD-1..8 + FR-MEAS to AC traceability table; in particular FR-EVD-2's AC (producer-registered artifact in amadeus-graph.ts, /amadeus --doctor green) has no direct evidencing line - the changed-files table never touches amadeus-graph.ts, only intent-capture.md's new optional_produces frontmatter field, and it is not stated whether graph compile reads that field as the producer registration mechanism. bun dist/.../amadeus-graph.ts export --check (exit 0, listed in the verification table) plausibly covers this constraint but the report never connects the two.
- FOLLOW-UP | code-generation-plan.md does not follow the stage contract's Step 2 required plan shape (sequentially numbered Step 1/Step 2/... items, an explicit test-file plan step, a story/intent-to-step traceability list). The compressed format may be depth-justified (depth setting is outside my read scope) but the plan itself carries no note explaining the compression, unlike the plan's other 3 ladder rulings which are all decision-id tagged.
- FOLLOW-UP | Non-contact with U2 (reverse-engineering.md Step 2 scan-scope/exclusion face) is only inferable from the changed-files line-count entry (+13/-2 on reverse-engineering.md, labeled 'U1 face'); code-summary.md includes no direct confirmation (e.g. diff grep against U2-owned lines) that the U1/U2 file-sharing boundary held.
