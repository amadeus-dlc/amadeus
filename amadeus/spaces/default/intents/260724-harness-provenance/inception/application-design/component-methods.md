# Component Methods — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

## Harness Detector(`amadeus-harness.ts`)

### `HarnessType`(型)

```typescript
export type HarnessType =
  | "claude-code"
  | "codex"
  | "cursor"
  | "opencode"
  | "kiro"
  | "unknown"
  | "manual";
```

state フィールド `Harness` が取りうる値の全体集合(7値)。requirements.md FR-1(`:15`)の値集合と 1:1 一致し、無効状態を型で表現不能にする(team-practices.md の Decided: functional-domain-modeling-ts、parse-dont-validate)。

`manual` の位置づけ: `manual` は「自動検出の純粋な結果」ではなく、`AMADEUS_HARNESS_TYPE` env override(FR-1 AC-1d)を通じてユーザーが手動指定したことを示す値である。したがって `detectHarnessType()` は **override が設定されている場合にのみ** `manual`(または override が指定する具体値)を返し、**override なしの自動検出のみでは** `claude-code`/`codex`/`cursor`/`opencode`/`kiro`/`unknown` のいずれか(= `manual` 以外の6値)を返す。この「自動検出は6値・override 経由で7値目 `manual` が入りうる」という非対称は下記 `detectHarnessType()` の解決順序で表現する。

### `HARNESS_DIR_TO_TYPE`(定数)

```typescript
export const HARNESS_DIR_TO_TYPE = {
  ".claude": "claude-code",
  ".codex": "codex",
  ".cursor": "cursor",
  ".opencode": "opencode",
  ".kiro": "kiro",
} as const satisfies Record<
  string,
  Exclude<HarnessType, "unknown" | "manual">
>;

type SupportedHarnessDir = keyof typeof HARNESS_DIR_TO_TYPE;
```

Issue #1452 が記録対象とする5種のdot-dirとハーネス種別については、このmapping自体を閉じたcanonical定義とする。`SupportedHarnessDir`はmappingのkeyから導出し、同じ5要素の配列・unionを別途手書きしない。`KNOWN_HARNESS_DIRS`はCWD probeの候補順だけを表し、存在するハーネス種別のsource of truthとは扱わない。将来`KNOWN_HARNESS_DIRS`へ未知dot-dirが追加されても、mappingへ明示追加されるまでは`unknown`となる。constructionではmappingのkey/value全件と本要件の5対象を直接テストし、意図しない欠落・追加を検出する。

### `HarnessDirResolution` と `resolveHarnessDir()`

```typescript
type HarnessDirSource = "env" | "script-path" | "cwd-probe" | "fallback";

type HarnessDirResolution = Readonly<{
  dir: string;
  source: HarnessDirSource;
}>;
```

- **目的**: 既存`harnessDir(): string`が失う検出元を内部で保持し、実検出された`.claude`と最終fallback `.claude`を区別する
- **配置**: `amadeus-harness.ts`内のprivate seam。既存利用者には`amadeus-lib.ts`から再exportし、公開APIは増やさない
- **解決順序**:
  1. `AMADEUS_HARNESS_DIR`がtruthyなら `{ dir: value, source: "env" }`
  2. module pathのgrandparentがdot-dirなら `{ dir: candidate, source: "script-path" }`
  3. CWDに`KNOWN_HARNESS_DIRS`の候補があれば `{ dir: candidate, source: "cwd-probe" }`
  4. いずれもなければ `{ dir: ".claude", source: "fallback" }`
- **互換性**: 既存`harnessDir()`は`resolveHarnessDir().dir`だけを返すため、公開署名と文字列結果は不変。envはキャッシュより前に毎回評価し、非envのresolutionだけをprocess内cacheする

### `detectHarnessType(): HarnessType`

- **目的**: FR-2/FR-3/FR-1 AC-1d の検出優先順位を実装
- **署名**: `export function detectHarnessType(): HarnessType`
- **ロジック(高レベル、詳細は functional-design)**:
  1. `AMADEUS_HARNESS_TYPE` env override が存在すれば、それを既知7値として厳密にparseする。既知値なら返し、不正値・空文字は`unknown`を返して自動検出へフォールスルーしない(FR-1 AC-1d、functional-designでユーザー確認済み)
  2. `process.env.CLAUDECODE === "1"` → `"claude-code"`(FR-2 一次手段)
  3. `resolveHarnessDir()`を呼ぶ。`source === "fallback"`なら`unknown`を返す(FR-3 AC-3c)
  4. `source !== "fallback"`なら`dir`を`HARNESS_DIR_TO_TYPE`で引く。既知dot-dirなら対応type、open-setの未知dot-dirなら`unknown`を返す(FR-3補助シグナル)
- **AC-3b**: `resolveHarnessDir()`自身が`AMADEUS_HARNESS_DIR`をcall-timeで最優先するため維持
- **AC-3d**: 下記「intent birth呼出文脈の証明」のとおり、通常のbirth経路は明示env overrideまたはscript-pathで必ず解決し、CWD probeへ到達しない。CWD probeはcore sourceを配布ツリー外から直接実行する開発時経路にのみ残る補助シグナルであり、`source: "cwd-probe"`として識別可能かつmanual overrideで常時上書き可能

### intent birth呼出文脈の証明(AC-3d)

1. `birthPrintDirective()`は`packages/framework/core/tools/amadeus-orchestrate.ts:660`で、既存`harnessDir()`が解決したdot-dir配下の`tools/amadeus-utility.ts`を起動コマンドに埋め込む。
2. Claude/Codex/Cursor/OpenCode/Kiro/Kiro IDEの全6 manifestは、共通`core/tools`を各ハーネスdot-dirの`tools`へ投影する(`packages/framework/harness/*/manifest.ts`の`coreDirs: { src: "tools", dst: "tools" }`)。Kiro CLIとKiro IDEは同じ`.kiro`/`kiro`記録値を共有する。
3. 投影された`amadeus-utility.ts`は`amadeus-lib.ts`から再exportされた検出関数を使い、実装モジュール`amadeus-harness.ts`も同じ`tools`ディレクトリへ投影される。そのためintent birth中の検出モジュールのscript pathは常に`<project>/<dot-dir>/tools/amadeus-harness.ts`となり、grandparentは対象dot-dirである。
4. よって、`AMADEUS_HARNESS_DIR`が明示設定されていれば`env`で先に確定し、未設定なら`script-path`で確定する。どちらもCWD probeより前であり、通常のintent birthではCWD probeへ到達しない。

constructionの必須テストでは、6配布形態の投影済み`tools/amadeus-utility.ts`経由で、明示envなしのresolution sourceが`script-path`となることを検証する。別途、配布ツリー外のcore source直接実行でのみ`cwd-probe`/`fallback`分岐を単体テストし、通常birth経路との境界を固定する。

## Harness Recorder(`amadeus-utility.ts`)

### `handleIntentBirthStateBuild()` の変更

- **目的**: FR-1 — state.md Project Information ブロックへ Harness フィールドを埋め込む
- **変更点**: `stateContent` テンプレート(`:4092-4144`)の Project Information ブロック(`:4094-4103`)に、`detectHarnessType()` の結果を用いた `- **Harness**: ${harnessType}` 行を追加
- **署名変更なし**(既存関数の内部変更のみ)

## Field Reuse(既存、追加署名なし)

- `getField(content, "Harness")` → `string | null`(FR-1 AC-1c 読み)
- `setOrInsertField(content, "Project Information", "Harness", value)` → `string`(将来の後付け更新用、`amadeus-lib.ts:4891-4905`)
