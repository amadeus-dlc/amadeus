# Performance Design — U3 u3-runner-gen-plugin

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

PR-U3-1(performance-requirements.md — spawn 1追加のみ)の実現: runner-gen write は spawnRecompile の for ループ直後に同型 spawn で1回だけ呼ぶ(business-logic-model.md 配線層)。増分生成・差分検出等の最適化を導入しない(tech-stack-decisions.md TS-U3-1、scalability-requirements.md SC-U3-1 の N/A と整合)。

## 境界確認

- write の全再生成は冪等(reliability-requirements.md RL-U3-2)であり性能最適化のための条件分岐を足さない
- 生成入力は compiled graph のみ(security-requirements.md SR-U3-1)で走査面の拡大なし

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T23:12:10Z
- **Iteration:** 1
- **Scope decision:** none

NR ID との整合・failure stage 値の逐語一致・過剰機構/無申告逸脱の不在を確認し READY。Minor 1件(logical-components の SR-U3-2 対応欠落)は受領後に是正済み(runner-gen 行へ追記)。

### Findings

- [Minor] logical-components.md の NFR 対応表に SR-U3-2 が不在 → runner-gen write/prune 行へ追記済み
