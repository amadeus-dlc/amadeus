# Code Generation Plan — election-skill(Bolt 5)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、reliability-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## スコープ(bolt-plan.md Bolt 5 の U6)

- SKILL.md 4節構造(business-rules.md BR-K3)+禁止語彙 canonical 集合の grep 検査(BR-K1 — security-design.md の語彙境界)+vacuity guard(BR-K2 — reliability-design.md の両側実測)+委譲文検査(BR-K4)。実行コードなし(performance-design.md の N/A 前提)
- 配置: contrib/skills/amadeus-election/(logical-components.md — requirements.md FR-8a の overlay 実測)。promote:self で2到達経路へ投影
- ノルム無参照 subagent 実演(ADR-6 (ii) — business-logic-model.md 実演層)は build-and-test で1回実施(非 CI)

## 申告

Bolt 4 との並び依存はファイル実 diff 非交差(c6)により先行着手(PR #1236 本文に記録 — unit-of-work.md の U6→U5 依存は SKILL 本文が指令 envelope のみ参照するため成立)
