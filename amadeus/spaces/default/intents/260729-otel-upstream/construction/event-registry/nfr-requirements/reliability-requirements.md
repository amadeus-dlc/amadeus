# Reliability Requirements — U2: event-registry

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 4集合一致の恒常性

- 4集合（state machine 参照集合＝canonical Registry＝AuditLogExporter 受理集合＝Journal reader 理解集合）は常に一致する（BR-1、VER-1）
- 乖離の拒否対象: registry 未登録の canonical・telemetry 誤分類・required attributes 不足・writer-only／reader-only event・schema migration なしの version 変更
- 稼働タイミング: (a)(b) は本 Unit で成立、(c) は U4・(d) は U3 の着地に伴い段階的有効化し、4集合の完全な相等強制は U4 完了時から CI で拒否する（部分検証期間を明示）
- 未登録名の canonical emit は compile-time または runtime で拒否される（BR-2）。required attributes を欠く emit も拒否（BR-4）

## 移行期の振る舞い

- 互換 Adapter は旧 eventType を Registry 名へ引き当て、引き当て不能なら drift guard 違反として例外とする（BR-7）。曖昧な既定値へのフォールバックは持たない
- canonical Event の書込失敗契約（同期例外＋fatal latch、FR-EVT-3/4）は U4／Journal 側の責務であり、本 Unit は分類と定義の正しさのみを担保する

## 検証

- 4集合相等（基数 78 件の検証を含む）を unit test で固定し、sensor manifest（`amadeus-event-registry-drift`）で CI 配線する（VER-1）
