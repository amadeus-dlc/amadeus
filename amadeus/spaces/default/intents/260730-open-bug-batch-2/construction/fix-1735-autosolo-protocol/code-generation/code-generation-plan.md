# Code Generation Plan — fix-1735-autosolo-protocol

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 手順(FR-1735a〜c)
stage-protocol §13 への auto-solo フック焼き込み(a)、Halt-and-ask 節+conductor persona への類型別フック(b — persona 側は逸脱停止記述が不在と実測し、intra-stage control flow へ Design deviations 項目を新設。申告済み逸脱として受理)、t369 drift テスト+codex live e2e(c — 出荷ツリー直実行で実現可能性を実測のうえ実装)。round 2 で Bugbot Medium 3件(--file 必須・halt-and-ask 矛盾・e2e 前提)、round 3 で CodeRabbit Major 2件(仕様変更例外の適用順序 → 排他3分岐化・第3分岐の欠落)を是正。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T21:09:21Z
- **Iteration:** 1
- **Scope decision:** none

PR #1782 merged/#1735 closed; stage-protocol.md 5 hits + conductor.md 3 hits for 'auto-solo' verified on origin/main matching code-summary's landing grep; FR-1735a/b insertion points (stage-protocol §13/§1, new conductor.md 'Design deviations' bullet) confirmed present; the persona-insertion deviation was disclosed and matches requirements.md's iteration-2 closure of the two Major findings.

### Findings

- code-summary states live codex e2e verification ('t-exec-codex-autosolo-s13') was only exercised up to seed construction and not run against a real codex binary in this Bolt ('次回 codex セッションで観測'). Thi
