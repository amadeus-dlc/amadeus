# Domain Entities — docs-sync(U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- U4 は docs のみの unit であり**新規ドメイン型を導入しない**(`unit-of-work.md` の範囲宣言どおり)。本書は記述対象となる既存型(U1〜U3 で確定)の参照目録として機能する。

## 記述対象の型(参照のみ — 定義の正本は各 unit の domain-entities.md)

| 型 | 正本 | docs での扱い |
|---|---|---|
| BoltDagOutcome(dag/absent/invalid) | construction/dag-integrity/functional-design/domain-entities.md | runtime-graph 契約(01-architecture / 12-state-machine)の bolt_dag_absence 説明 |
| PlanIntegrityVerdict(ok/redirect/violation) | construction/issuance-guard/functional-design/domain-entities.md | invoke-swarm 発行前ガードの3値挙動 |
| GuardMessage(3部) | 同上 | エラーメッセージ様式の説明(観測事実/重み/出口) |
| SwarmEvidence / SwarmEvidenceVerdict | construction/approve-reconciliation/functional-design/domain-entities.md | approve 突合の説明 |

## 不変条件

docs は型定義を複製しない(canonical 1定義 — 概念名と挙動のみを記述し、シグネチャの逐語コピーを避けて陳腐化を防ぐ)。
