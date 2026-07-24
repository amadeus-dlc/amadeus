# Component Methods — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

## Harness Detector(`amadeus-lib.ts`)

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
const HARNESS_DIR_TO_TYPE: Record<string, HarnessType> = {
  ".claude": "claude-code",
  ".codex": "codex",
  ".cursor": "cursor",
  ".opencode": "opencode",
  ".kiro": "kiro",
};
```

`KNOWN_HARNESS_DIRS`(`amadeus-lib.ts:158`)と 1:1 対応。canonical な1定義から導出(construction phase guardrail: 手書き重複を避ける)。

### `detectHarnessType(): HarnessType`

- **目的**: FR-2/FR-3/FR-1 AC-1d の検出優先順位を実装
- **署名**: `export function detectHarnessType(): HarnessType`
- **ロジック(高レベル、詳細は functional-design)**:
  1. `AMADEUS_HARNESS_TYPE` env override があれば、それを `HarnessType` として検証(parse-dont-validate: 既知7値のいずれかか)してから返す(FR-1 AC-1d の manual 上書き経路。override が `manual` を含む任意の既知値を取りうる。未知値の扱い — 拒否して `unknown` へ落とすか throw か — は functional-design で確定)
  2. `process.env.CLAUDECODE === "1"` → `"claude-code"`(FR-2 一次手段)
  3. `harnessDir()`(`:187-193`)の解決結果(dot-dir 文字列)を `HARNESS_DIR_TO_TYPE` で引く。ヒットすれば対応 type(FR-3 補助シグナル)。**`harnessDir()` を呼ぶ**のは、これが `AMADEUS_HARNESS_DIR` env override(FR-3 AC-3b)を最優先で尊重する export ラッパー(`:189-193`、`process.env.AMADEUS_HARNESS_DIR` を先頭で読む)であり、内部関数 `deriveHarnessDir()`(`:168-183`)は env override を読まないためである(reviewer iteration 1 の是正 — AC-3b を満たすには `harnessDir()` 経由が必須)
  4. いずれも該当しなければ `"unknown"`(FR-3 AC-3c フォールバック)
- **AC-3d 申し送り**: `harnessDir()` が内部で委譲する `deriveHarnessDir()`(`:168-183`)の CWD プローブ段が dev repo で誤検出しうる点は functional-design で呼び出し文脈を確認

## Harness Recorder(`amadeus-utility.ts`)

### `handleIntentBirthStateBuild()` の変更

- **目的**: FR-1 — state.md Project Information ブロックへ Harness フィールドを埋め込む
- **変更点**: `stateContent` テンプレート(`:4092-4144`)の Project Information ブロック(`:4094-4103`)に、`detectHarnessType()` の結果を用いた `- **Harness**: ${harnessType}` 行を追加
- **署名変更なし**(既存関数の内部変更のみ)

## Field Reuse(既存、追加署名なし)

- `getField(content, "Harness")` → `string | null`(FR-1 AC-1c 読み)
- `setOrInsertField(content, "Project Information", "Harness", value)` → `string`(将来の後付け更新用、`amadeus-lib.ts:4891-4905`)
