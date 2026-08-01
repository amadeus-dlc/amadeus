# Logical Components — dag-integrity(U1)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 論理コンポーネントは `business-logic-model.md` が実装する **C5**(`computeBoltDagOutcome` — BoltDagOutcome resolver、runtime)/ **C6**(`bolt_dag_absence` — runtime-graph フィールド、生産者 C5・消費者 C1 と degrade 系文言)の2点で、AD の components.md(:28-29)を正本とする参照(複製しない)。(§12a iteration 1 Major の是正: C4/C5 の off-by-one を canonical 表と照合して C5/C6 へ訂正)

## 論理コンポーネント

| 論理面 | 実体 | 配置 |
|---|---|---|
| 判定(純) | BoltDagOutcome 導出 | amadeus-runtime.ts(computeBoltDag 後継) |
| 投影(I/O) | compile の3分岐(append / absence 付き append / throw) | amadeus-runtime.ts compile |
| 是正データ | 260712 record の edge block(FR-5) | record(コード外) |

構造的保証はモジュール別に層別(nfr-design:c4 — 一枚岩の断定を避ける): 純判定は入力に対して全域定義(union 全アーム)、I/O 層は exit code 契約、record 是正はセンサー+parse の機械検収。

## 層別の検証責務

- 純判定層: union 全アームの単体テスト(t399 予定)。I/O 層: exit code 契約の integration テスト。record 是正: parseBoltDag ok+センサー pass の機械検収(AC-5a/5b)。
