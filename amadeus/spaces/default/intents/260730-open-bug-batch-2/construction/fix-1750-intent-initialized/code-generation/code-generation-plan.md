# Code Generation Plan — fix-1750-intent-initialized

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 手順(FR-1750a〜d、裁定 A)
mirror boundary 第5種 `intent-initialized` の追加(lifecycle 受理+orchestrate 発行 — 挿入点は実装時実測で確定し申告)、receipt の別軸永続化(スキーマ実測)、契約変更申告付きの t265系/t282/t361 改訂、t371 新設(SKIP スコープでの birth 直後 emit / off 非発火 / 冪等)。PR #1758/#1774 着地後に直列着手(orchestrate 交差)。round 2 で pending 初回 receipt の再試行意味論(Bugbot Medium+CodeRabbit Minor)を是正 — pending は prompt でも再発行対象、off は契約どおり全抑止(過剰是正回避を実測で判断)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T21:09:21Z
- **Iteration:** 1
- **Scope decision:** none

PR #1791 merged/#1750 closed, all CI checks (typecheck, lint, dist:check, promote:self:check, Tests, Coverage) pass; amadeus-mirror-lifecycle.ts on origin/main contains the new 'intent-initialized' boundary kind exactly as claimed (2 hits at :646-647); PR body corroborates the separate-receipt-axis design (FR-1750b), the disclosed contract change (FR-1750c), and a falling-proof regression demonstration (7 failing tests on pre-fix checkout, 20/20 green after restore), all consistent with the code-summary.

### Findings

- The code-summary's CI flake note ('digestMatrix 分散... attempt 2 全 green') differs from the flake documented in the PR body itself (an unrelated t-team-up-codex-resume wall-clock flake, explicitly anal
