# Domain Entities — plugin-settings-core

上流入力: `component-methods.md` C2〜C4 の型契約、`business-logic-model.md` のワークフロー、`business-rules.md` R1〜R12、`unit-of-work.md` U2、`requirements.md` FR-SET、`components.md` C2〜C4、`services.md` F2。スタイル: class-free、type + コンパニオン、判別ユニオン Result(project.md Code Style)。

## エンティティ

### PluginSettingsDeclaration(宣言 — manifest 由来)

```ts
type SettingType = "string" | "number" | "boolean" | "enum";
interface SettingDeclaration {
  readonly type: SettingType;
  readonly default: string | number | boolean;
  readonly values?: readonly string[];   // type=enum のみ必須
  readonly description: string;
}
type PluginSettingsDeclaration = Readonly<Record<string, SettingDeclaration>>;
```

- ライフサイクル: compose 時に manifest から parse され、composition record 経由でセンサー発火時に再読される(PluginManifest の一部)。
- 不変条件: R1〜R4、R9(parse を通過した値のみ存在 — parse-don't-validate)。

### PluginSettingsOverrides(override — config 由来)

```ts
type SettingScalar = string | number | boolean;
type PluginSettingsOverrides = Readonly<Record<string /*plugin*/, Readonly<Record<string /*key*/, SettingScalar>>>>;
```

- ライフサイクル: config 読取ごとに 3 層から parse・浅マージ。`AmadeusConfig` に `pluginSettings` として載る(resolvedConfig 面)。
- 不変条件: R1/R2/R5(字句検証のみ — 宣言との突合は解決時)。

### ResolvedSettings(解決結果)

```ts
type ResolvedSettings = Readonly<Record<string, SettingScalar>>;
type SettingsResolution =
  | { readonly ok: true; readonly settings: ResolvedSettings }
  | { readonly ok: false; readonly error: { readonly code: "unknown-key" | "type-mismatch" | "enum-out-of-range"; readonly plugin: string; readonly key: string; readonly detail: string } };
```

- ライフサイクル: センサー発火ごとに導出(キャッシュなし)。ok=false はセンサー中止 + loud 記録。
- 不変条件: R6〜R8、I2(決定的)。

## 関係

```
PluginManifest 1 ──含む── 0..1 PluginSettingsDeclaration
AmadeusConfig 1 ──含む── 0..1 PluginSettingsOverrides(per-plugin ネスト)
(Declaration, Overrides[plugin]) ──resolve──> SettingsResolution ──ok──> argv --settings-json
```

## registry エントリ(config 側の宣言的定義)

- path: `"plugin.settings"` / domain: plugin / layers: `["project","space","intent"]` / merge: per-plugin per-key 後勝ち浅マージ / defaultValue: `{}` / parse: `parsePluginSettings`
- `AmadeusConfigKey` union へ 1 リテラル追加(:58-66 → 9 キー)。docs `21-layered-config` / `19-layered-config` en+ja に同一行を追加(t432 逐語一致)。
