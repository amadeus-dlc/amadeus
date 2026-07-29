# Domain Entities — U2: event-registry

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（参照済み）

## EventDef

| 属性 | 型 | 説明 |
|---|---|---|
| name | RegisteredEventName | イベント名（78 語彙の union） |
| durability | "canonical" \| "telemetry" | 耐久性分類。canonical のみ AuditLogExporter へ |
| requiredAttributes | readonly string[] | 必須属性（BR-4 の検証に使用） |
| schemaVersion | number | イベント schema version（migration 対、BR-5） |
| category | EventCategory | 語彙の分類（lifecycle・state transition・gate・presence・grant・sensor・merge・recovery 等）。canonical 必要な state 系 event の telemetry 誤分類の検出に使用 |

## EventRegistry（値の集合＋検証関数）

- `getEventDef(name): EventDef` — 定義の引き当て
- `assertRegistryConsistent(): void` — 4集合一致の runtime 検証（VER-1）
- compile-time 側は `RegisteredEventName` union 型が未登録名を排除

## EventCategory（語彙の分類）

78 語彙は lifecycle（workflow／phase／stage）・state transition・gate・presence・grant・sensor・merge・recovery 等の既存カテゴリに従う。カテゴリは EventDef の補助属性として保持し、分類ミス（canonical 必要な state 系 event の telemetry 化）を drift guard が検出する。
