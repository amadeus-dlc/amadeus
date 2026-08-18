# Code Generation Plan — Unit re-input-exclusion(Bolt 2、#2415)

上流入力: `unit-of-work.md`(U2 定義・規模枠)、`unit-of-work-story-map.md`(U2 実装順 6 slice)、`requirements.md`(FR-EXC-1〜6 / FR-MEAS-2)、application-design(`decisions.md` ADR-2/ADR-3、`component-methods.md` C7、`components.md` C5-U2面/C7)。

## 実装計画(dispatch 時に確定)

- **実行形態**: swarm Batch 2(cap 1)、builder subagent を bolt worktree `bolt-re-input-exclusion`(base = `bolt-issue-evidence-upstream` @ ceca3f2f4 — U2→U1 内容依存+共有ファイル直列化のためスタック)へ dispatch。#3190 着地後に origin/main へ rebase して PR 化
- **TDD 順序**: story-map の 6 slice(FR-EXC-5 → 1/2 → 3 → 4 → 6 → MEAS-2)。契約 markdown 変更も drift 検査テストを先に赤で置く Red 先行
- **所有ファイル**: 契約 `reverse-engineering.md` の U2 面(Step 2 除外クラス宣言)、`amadeus-lib.ts`(`RE_SCAN_EXCLUDED_PATHSPECS` 定数)、t2415 系テスト、対訳 docs、coverage registry
- **demo(即時適用)**: 本 intent の RE 区間(89053172e..23d4ae767)への除外適用と縮小率・帰属検査の初回実測を builder 報告に含める
- **禁止**: push・PR 作成・engine/state ツール、U1 面(consumes/Focus 導出)への接触

## 実行中の裁量確定(設計が実装時実測へ委譲した点 — 逸脱ではない)

- `component-methods.md` C7 の但し書き「逐語は実装時に git 実測で確定」に従い、5クラス一律 `:(exclude,glob)` 形へ統一(metrics の素形 `:(exclude)metrics/**` 混在案を不採用)。根拠: 空間スコープ4クラスの素形は 0 件無音マッチの実測、形式統一による可読性。fixture+実履歴の両方で動作を実測済み

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T03:41:47Z
- **Iteration:** 1
- **Scope decision:** none

CG record artifacts for U2 re-input-exclusion are internally consistent with unit-of-work.md's ownership boundary and requirements.md's FR-EXC-1..6/FR-MEAS-2, carry measured verification (exit codes, ablation-based failure attribution, 2-arm falling proof) and a disclosed non-deviation discretion point; no circular dependency, no undisclosed deviation, no verification theater found within scope.

### Findings

- FOLLOW-UP | code-summary.md's file-change table rows sum to 525 insertions (56+29+248+167+25) but its total row states 523 insertions / 2 deletions - a 2-line mismatch in a section explicitly labeled as a literal transcription of git diff --stat ceca3f2f4..HEAD. Recommend re-verifying the exact command output against team.md's numbers-from-command-output-only norm.
- FOLLOW-UP | FR-EXC-2/4/5/6 and FR-MEAS-2 carry explicit (FR-EXC-N AC) evidence tags in code-summary.md, but FR-EXC-1 (exclusion rule placed in Step 2 scan-target definition) and FR-EXC-3 (design-provenance citation disposition, only implicitly addressed via the ADR-3 no-new-citation mention) lack the same explicit tagging. Recommend adding an explicit FR-EXC-1..6 + FR-MEAS-2 AC coverage table for full traceability.
- FOLLOW-UP | The single implementation-time discretion point (uniform :(exclude,glob) form) cites component-methods.md C7, components.md C5-U2, and ADR-2/ADR-3 - none of these application-design artifacts are in this reviewer's authorized read scope, so the citation chain could not be independently verified this pass. Artifacts are internally self-consistent; flagging as an unverified facet, not a defect.
- NIT | code-generation-plan.md does not use the stage contract's literal sequential Step 1, Step 2, ... numbering (code-generation.md Step 2); it uses narrative headings instead. Acceptable as Minimal-depth compression but noting for format consistency.
