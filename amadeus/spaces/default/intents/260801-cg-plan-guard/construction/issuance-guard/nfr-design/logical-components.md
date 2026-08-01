# Logical Components — issuance-guard(U2)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 論理コンポーネントは `business-logic-model.md` が実装する **C1**(`emitSwarmOrPerUnit` 単一 seam、orchestrate)/ **C2**(`planIntegrityVerdict` 純判定器、lib)/ **C3**(`guardMessage` canonical ビルダー、lib)の3点で、AD の components.md を正本とする参照(複製しない)。

## 論理コンポーネント

| 論理面 | 実体 | 配置 |
|---|---|---|
| 分岐点(I/O) | C1 emitSwarmOrPerUnit(呼び出し元2箇所の統合 seam) | amadeus-orchestrate.ts |
| 判定(純) | C2 planIntegrityVerdict(3値) | amadeus-lib.ts |
| メッセージ(純) | C3 guardMessage(3部 canonical) | amadeus-lib.ts |

## 層別の検証責務

- C2/C3: in-process 単体テスト(t400 予定 — 合成入力で全アーム)。C1: integration(directive 発行面)。層別保証は一枚岩の断定を避ける(nfr-design:c4)。
