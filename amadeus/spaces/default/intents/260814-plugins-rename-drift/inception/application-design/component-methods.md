# Component Methods — 260814-plugins-rename-drift

上流入力: `components.md` C2〜C5。関数モデリングは class-free(type + コンパニオン、判別ユニオン Result — project.md Code Style)。シグネチャは実装時に既存ファイルのイディオムへ合わせる(以下は公開面の契約レベル)。

## C2: 宣言パーサ(amadeus-plugin-compose.ts)

```ts
// parsePluginManifest 内に追加(:345-351 の並び)
parseSettings(raw: unknown, errors: string[]): PluginSettingsDeclaration
// PluginSettingsDeclaration = Readonly<Record<key, { type: "string"|"number"|"boolean"|"enum"; default: string|number|boolean; values?: readonly string[]; description: string }>>
```

- 入力: plugin.json の `settings` 値(optional — 不在は `{}` で従前動作)。
- エラー処理: 不正形(非オブジェクト・不正キー名・機密パターンキー・未知 type・default と type の不一致・enum の values 欠落)は `errors[]` へ push → 1 件でも manifest 全体が `{manifest:null}`(既存 :350 の fail-closed に相乗り)。
- 綴り誤り検出: `settings` 以外の既知外トップレベルキーのうち `settings` との編集距離が近いもの(`setings` / `setting` / `Settings`)をエラーにする実在検査(ADR-3 の範囲限定)。

## C3: config キー(amadeus-config.ts)

```ts
parsePluginSettings(value: unknown): Result<PluginSettingsOverrides, ConfigTypeIssue>
// PluginSettingsOverrides = Readonly<Record<pluginName, Readonly<Record<key, string|number|boolean>>>>
```

- `parsePluginScopeBindings`(:497-521)と同型の全段 fail-closed(非オブジェクト・不正プラグイン名・不正キー名・機密パターンキー・非スカラー値は即 invalid)。
- 型・閉語彙の突合(宣言スキーマとの照合)は C4 の解決時に行う(config parse 時点ではスキーマにアクセスしないため字句検証のみ。ADR-3)。
- registry エントリ: `path: "plugin.settings"`, `layers: ["project","space","intent"]`, `merge: per-plugin-per-key 浅マージ(後勝ち = intent 最優先)`。

## C4: 設定解決・受け渡し(amadeus-sensor.ts)

```ts
resolvePluginSettingsForSensor(sensorId, compositionRecord, config): Result<ResolvedSettings, SettingsError>
// ResolvedSettings = Readonly<Record<key, string|number|boolean>>(宣言デフォルト ← project ← space ← intent の順で override)
```

- エラー処理(fail-closed): 宣言に無いキーの override・型不一致・閉語彙外は SettingsError — センサー実行を中止し audit へ loud 記録(検証劇場を作らないため「デフォルトで続行」はしない)。
- 受け渡し: 子プロセス argv に `--settings-json '<ResolvedSettings JSON>'` を 1 引数で付与(既存 `sensor-flags.ts` の argv 解析前例に整合)。

## C5: git-drift センサー(tools/amadeus-sensor-git-drift.ts)

```ts
// CLI 契約(bun 直接実行、core import なし)
// 入力: --stage <slug> --output-path <path> --settings-json <json>(core が付与)
// 出力: sensor 出力スキーマ(既存センサーの verdict md/json 形式に合わせる)。exit 0 固定(advisory)
detectDrift(input: { repoRoot; defaultBranch; settings }): DriftReport
// DriftReport = { kind: "synced" } | { kind: "info"; behind: number } | { kind: "warning"; behind: number; intersecting: readonly string[]; ledgerIntersecting: readonly string[] } | { kind: "skipped"; reason: "fetch-failed" | "not-a-git-repo" | "no-origin"; detail?: string }
// 注(functional-design 段で C5 署名を是正 — 2026-08-14): 初稿の "throttled" は ADR-5 の Decision「スロットルは fetch のみ skip・判定は毎回実行」により報告種別として存在しなくなった(スロットル中も synced/info/warning のいずれかを返す)ため削除。skip 診断用の detail? を追加。承認済み ADR-5 への機械的整合であり仕様変更ではない。
```

- スロットル: 前回 fetch 時刻を機械ローカル(`.amadeus-*` 系の gitignored scratch)へ記録し、`fetch-throttle-seconds` 以内は `git fetch` を skip して前回の remote-tracking ref で判定(fetch のみ skip、判定は実行)。
- 交差判定: origin 側変更 = `git diff --name-only HEAD...origin/<default>`(merge-base 三点)、作業側変更 = `git status --porcelain` + `git diff --name-only <merge-base>..HEAD`。積集合が交差。台帳系パターン(`amadeus/spaces/*/intents/*/audit/`、`amadeus-state.md`、`tests/no-silent-drop/events/`)との交差は `ledgerIntersecting` へ分離して優先警告。
- エラー処理: fetch 失敗・origin 不在・非 git は `skipped` で loud 記録して exit 0(fail-open — FR-DRIFT-5)。防御的 catch も含め全経路をテスト対象にする(TDD 既定)。
