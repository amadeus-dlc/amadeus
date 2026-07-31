# Code Generation Plan — fix-1736-skill-new-intent(Bolt 1)

上流入力(consumes 全数): requirements.md(FR-1a〜1d、N-1〜N-3)。functional-design 系 6 成果物は self-fix スコープの SKIP により設計どおり不在(consumes_absent expected)。

## 対象

GitHub Issue #1736 — SKILL の「On CONFIRM」指示が存在しない `amadeus-utility.ts next --new-intent` を指す誤りを、正所有者 `amadeus-orchestrate.ts next --new-intent` へ是正する。

## 手順(requirements FR-1 の写像)

1. 患部13箇所(正本5・dist5・self-install3)の verbatim 実測(FR-1a の行番号照合)。
2. 正本5ファイルのツール名トークンのみ是正(ハーネス固有パス・他要素は不変)。
3. `bun scripts/package.ts`(7ハーネス)+ `bun run promote:self` で配布面同期(FR-1b、手編集禁止)。
4. regression テスト t366-skill-new-intent-verb.test.ts を integration 層へ新設(FR-1c: tracked `*skills/amadeus/SKILL.md` 全数への2述語 grep)。
5. 検証(typecheck / lint / dist:check / promote:self:check / t366 / t176 / FR-1b AC grep)→ deslop → 再検証。
6. コミット後に落ちる実証(1正本を旧文へ checkout → t366 赤 → 復元 green、stash 禁止)。
7. push → PR(1 Issue = 1 Bolt = 1 PR、Closes #1736)。

## 実行環境

git worktree 分離(solo-bolt-worktree-required): `bolt/fix-1736-skill-new-intent` @ origin/main(b58ac4b06)。builder = amadeus-developer-agent subagent。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T14:27:37Z
- **Iteration:** 1
- **Scope decision:** none

PR #1753 (merged) correctly routes SKILL On CONFIRM through amadeus-orchestrate.ts across all 13 tracked SKILL.md files, adds no compat shim, and t366 asserts a genuine, currently-green predicate; no deviations found.

### Findings

- None
