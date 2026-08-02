# Scalability Design — U4 subagent-started

上流入力(consumes 全数): scalability-requirements ほか performance-requirements / security-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— スケーラビリティ面は requirements.md NFR-2(中立境界)から代替導出。business-logic-model.md(実在)の並列 fan-out 突合規則(同一 Type 複数並行)を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## スケール特性

- SUBAGENT_STARTED は per-record 追記(既存 audit v2 行構造)— 容量は subagent 起動数に線形、行あたり定数(Agent Type / Agent ID / Purpose 200字上限)
- 並列 fan-out(同一 Type の subagent 複数同時)は本セッション運用で常態 — 突合規則が ID 有無混在・同時刻 tie-break まで決定的に定義済み(FD)のため、並列度の増加が突合の曖昧化を生まない(スケールと正しさの両立点)
- 共有状態ゼロ(hook emit は既存 append 経路、突合は読取専用後処理)— ロック不要

## 配布面

- hook は全ハーネス共通の amadeus-log-subagent.ts 契約(FD 実測)— core 1定義から7ハーネスへ機械投影(NFR-2)、ハーネス別分岐なし

## 非適用(nfr-design:c1)

sharding・水平スケーリングは非適用 — ローカル JSONL 構造。
