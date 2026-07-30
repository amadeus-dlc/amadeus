# Code Generation Plan — fix-1742-sensor-scope

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 手順(FR-1742a〜b — 引き取り型)
既存 PR #1758(別セッション作成: run-stage directive 発行時の解決済み出力候補の原子保存+document/governance センサーの宣言出力完全一致発火+codekb 対象化)を再実装せず収束させる。収束確認(CI・スレッド)とマージ承認伺いのみ本 intent が実施。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T21:09:21Z
- **Iteration:** 1
- **Scope decision:** none

PR #1758 (takeover, not re-implemented) is merged, #1742 closed, all 17 CI checks pass, no unresolved CHANGES_REQUESTED review threads; amadeus-sensor-invocation.ts exists and is referenced from amadeus-sensor-fire.ts and amadeus-orchestrate.ts on origin/main, consistent with the code-summary's acceptance-criteria cross-check (t94/t95, recursion/pre-init guard, resume/--single non-reuse) delegated to the PR's own CI.

### Findings

- None
