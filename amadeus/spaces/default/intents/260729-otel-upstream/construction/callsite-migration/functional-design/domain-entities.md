# Domain Entities — U7: callsite-migration

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## MigrationAdapter（`migration-adapter.ts`）

旧 `appendAuditEntry()` 互換シグネチャを持つ移行期限定コンポーネント（FR-MIG-1）。

| 属性 | 説明 |
|---|---|
| eventType | 旧呼出しの event 種別文字列。registry 引き当ての入力 |
| fields | 旧呼出しの属性 map。registry の required attributes へ整形される |
| registryRef | 引き当て先の `event-registry.ts`（`getEventDef()`） |
| emitRef | 委譲先の `emitEvent()`（`logger-provider.ts`） |

ライフサイクル: 導入（U7 開始）→ 全 call site 変換中に稼働 → 直接 call site ゼロ＋削除ゲート達成で U8 が旧 writer とともに削除。恒久 dual-write 化は禁止（BR-1）。

## EventTypeMapping

legacy eventType → RegisteredEventName の引き当て写像（BR-2/BR-3）。

| 属性 | 説明 |
|---|---|
| legacyEventType | 旧 `appendAuditEntry()` が受け取る文字列 |
| registeredName | registry 登録名（`RegisteredEventName` union の要素） |
| requiredAttributes | 引き当て先 EventDef の required attributes（`getEventDef()` 由来） |

未定義の legacyEventType は写像失敗＝ drift guard 例外（VER-1）。写像は registry の4集合一致検証（`assertRegistryConsistent()`）の対象。

## GuardAllowlist（VER-4）

| 属性 | 説明 |
|---|---|
| sites | 許容される残存直接 call site の一覧（file:line 等の同定子） |
| direction | shrink-only（ratchet）。追加差分は CI 拒否（BR-8） |

ライフサイクル: 移行開始時に全既存 site で初期化 → batch 変換ごとに縮小 → ゼロ到達で削除ゲート FR-MIG-4(c) の条件を満たす。

## MigrationBatch（FR-MIG-2）

| 属性 | 説明 |
|---|---|
| batchId | batch の識別子 |
| targetSites | 当該 batch で変換する call site 集合 |
| backupRef | 変換前 backup の参照（rollback 用、BR-5） |
| status | pending / converted / reverted |

rollback は batch 単位の git revert＋backupRef 復元で行う。

## ShadowComparisonReport（VER-5 連携）

| 属性 | 説明 |
|---|---|
| eventCount | 新旧経路の event 数比較 |
| linkage | trace/span linkage の比較 |
| status | event status の比較 |
| allowedAttributes | 許可属性の比較 |
| unexplainedDiffs | 未説明差分の一覧。空でない限り FR-MIG-4(d) 未充足（BR-10） |

機械可読形式で生成し、削除ゲート判定（U8 所有）の入力とする。本 Unit は report 生成までを責務とする。

## 関係

- MigrationAdapter 1 — N EventTypeMapping（eventType 引き当て）
- GuardAllowlist は MigrationBatch の完了で縮小する（1 — N、単調減少）
- ShadowComparisonReport は移行期間中に継続生成され、U8 の削除ゲートへ接続する
