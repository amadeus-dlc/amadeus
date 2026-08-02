# Performance Design — U2 span-attrs

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)。各面要件は requirements.md NFR-1〜2 から代替導出。business-logic-model.md(実在)の resolver 設計(cursor ファイル読取+stage memo)を消費。tech-stack 前提(Bun 短命プロセス)は codekb technology-stack.md 260801 現在節に依拠。

## resolver のコスト構造

- resolver 6キーの解決コスト: cursor ファイル読取(active-space / active-intent)2回+state ファイルの stage/phase 読取1回+env 読取(agent.type/id — 現行ハーネスでは常に不在で省略)。span 開始ごとでなく**プロセスあたり1回の memo**(短命プロセスモデル — FD 承認済み前提)
- memo 無効化条件を持たない(stage 遷移はプロセスを跨ぐ — amadeus-orchestrate の per-invocation process.exit モデルにより1プロセス1ステージが成立、FD 検証済み)

## バジェット

- resolver 1回: file read ≤3+env 読取。目標: span 生成経路の既存コスト(export の file I/O)に埋没する水準
- 検証は読取回数 counter の決定的 assert(bt-timeout-verification-shape)— n span 生成で resolver 読取が1回のままであることをテスト固定

## 非適用(nfr-design:c1)

キャッシュ層・pooling は非適用 — memo が唯一のキャッシュ。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:28:48Z
- **Iteration:** 1
- **Scope decision:** none

U2 span-attrs nfr-design 5成果物+questions: FD契約(6キー閉語彙・両キー省略fail-open・merge後勝ち・memo前提)準拠、NFR-1〜2被覆、引用実測一致。iteration 1 READY。

### Findings

- None
