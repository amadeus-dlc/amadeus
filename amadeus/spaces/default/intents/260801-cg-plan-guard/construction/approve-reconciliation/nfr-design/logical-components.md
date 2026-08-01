# Logical Components — approve-reconciliation(U3)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 論理コンポーネントは `business-logic-model.md` が実装する **C4a**(`swarmEvidenceVerdict` 純判定器、lib)/ **C4b**(`collectSwarmEvidence` 読み手、orchestrate)/ **C6 の消費**(bolt_dag_absence 判別子の読み)/ **approve 拒否メッセージ面**(C1 の dispatch 経由で C3 guardMessage を消費 — components.md :38「判定は C2、文言は C3」のとおり独立コンポーネントではない)で、AD の components.md(:26-27)を正本とする参照(複製しない)。なお **C7 = corpus sweep ハーネス(FR-6、テスト専用)**は本 unit の検収に含まれるがランタイム論理コンポーネントではない(§12a iteration 1 Critical の是正: C7 誤ラベルを canonical 表と照合して訂正)。

## 論理コンポーネント

| 論理面 | 実体 | 配置 |
|---|---|---|
| 判定(純) | C4a swarmEvidenceVerdict | amadeus-lib.ts |
| 収集(I/O) | C4b collectSwarmEvidence(readAllAuditShards+findAllEvents) | amadeus-orchestrate.ts |
| メッセージ | C3 guardMessage の approve 側消費(canonical 参照 — 再定義しない) | amadeus-lib.ts(定義)/ orchestrate(消費) |
| 検収ハーネス(テスト専用) | C7 corpus sweep(FR-6 — ランタイム外) | tests/ |

## 層別の検証責務

- C4a: in-process 単体(t401 予定 — 合成イベント集合で全アーム)。C4b: integration(実シャード形式 v1/v2 の fixture)。層別保証の一枚岩断定なし(nfr-design:c4)。
