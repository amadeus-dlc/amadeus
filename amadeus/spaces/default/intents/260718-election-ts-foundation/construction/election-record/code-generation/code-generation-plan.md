# Code Generation Plan — election-record(Bolt 3)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、reliability-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## スコープ(bolt-plan.md Bolt 3 の U3 全体)

- GoaLineCode(fail-closed `^E-[A-Z0-9]+$` — domain-entities.md の Q3=A 型)/ GoaFreq 再計算 / renderGoaLine 全8 bin 常時出力(business-logic-model.md)/ verifyReservations・verifySelf 3クラス全列挙(business-rules.md BR-R3/R4)/ renderPersistDraft 留保全件転記(BR-R6)
- 互換検証は実 parseGoaLine の in-process import round-trip(reliability-design.md — parseGoaLine スキーマ無変更 = requirements.md NFR-4)。実装制約: 全 render/verify は票列単一走査(performance-design.md の O(n) 上限)、GoaLineCode 構築は fail-closed の parse 境界(security-design.md)

## 実行形態

swarm worktree 隔離の builder fan-out(c2 規律 — 設計参照は worktree 内 .design-refs 相対パス)。テストは unit 層 t238(unit-of-work.md の層宣言)。検証は builder が exit code 個別報告
