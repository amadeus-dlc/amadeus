# Reliability Design — U2: event-registry

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の要件（4集合一致の恒常性・移行期の振る舞い）に対する設計。

## 4集合一致の強制設計

- 4集合それぞれの正本から機械抽出する: (a) state machine 参照集合は `amadeus-state.ts` と hooks の静的抽出（grep 可能な定数参照に統一）、(b) canonical Registry 集合は `event-registry.ts` の durability = canonical、(c) AuditLogExporter 受理集合は Registry 参照から機械導出、(d) Journal reader 理解集合は codec 定義表から機械導出（business-logic-model.md § drift guard）
- 3 層の拒否構造: compile-time（`RegisteredEventName` union 型）・unit test（4集合相等＋基数 78 検証）・sensor（`amadeus-event-registry-drift` manifest を `.kimi-code/sensors/` に追加）（VER-1）
- 段階的有効化: (a)(b) は本 Unit で成立、(c) は U4・(d) は U3 の着地に伴い有効化し、4集合の完全な相等強制は U4 完了時から CI で拒否する。部分検証期間は「定義済み集合間の部分検証」と明文化し、未整備集合の欠損を成功扱いしない（reliability-requirements.md § 稼働タイミング）

## 拒否経路の設計

- 未登録名の canonical emit は compile-time または runtime（`getEventDef` 引当て失敗）で拒否し、required attributes を欠く emit も拒否する（BR-2/BR-4）。拒否は警告ではなく例外とする
- 互換 Adapter は旧 eventType を Registry 名へ引き当て、引き当て不能なら drift guard 違反として例外とする。曖昧な既定値へのフォールバックを持たない（BR-7）

## 責務境界

- canonical Event の書込失敗契約（同期例外＋fatal latch、FR-EVT-3/4）は U4／Journal 側の責務であり、本 Unit は分類と定義の正しさのみを担保する。Registry の拒否例外は emit 呼出し側の契約違反であり latch set 対象の書込失敗とは区別する
