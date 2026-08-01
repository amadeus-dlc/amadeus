# Performance Design — U3 exception

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)。性能ほか各面要件は requirements.md NFR-1〜3 から代替導出。business-logic-model.md(実在)の redactStacktrace 行単位走査設計を消費。tech-stack 前提(Bun/TypeScript)は codekb technology-stack.md 260801 現在節に依拠。

## 実行頻度と処理量

- redactStacktrace は **例外発生時のみ**実行される(recordException 経路限定)— ホットパスではない。通常運転のコストはゼロ
- 走査は stack 文字列の行単位1パス(O(行数))。典型 stack は数十行・数KB — 1回あたり sub-ms 水準
- 行ごとの正規表現はパス様トークン検出+scrubCredentials の既存パターンのみ。信頼境界外の不定長入力(err.stack は外部由来文字列を含みうる)を消費する新設 regex のため、**敵対入力(100KB 級の合成 stack)での線形性実測を完成条件に含める**(regex-linearity-untrusted-input — バックトラック爆発の否定を実測で固定)

## バジェットと検証

- recordException 1回あたりの追加コスト: redactStacktrace 1回+redactAttributes 1回。目標: 例外報告経路の総所要へ有意な寄与をしない(既存 addEvent+export のコストに埋没)
- 検証は counter/入力サイズスイープの決定的テストで行い、実時間待機を置かない(bt-timeout-verification-shape)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:15:23Z
- **Iteration:** 1
- **Scope decision:** none

U3 exception nfr-design 5成果物+questions: FD承認契約(string戻り・ADR-4範囲)準拠、NFR-1〜4被覆、引用実測一致、虚構機構なし。iteration 1 READY。

### Findings

- None
