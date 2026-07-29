# Business Logic Model — U5: context-propagation

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（すべて参照済み）

## 処理シーケンス

### Intent Context の確立と永続化

1. intent 開始時（engine の birth／resume 経路）に anchor Context を生成
2. `persistIntentContext(intentId, ctx)` で record 配下へ永続化（FR-TRC-4）
3. 以後の短命 process は `restoreIntentContext(intentId)` で復元し、remote parent として接続。長命 root Span は process memory に保持しない

### 子 process への伝播（W3C Trace Context）

1. 親 process が subprocess 起動前に `injectToSubprocess(env)` で `traceparent`／`tracestate` を env へ注入（FR-TRC-5）
2. 子 process は起動時に env から Context を抽出し、自身の root span の parent とする
3. 対象: hook（session-start/session-end 等）、subagent（Bolt・RE）、sensor、CLI 子 process。すべて同じ Trace に接続される

### hook／subagent の接続

1. hook process は harness が起動する独立 process のため、環境変数経由で Context を受け取る（services.md の通信契約どおり）
2. subagent（worktree Bolt）は conductor が prepare 時に Context を注入し、子の emit が同じ Trace に連なる

## 検証フロー

1. 親 process → 子 process → 孫 process の3段で trace ID が一致し、parent span ID が正しく連鎖することをテストで固定
2. Intent Context を別 process で復元できること（#1678 必須検証の拡張として U1 の検証を本番経路に適用）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:19:15Z
- **Iteration:** 1
- **Scope decision:** none

READY: U5's FR-TRC-4/FR-TRC-5 fully covered by coherent flows/rules/entities using only the declared context.ts API surface; no dependency-direction or redaction contradictions.

### Findings

- None
