# Performance Design — U5 metrics

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)。各面要件は requirements.md NFR-1〜4 から代替導出。business-logic-model.md(実在)の計測点配線(既存 emit 経路への add/record 挿入)を消費。tech-stack 前提(Bun 短命プロセス)は codekb technology-stack.md 260801 現在節に依拠。

## 計測コストの上界

- 計器5種は counter/histogram の add/record のみ — 1計測点あたり O(1) のメモリ内集計。既存 emit 経路(audit append / span end / subagent hook)への挿入は各1呼出しで、経路の既存コスト(file I/O)に対して無視できる
- export は local-metric-exporter の既存 flush 経路(プロセス終了時)に載せ、新たな定期 flush・タイマーを導入しない — 短命プロセスでは終了時1回が最小コストかつ十分

## attribute cardinality の統制(性能面)

- 計器 attribute は低 cardinality 語彙(stage slug / agent.type / event category 等の閉集合)のみ — intent 名・agent id を載せない(FD の cardinality 統制)。時系列集計のメモリは語彙積の定数で上界され、レコード数・intent 数に比例しない

## 検証

- 計測点挿入後の既存経路のテスト所要が退行しないことを既存スイートの green 維持で確認。計器呼出し回数は counter assert の決定的テストで固定(bt-timeout-verification-shape)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:23:39Z
- **Iteration:** 1
- **Scope decision:** none

U5 metrics nfr-design 5成果物+questions: FD契約(実シグネチャ・閉集合・cardinality統制)準拠、NFR-1〜4被覆、引用実測一致、虚構機構なし。iteration 1 READY。

### Findings

- None
