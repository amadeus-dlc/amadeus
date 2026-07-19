# Code Summary — election-record(Bolt 3)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## 生成物(PR #1233、builder 実装)

| ファイル | 内容 | 検証 |
|---|---|---|
| `scripts/amadeus-election-record.ts` | GoaLineCode fail-closed(複節コード reject — domain-entities.md)、renderGoaLine 全8 bin+実 parseGoaLine round-trip(requirements.md NFR-4/FR-5a、business-logic-model.md の Q3=A 様式)、verifyReservations/verifySelf(3クラス全列挙 — business-rules.md BR-R3/R4)、renderPersistDraft(留保全件転記 BR-R6・決定性 BR-R5。単一走査 O(n) — performance-design.md、GoaLineCode fail-closed 境界 — security-design.md) | t238 unit 10テスト(round-trip 3+内部0 bin+複節 reject・転記欠落注入・3クラス注入・deep-equal・hold 分岐) |

## 横断整合(申告)

- TimelineEvent 形状不一致(U3 FD『tally/voter?』vs U2 実装『tallied/detail』)を builder が検出 → U1 canonical 型へ統合し U3 は tallied を描画(unit-of-work.md の依存 U3→U1 のみを維持 — PR #1233 に申告記録)。swarm check/finalize converged・untampered。検証実測は builder 報告+PR #1233(bolt-plan.md Bolt 3 行)
