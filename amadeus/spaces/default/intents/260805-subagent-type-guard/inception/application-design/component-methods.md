# Application Design — Component Methods

**上流入力(consumes 全数)**: `requirements`(AC-1〜AC-6 が各メソッドのテスト契約)/ codekb `architecture`(差し込み先 seam の現在座標)/ codekb `component-inventory`(既存関数のシグネチャ様式 — type + コンパニオン、判別 union Result の既習スタイル)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`。設計スタイルは functional-domain-modeling-ts(class-free、判別 union、parse-don't-validate)。

## C-1〜C-4: `amadeus-subagent-observability.ts`(新設・純関数層)

```ts
// C-4: count-free 台帳(件数コメント禁止)。由来コメントのみ。
// NOTE: "unknown" は意図的に不収載 — normalizeAgentType の fallback(型未指定)であり
// FR-2b の警告対象。RE 観測タリーの「組込8」は集計バケツで、許可集合はこの7種
// (requirements AC-3 の訂正注記を参照)。
export const BUILTIN_AGENT_TYPES: readonly string[] = [
  "default",          // Codex 既定型(fixture 実測)
  "coder",            // Codex / kimi native
  "explore",          // Codex / kimi native(小文字)
  "worker",           // Codex / kimi native
  "general-purpose",  // Claude Code 組込
  "Explore",          // Claude Code 組込(大文字 — 小文字と別値)
  "Plan",             // Claude Code 組込
];

// C-1: persona 集合の機械導出 + 台帳合成。dir 読取失敗は空集合 + 警告(fail-open)。
export interface AllowedSetResolution {
  readonly allowed: ReadonlySet<string>;
  readonly personaCount: number;       // 測定 ref 用(集計出力にのみ使用)
  readonly warnings: readonly string[]; // 読取失敗など。呼び手が stderr へ流す
}
export function resolveAllowedAgentTypes(agentsDir: string): AllowedSetResolution;

// C-2: 型 verdict。normalizeAgentType の出力を受ける(空はここに来ない)。
export type TypeVerdict = "persona" | "builtin" | "unknown-type" | "outside-allowed-set";
export function classifyAgentType(agentType: string, resolution: AllowedSetResolution): TypeVerdict;
// 規則: agentType === "unknown" → "unknown-type"(normalizeAgentType の fallback 産物)
//       persona 集合に完全一致 → "persona" / 台帳に完全一致 → "builtin" / それ以外 → "outside-allowed-set"

// C-3: 実効 model の解決(ADR-3)。
export type ModelSource = "harness" | "request" | "pin";
export type ModelResolution =
  | { readonly kind: "resolved"; readonly model: string; readonly source: ModelSource }
  | { readonly kind: "unresolved" };
export interface ModelResolutionInput {
  readonly harnessModel: string | undefined;   // payload.model(供給ハーネスのみ)
  readonly requestedModel: string | undefined; // tool_input.model(明示時のみ)
  readonly personaPin: string | undefined;     // agent 定義の model:(persona 解決時のみ)
}
export function resolveEffectiveModel(input: ModelResolutionInput): ModelResolution;
// 優先順: harness > request > pin(ADR-3)。空白のみは undefined と同義に扱う。
// いずれも無ければ { kind: "unresolved" }(ADR-5 — 属性を書かない)。
```

- **AC-1 対応**: 3関数とも export された純関数で in-process テスト可能(`cid:code-generation:fs-tests-integration-first` — `resolveAllowedAgentTypes` のみ実 FS を触るため integration 層、他は unit 層)。
- **AC-4 対応**: `resolveEffectiveModel` の4ケース(harness / request / pin / unresolved)を unit テストで固定。

## C-5: hook 配線(既存2ファイルへの差し込み)

### started 側 — `amadeus-lib.ts` `subagentStartFields`(`:4128-4139`)

- 既存のフィールド構成(`Agent Type` / `Agent ID` / `Purpose`)の**後**に、`classifyAgentType` の verdict を `"Type Verdict"` として追加。
- `resolveEffectiveModel` を呼び、resolved なら `"Model"` / `"Model Source"` を追加。入力: `harnessModel = payload.model`、`requestedModel = tool_input.model`、`personaPin =` verdict が `"persona"` のときのみ該当 persona の frontmatter から。
- 集合外・型未指定のとき stderr へ advisory 1行(ADR-1)。**throw は catch し、フィールド追加をスキップして既存3フィールドの emit を継続**(NFR-3)。
- 注意: この面は #2303(tool_name 不一致)により Claude Code では現状発火しない — kimi の `role-start` 経路(`amadeus-kimi-lib.ts:625-626`)では発火する。実装・テストは payload 形状で行い、#2303 の修正には依存しない(CON-2)。

### completed 側 — `core/hooks/amadeus-log-subagent.ts`(`:50-52`, `:68-72`)

- `normalizeAgentType(parsed.agent_type)` の直後に同じ照合・解決を差し込み、`:68-72` のフィールド構成へ同3属性を追加。
- 入力差: completed payload に `tool_input` は無い → `requestedModel = undefined`。`harnessModel = parsed.model`(Codex 供給)。
- advisory の stderr 出力条件・fail-open は started 側と同一。**呼び出し点数を実装時に grep 実測し、run 単位で advisory が過剰に重複しないことを確認**(`cid:code-generation:guard-announcement-callsite-count`)。

## C-6: registry 更新 — `core/otel/event-registry.ts`

- `SUBAGENT_STARTED`(`:612-623`): optional `["Agent ID","Purpose"]` → `["Agent ID","Purpose","Type Verdict","Model","Model Source"]`
- `SUBAGENT_COMPLETED`(`:624-632`): optional `["Agent ID","Message"]` → `["Agent ID","Message","Type Verdict","Model","Model Source"]`
- required は不変(NFR-4)。canonical count 不変(イベント種を増やさない)。

## C-7: `amadeus-subagent-stats.ts`(新設 CLI)

```
Usage: bun amadeus-subagent-stats.ts [--project-dir <path>] [--space <name>] [--json]
```

- 入力: `amadeus/spaces/<space>/intents/*/audit/*.jsonl` の `SUBAGENT_COMPLETED`(一次)+ `SUBAGENT_STARTED`(存在すれば併記)。イベント判定は `.attributes.Event` の**等値比較**(RE 手法メモ — grep の部分一致は偽陽性)。
- 出力(text / `--json`):
  1. 測定 ref ヘッダ: シャード数・イベント総数・測定時刻(FR-4b)
  2. verdict 別内訳: persona / builtin / unknown-type / outside-allowed-set(属性が無い旧行は C-2 を集計時に適用して分類)
  3. 型別ランキング(distinct 値と件数)
  4. model 別内訳 + `unresolved` 件数(ADR-5 — Model 属性なし = unresolved)
- 書込ゼロ・engine 状態に不干渉(read-only 分類 — session skills と同じ性質)。
- **AC-6 対応**: R-2 の再計測をこの実出力で示す。

## テスト設計の割付(NFR-2)

| AC | テスト面 |
|---|---|
| AC-1 | unit: classifyAgentType / BUILTIN_AGENT_TYPES、integration: resolveAllowedAgentTypes(実 FS) |
| AC-2 | 落ちる実証: 集合外型の注入で advisory 発火 + `Type Verdict: outside-allowed-set` を実測 |
| AC-3 | corpus sweep: 実 audit シャード全数へ C-2 を適用し、許可集合内(persona 8 + 組込 7 の実測15種)0 警告・警告対象(unknown-type 69± + outside 261±、測定時刻明記)を両側実測 |
| AC-4 | unit: resolveEffectiveModel の4ケース。Codex fixture(`tests/fixtures/codex-hook-payloads/payloads.json`)注入で harness 段を検証 |
| AC-5 | integration: model 無し payload で属性欠落 + emit 継続 |
| AC-6 | integration: C-7 の実出力(測定 ref ヘッダ + unresolved 区分)を検証 |
