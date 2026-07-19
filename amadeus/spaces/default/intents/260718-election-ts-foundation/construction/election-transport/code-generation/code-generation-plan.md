# Code Generation Plan — election-transport(Bolt 3)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、reliability-design.md、security-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## スコープ(bolt-plan.md Bolt 3 の U4 全体)

- VoterTransport port(DeliveryOutcome 判別ユニオン — business-logic-model.md iter3 確定形)/ AgmsgTransport(spawnSync 配列引数=シェル非経由・env 明示 — security-design.md、business-rules.md BR-T3)/ SubagentTransport(directive のみ — Q1=B)/ DeliveryRecord 内部 factory 専有(BR-T2、domain-entities.md)
- ShortNotification の構造的 blind(BR-T1 — requirements.md FR-2a)。落ちる実証は BR-T1/T2 へ赤実測→revert(reliability-design.md)。逐次配信・最適化非導入(performance-design.md)

## 実行形態

swarm worktree 隔離の builder fan-out(c2 規律)。テストは unit t239+integration t240(fake send.sh 実 spawn — unit-of-work.md の層宣言)
