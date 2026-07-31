# Business Logic Model — U2: event-registry

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（すべて参照済み）

## 処理シーケンス

### Registry の定義と型生成

1. 既存78 event 語彙（#1672 由来）を棚卸しし、各 event の EventDef（name・durability・requiredAttributes・schemaVersion）を定義
2. `RegisteredEventName` の文字列リテラル union 型を生成し、compile-time に未登録名を排除
3. canonical／telemetry の分類を EventDef に付与（`recordException()` の exception Span Event は telemetry、FR-EVT-7）

### 実行時検証

1. `emitEvent` 呼出し時、Logger Provider が `getEventDef(name)` で定義を引き当て、required attributes を検証（U1 の BR-9 を本番化）
2. durability = canonical の event のみ AuditLogExporter へ dispatch。telemetry は各 Local Exporter へ

### drift guard（4集合一致、VER-1）

1. 4集合をそれぞれの正本から機械抽出する:
   - (a) state machine 参照集合: `packages/framework/core/tools/amadeus-state.ts` と hooks の状態遷移コードが参照する event 名を静的抽出（grep 可能な定数参照に統一）
   - (b) canonical Registry 集合: `event-registry.ts` の EventDef で durability = canonical のもの
   - (c) AuditLogExporter 受理集合: `audit-log-exporter.ts` が dispatch を受理する Registry 名集合（Registry 参照で導出、(b) と同一ソースから機械導出）
   - (d) Journal reader 理解集合: `amadeus-journal.ts` の v1/v2 reader がデコード可能な event 名集合（codec の定義表から機械導出）
2. compile-time（型）・unit test（4集合の相等 — vacuous 回避のため78件の基数検証を含む）・sensor（`amadeus-event-registry-drift` manifest として `.kimi-code/sensors/` に追加）の3層で乖離を拒否
3. 拒否対象: registry 未登録の canonical・telemetry 誤分類・required attributes 不足・writer-only／reader-only event・schema migration なしの version 変更
4. 稼働タイミング: (a)(b) は本 Unit で成立。(c) は U4（Exporter 実装）、(d) は U3（reader codec）の着地に伴い段階的に有効化し、4集合の完全な相等強制は U4 完了時から CI で拒否する（それ以前は定義済み集合間の部分検証に留める）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:24:29Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: VER-1 four-set extraction not implementably specified (no named source/owner for sets a/c/d, unidentified sensor manifest, vacuous-equality risk); minor: cross-unit timing vs U3/U4, dangling BR-9 reference, EventCategory/EventDef table inconsistency.

### Findings

- MAJOR business-logic-model.md: VER-1 four-set extraction lacks named sources/owners for (a) state machine references, (c) AuditLogExporter accepted set, (d) Journal reader understood set; sensor manifest unidentified; vacuous-equality risk — name the extraction source for each set and the sensor manifest id
- MINOR business-logic-model.md: drift guard needs reader/exporter sets that land in U3/U4 — state the cross-unit timing (guard activates incrementally as U3/U4 land; full four-set equality enforced from U4 completion)
- MINOR business-logic-model.md: dangling 'BR-9 の本番化' reference — BR-9 lives in U1's rules; cite it as U1 BR-9 explicitly
- MINOR domain-entities.md: EventCategory described as EventDef 補助属性 but absent from the EventDef table — add the category attribute to the table

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:27:48Z
- **Iteration:** 2
- **Scope decision:** none

READY: all 4 iteration-1 findings verified fixed; FR-EVT-1/FR-EVT-7/VER-1 coverage, entity/signature consistency, and exporter-split coherence re-verified.

### Findings

- None
