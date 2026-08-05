# Code Generation Plan — fix-2145-verification-doc

上流入力(consumes 全数): requirements.md（FR-4）, architecture.md, code-structure.md

- 対象 Issue: [#2145](https://github.com/amadeus-dlc/amadeus/issues/2145)（documentation へ再分類予定 — Q4b=A）
- 裁定: Q4=A（正本2行のみ + 受け入れ条件の書き直し。同根の sensor manifest 4件・knowledge 3件は別 Issue）
- Bolt branch: `bolt-fix-2145-verification-doc`（base `1043b7e67`）
- 実装形態: worktree 分離の並行 builder dispatch（E-OBB4-CGS13 の分離運用。FR-4 全文をプロンプトへ焼き込み）

## Steps

1. `packages/framework/core/knowledge/amadeus-shared/verification.md` の `:15` / `:25` にある実在しない
   `amadeus-docs/` 参照を、機械契約の実配置 `<record>/verification/phase-check-<phase>.md` へ是正する
   （受け入れ述語: 当該ファイルへの `git grep 'amadeus-docs/'` が 0 hit — FR-4a/FR-4d を逐語で写す）。
2. 文書のみの変更のため TDD 適用外（team.md 例外 (1)）。代替検証として、当該ファイルを読む既存テスト
   （`grep -rln 'verification.md' tests/'` で全数特定）を前後グリーンで実行する。
3. `bun run build` 後に追跡ファイル不変を確認（NFR-3）。
4. 受け入れ条件の書き直しコメント投稿とラベル変更（FR-4b）、同根の別 Issue 起票（FR-4c）は conductor 所有
   — builder のスコープ外として PR 発行時に実施する。

## 対象ファイル目録（設計確定後の導出）

- `packages/framework/core/knowledge/amadeus-shared/verification.md`（+2 / −2）— 唯一の編集対象

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T09:14:39Z
- **Iteration:** 1
- **Scope decision:** none

Plan copies FR-4a/FR-4d verbatim without narrowing; single-file scope respected; conductor-owned FR-4b/4c correctly left pending; two minor evidence-completeness gaps noted as FOLLOW-UP.

### Findings

- FOLLOW-UP | code-generation-plan.md Step 2 commits to running the consuming tests "before/after green", but code-summary.md records only a single post-fix exit-0/27-pass result with no pre-fix baseline run shown - record the before-fix run or narrow the plan wording so the evidence matches the promise.
- FOLLOW-UP | code-summary.md's claim that the [phase]-><phase> placeholder fix is a direct-dependent fragment of the same 2 lines was not itemized in code-generation-plan.md Step 1 (only the amadeus-docs/ reference fix was planned); it is declared and conductor-acknowledged post-hoc rather than pre-declared, and the claim that traceability.md references only this file core-wide has no shown grep/command output backing it - add the verbatim diff or a grep result to ground both claims explicitly.
