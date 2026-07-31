# Business Rules — U2: event-registry

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（参照済み）

## 不変条件

- BR-1: 4集合（state machine 参照集合＝canonical Registry＝AuditLogExporter 受理集合＝Journal reader 理解集合）は常に一致する（VER-1）
- BR-2: canonical Event は必ず Registry に登録される。未登録名の canonical emit は compile-time または runtime で拒否される
- BR-3: `recordException()` が作る exception Span Event は telemetry 扱いとし、AuditLogExporter へ混入させない。canonical failure は別途 `amadeus.operation.failed` EventRecord を emit する（FR-EVT-7）
- BR-4: required attributes を欠く emit は拒否される
- BR-5: schema version の変更は必ず migration（reader 側の対応）を伴う。migration なしの version 変更は drift guard が拒否する

## 条件付き振る舞い

- BR-6: 新規 event の追加は Registry・reader・state machine 参照・テストを同一変更で行う（writer-only／reader-only event を構造的に防ぐ）
- BR-7: 移行期間の互換 Adapter は旧 eventType を Registry 名へ引き当て、引き当て不能なら drift guard 違反として例外とする
