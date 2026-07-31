# Code Generation Plan — fix-1749-phase-check-name

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 手順(FR-1749a〜c)
正本 stage-protocol-governance.md:22 の誤記を正準名 `phase-check-<phase>.md` へ是正(a)、docs 日英2面同期(b)、t368 drift テスト新設(c — 誤記語彙の tracked 残存 0(記録面除外)+正準名の指示存在)。worktree 分離、dist 7+self-install 再生成、落ちる実証、PR(Closes #1749)。round 2 で CodeRabbit Minor 2件(参照シンボル名・完全テンプレート検証)を是正。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T21:09:21Z
- **Iteration:** 1
- **Scope decision:** none

PR #1776マージ・#1749クローズ済み。stage-protocol-governance.md:22の正準化・docs日英同期・t368(2 test)の実測がsummary主張と一致、残存3件も記録面の除外スコープどおり。

### Findings

- None
