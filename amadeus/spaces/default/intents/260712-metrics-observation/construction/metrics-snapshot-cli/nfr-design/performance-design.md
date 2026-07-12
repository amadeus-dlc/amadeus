# Performance Design — metrics-observation

> NFR P-1〜P-3 の設計具体化。保証は層別に書く(nfr-design:c4 — 一枚岩の全称断定をしない)。

- **P-1(job timeout 5分)**: ci.yml の metrics-snapshot job に `timeout-minutes: 5` を宣言(U3)。保証機構 = GitHub Actions ランタイムの強制打ち切り。
- **P-2(PR クリティカルパス不変)**: 保証機構 = t222-ci-snapshot-wiring.test.ts の文字列アサート(ci-success.needs 非含有+if ガード存在+permissions)。**限界の明示**: 文字列検査は ci.yml の構造変更(job 改名・needs 書式変更)でメンテを要する(E-MO-NFR の e6 留保を設計注記として転記)— アサートは「行の存在」でなく「アンカー文字列の共起」で書き、偽陰性方向(検査が緩む)より偽陽性方向(構造変更で赤くなり人間が見る)へ倒す。
- **P-3(手動 10s)**: 統合テストの per-test timeout 10_000(t76 様式)。計測は CollectEnv 注入なしの実 collector で行う(実測であることが要件)。

## Review

**Verdict:** NOT-READY
**Reviewer:** architecture-reviewer (delegated)
**Date:** 2026-07-12T00:00:00Z
**Iteration:** 1

Scope: this Review section covers all 5 files under `construction/metrics-snapshot-cli/nfr-design/` (logical-components.md, performance-, security-, scalability-, reliability-design.md) — no single file is designated primary by the stage definition, so findings are consolidated here (same convention used for the upstream nfr-requirements review).

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | reliability-design.md:3 (R-1) vs `inception/refined-mockups/interaction-spec.md:3-9` and `functional-design/frontend-components.md:3` | R-1 introduces a brand-new, user-visible behavior — "temp 残骸は次回実行時に警告(削除はしない)" — that exists nowhere upstream. `functional-design/frontend-components.md:3` declares `interaction-spec.md` the canonical source for CLI output, and that file fixes the contract at exactly 3 verdict branches (`--write` OK/FAILED, `--check` CHECK OK/FAILED, no-args usage) with an explicit "1行様式" (single-line) constraint (`frontend-components.md:3`: "verdict 3分岐・exit code・1行様式"). Neither `business-logic-model.md`'s flow (steps 1-5, `--check` section) nor `interaction-spec.md` has a step for "check for a stale temp file on startup and print a warning." As written, a developer cannot implement this without guessing: (a) which verb(s) trigger the check — `--write` only, or `--check` too? (b) does the warning go to stdout or stderr? (c) does printing it violate the locked "1行様式" contract (a warning line + the verdict line is 2 lines)? (d) does its presence change the exit code? This is not a minor gap — it is a new mechanism that contradicts an artifact explicitly marked 正本 (canonical) by a sibling functional-design file, so implementing R-1 literally risks breaking the CLI contract that other tests/consumers rely on. | Before code-generation: either (a) drop the warning and let temp-residue be purely diagnostic (visible via `ls metrics/`, no code path needed — matches "診断材料保全" intent without a new output surface), or (b) if the warning is required, add it to `interaction-spec.md` as a 4th documented behavior with explicit trigger verb, stream (stdout/stderr), exact wording, and confirmation that it does not change exit code or violate the single-line-per-verdict rule — and propagate the same addition into `business-logic-model.md`'s flow steps. |
| 2 | Major | security-design.md:4 (S-2) vs `construction/ci-snapshot-job/functional-design/business-rules.md:6` (U3 rule #4) | S-2 adds a new obligation on the shared test artifact `tests/unit/t222-ci-snapshot-wiring.test.ts`: "metrics-snapshot job ブロック内に `secrets.` が出現しない" as a 4th assertion. But U3's `business-rules.md` rule #4 — which this project's own precedent (P-2/SC-1 propagation norm, `project.md` cid:infrastructure-design:review-fix-propagation) treats as the canonical, implementation-facing enumeration of what t222 must assert — only lists 3 assertions (a) `ci-success.needs` exclusion, (b) the `if: push && main` guard, (c) job-level `permissions: contents: write`. A developer building t222 strictly from U3's FD (the file whose own text calls itself "本ユニットの成果物" for this test) will ship a test missing the secrets-non-occurrence check that nfr-design now requires. | Add the secrets-absence assertion as item (d) to `ci-snapshot-job/functional-design/business-rules.md` rule #4's enumerated list, mirroring how P-2's (a)(b)(c) were already propagated there from nfr-requirements. |
| 3 | Minor | logical-components.md:4-9 | The NFR→component→mechanism table omits SC-2 and R-4 entirely, even though both have explicit, deliberate "no design treatment" decisions recorded (`scalability-design.md:4` "設計上の対処なし... B2 留保のまま"; `reliability-design.md:6` "kind を持たせない(過剰設計)"). Silent omission from the traceability table is indistinguishable, at a glance, from an overlooked NFR — the table is the artifact a reviewer/developer scans first for completeness. | Add explicit rows, e.g. `SC-2 → (component: n/a) → 対象外(B2 留保、設計上の対処なし)` and `R-4 → (component: n/a) → 対象外(kind 非導入、過剰設計と判断)`, so the table's coverage is self-evidently complete rather than apparently partial. |
| 4 | Minor | `nfr-requirements/performance-requirements.md:9-46` | The persisted `## Review` section on the upstream nfr-requirements artifact still reads `Verdict: NOT-READY`, `Iteration: 1`, with a Critical finding about P-2's "needs グラフ diff" claim — but the current requirement text (`performance-requirements.md:6`) and this nfr-design's P-2 (`performance-design.md:6`) already reference only the real, grounded mechanism (`t222-ci-snapshot-wiring.test.ts` string assertions), i.e. the finding was already addressed in the text. The audit log (`audit/j5ik2o-mac-studio-lan-8ae8f850c7a1.md:203`) records a later election approval ("NFR 完了確認 6/6 ... 2026-07-12") that superseded this, but the file's `## Review` block was never updated to iteration 2 / READY. This leaves the on-disk record self-contradictory for any future reader who trusts the file over the audit shard. | Update nfr-requirements/performance-requirements.md's `## Review` section to iteration 2, verdict READY, noting Finding 1 resolved via the real t222 mechanism now cited in the text — for gate-hygiene / traceability, not because it blocks this nfr-design review. |

### Validation Tool Results

No stage-declared validation tools were run (none listed in scope for nfr-design); findings are based on direct grep/read verification against the working tree and the sibling U2/U3 artifact tree.

### Independent Verification Evidence

- `tests/run-tests.ts:981` → `printSizeMatrix()` function exists — confirms logical-components.md:9's citation style is grounded (though logical-components.md itself doesn't cite it directly; performance-design.md's sibling artifacts do via t76/t152 precedent).
- `tests/unit/t152-windows-portability.test.ts:40-51` → confirmed `readFileSync(...).toContain(...)` string-assertion style, matching P-2's and U3 rule #4's cited precedent verbatim.
- `tests/unit/t76.test.ts:440,489,503,527,...` → confirmed per-test numeric timeout argument style (`30000`), matching P-3's cited t76 precedent (the concrete value differs, 10_000 vs 30000, but the mechanism/style match is what's cited).
- `find . -iname "t222*"` → no match — t222 does not exist yet, consistent with nfr-requirements/U3 stating it is "U3 で新設" (to be created in code-generation); not a defect.
- `.github/workflows/release.yml:101-102` → `git config user.name "github-actions[bot]"` / matching noreply email — confirms S-4's bot-author precedent citation is accurate.
- `.github/workflows/ci.yml:23-24,76-80,129-133,223-226` → top-level `permissions: contents: read`, no `metrics-snapshot` job yet — confirms S-1's "現状 read 不変" baseline and that the U3 job doesn't exist yet (expected, pre-code-generation).
- `.github/workflows/ci.yml:49-50,94-95` → `pip install lizard==1.23.0` (both jobs) — confirms tech-stack-decisions.md T-2's "1.23.0 pin" citation is accurate.
- `inception/application-design/decisions.md:3,10,17,24` → D1 (CLI placement), D2 (no re-execution), D3 (ci.yml integration), D4 (discriminated-union array-driven collector) all exist as cited — grounds scalability-design.md SC-3's D4 reference and tech-stack-decisions.md T-4's D1 reference.
- `construction/ci-snapshot-job/functional-design/business-rules.md:6` → U3 rule #4 lists exactly 3 t222 assertions (a)(b)(c), no secrets-absence assertion — grounds Finding 2.
- `inception/refined-mockups/interaction-spec.md:3-9` and `functional-design/frontend-components.md:3` → confirmed the 3-branch/1-line canonical CLI contract has no temp-residue-warning behavior — grounds Finding 1.
- `audit/j5ik2o-mac-studio-lan-8ae8f850c7a1.md:203` → confirms the e2/e6 reservation transcription language ("留保転記: e2=... 、e6=...") and the later 6/6 election approval — grounds Finding 4 and confirms criterion 3 (e6 reservation) is satisfied in performance-design.md:6's "限界の明示" paragraph.

### Summary

The NFR→design→mechanism mapping is mostly sound and well-grounded (P-1/P-3/S-1/S-3/S-4/SC-1/SC-3/R-2/R-3/R-4 all check out against real file:line evidence, and the e6 string-assertion-limits reservation from nfr-requirements is correctly transcribed into performance-design.md). The blocker is R-1's temp-residue warning: it is a new output surface introduced only at nfr-design time that was never reconciled with the canonical, already-locked CLI contract in `interaction-spec.md` — implementing it as currently specified risks silently breaking the single-line verdict contract. Fix Finding 1 (and propagate Finding 2's S-2 assertion into U3's FD) before this proceeds to code-generation.
