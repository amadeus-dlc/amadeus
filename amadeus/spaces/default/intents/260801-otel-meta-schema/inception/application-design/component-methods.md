# Component Methods — otel-meta-schema

上流入力(consumes 全数): requirements.md、architecture.md(codekb 260801 現在節)、component-inventory.md(同)— 各シグネチャは requirements.md の FR テスト句を満たす最小 API として導出し、既習様式(memo+reset シーム、3段ゲート hook)は architecture.md / component-inventory.md 現在節の実測記載に合わせた。

## otel/resource.ts(新設)

| メソッド | シグネチャ | 対応 FR |
|---|---|---|
| `buildResource` | `(projectDir: string) => Record<string, string>` — 中立8属性を解決し supplier 供給分を合成。取得不能キーは省略 | FR-RES-1〜2 |
| `currentResource` | `(projectDir: string) => Record<string, string>` — memo 付き getter(プロバイダの record 組み立てが読む)。supplier 供給で memo 無効化 | FR-RES-1 / ADR-1 |
| `resetResourceForTests` | `() => void` | NFR(テストシーム) |

## otel/resource-suppliers.ts(新設)

| メソッド | シグネチャ | 対応 FR |
|---|---|---|
| `supplyResourceAttribute` | `(key: SuppliedResourceKey, value: string) => void` — 許可キー閉集合(`amadeus.harness.version` / `gen_ai.request.model` / `session.id` / `amadeus.agent.role`)。二重設定 throw | FR-RES-3 / ADR-2 |
| `suppliedResourceAttributes` | `() => Readonly<Record<string, string>>` | FR-RES-1 |
| `supplyTokenUsage` | `(usage: { inputTokens: number; outputTokens: number; model?: string }) => void` — 計器へ記録(meter 未配線時は no-op = fail-open) | FR-MET-3 |
| `resetSuppliersForTests` | `() => void` | テストシーム |

## otel/redaction.ts(追加分)

| メソッド | シグネチャ | 対応 FR |
|---|---|---|
| `redactStacktrace` | `(stack: string, repoRoot: string) => string` — repo 相対化 / `<home>` / `<external>` マスク+credential scrub | FR-EXC-3 / ADR-4 |

## otel/tracer-provider.ts(改修)

- `recordException(exception, time?)` — err.name → `exception.type`、`redactStacktrace(err.stack)` → `exception.stacktrace` を追加(FR-EXC-2)
- span record 組み立て — resource を `currentResource()` から、`amadeus.intent.id` / `amadeus.space` / `amadeus.stage` / `amadeus.phase` を attribute resolver から(FR-SPAN-1〜2)。resolver は `AMADEUS_AGENT_TYPE` / `AMADEUS_AGENT_ID` env が存在する場合のみ `amadeus.agent.type` / `amadeus.agent.id` を追加(FR-SUB-4。**供給経路は FD 段の未決事項** — components.md の該当行を参照。未設定は省略 = fail-open)

## otel/local-span-exporter.ts(改修)

- `redactRecord(record)`(:88-99)— 既存の attributes / events[].attributes / links[].attributes に加え **`resource` を redactAttributes へ通す**(FR-RES-4。現状の `...record` スプレッド素通りを閉鎖)

## otel/metrics-instruments.ts(新設)

| 定数/メソッド | 内容 | 対応 FR |
|---|---|---|
| `INSTRUMENTS` | 5計器の name/kind/許可属性キーの閉集合定数(1定義) | FR-MET-2 |
| `recordStageDuration` ほか計測ヘルパ | 発火点から呼ぶ薄いラッパ(meter 未登録時 no-op) | FR-MET-4 |

## hooks/amadeus-subagent-start.ts(新設)

- PreToolUse(matcher Task)payload を drain → 3段ゲート(amadeus-log-subagent.ts:37-63 の既習形)→ `appendAuditEntryViaEvents("SUBAGENT_STARTED", { "Agent Type", "Agent ID"?, "Purpose"? })` → 失敗 recordHookDrop(FR-SUB-1〜2)

## otel/subagent-lifetime.ts(新設)

| メソッド | シグネチャ | 対応 FR |
|---|---|---|
| `composeSubagentLifetimes` | `(records: JournalRecord[]) => SubagentLifetime[]` — started/completed を Agent ID(なければ Type+時刻近接)で突合。片割れは `incomplete: true` | FR-SUB-3 |
