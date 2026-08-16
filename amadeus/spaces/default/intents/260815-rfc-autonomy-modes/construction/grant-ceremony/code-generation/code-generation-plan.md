# Code Generation Plan — unit grant-ceremony(C12 / ADR-7)

## 拘束
- ADR-7(Q15=B): preview → set-autonomy の 2 段維持。印字改善のみ(挙動不変)。相互必須不変量(preview なし発効拒否・digest 不一致拒否)の落ちる実証を追加
- FD R-2(貼り付け可能な完全形コマンド印字)/ R-3(相互必須不変量の適用範囲は full 限定 — :617 実測に基づく)/ R-4(未被覆は confirmedDisplayDigest 省略ケースのみ — 誤 digest は t435:348-354 既存 pin)/ R-5(挙動不変)

## TDD 順序(実施済み — swarm batch 1)
1. Red(R-2): t3120 新設 — preview stdout 2 行期待が 1 行で fail(逐語 Expected: 2 / Received: 1、exit 1)
2. Green: preview-autonomy へ貼り付け可能な `set-autonomy --mode full --confirmed-display-digest <digest>` 行を印字 + `bun run build`(テストは投影 .claude/tools を spawn)
3. R-4 pin: 省略 digest → CONFIRMATION_REQUIRED を t435 既存テストへ追加(実装変更なしで初回 green = 挙動不変の裏付け。不在 baseline: 追加前の grep で該当 pin 1 件のみ = 誤 digest ケース)

## 検証・配送
- swarm batch 1、referee check/finalize converged。配送は直列 PR(code-generation 段)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T11:06:31Z
- **Iteration:** 1
- **Scope decision:** none

grant-ceremony code-gen plan/summary/report trace cleanly to FD R-2..R-5/ADR-7/Q15 with real TDD evidence; only minor doc-sync and format gaps found, no functional/contract defects.

### Findings

- FOLLOW-UP | code-summary.md's 5-commit list (last: 455b089be) does not include or match pr-convergence-report.md's attested PR head SHA (6660925ff5e82561822d9e58d05e5c9234d88137) — summary appears to predate later convergence-round commits; the merged commit set that content-digest sha256:7797e6f5... actually covers is not fully enumerated in code-summary.md.
- FOLLOW-UP | code-summary.md:14 states the ripple fix touched "既存テスト4ファイル(t404/t414/t483/t435ほか)" while code-summary.md:22's verification table says "波及8ファイル" — 4 of the 8 rippled test files are left unnamed, so the full affected-file set can't be confirmed from the artifact alone.
- FOLLOW-UP | code-generation-plan.md omits the stage-mandated sequential "Step N:" numbering and explicit traceability table required for Standard depth (code-generation.md lines 120-127, "Standard: ... traceability table"); traceability is present only as inline FD-rule citations (R-2..R-5, ADR-7), which is substantively sufficient but format-noncompliant.
- NIT | code-summary.md's rationale for hardcoding "mode は full 固定" (based on prepareFullGrantCommand vs prepareNonFullCommand behavior) doesn't cross-reference business-logic-model.md's literal design text "mode は preview 呼出時に渡された/推定されたモード" or the ADR-2 grant-less-semi linkage that reconciles the two as equivalent — a one-line note would remove ambiguity for future readers that this is a faithful realization, not a silent narrowing.
