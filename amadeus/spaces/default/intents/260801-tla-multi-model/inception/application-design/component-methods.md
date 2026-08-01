# Component Methods — 260801-tla-multi-model

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

components.md C1〜C10 の公開面を TypeScript シグネチャレベルで定める。既存コード流儀(Result 的明示失敗・fail-closed・readonly 修飾・named export)に厳密一致(team-practices Code Style)。詳細な業務ルールは Functional Design へ委譲。

## C1: model-map スキーマ(tla-model-map.ts / amadeus-formal-verif-model-map.ts)

```ts
// ModelMapModel の拡張(optional、省略時は既存意味不変)
export interface ModelMapModel {
  readonly name: string;
  readonly model: ModelMapAssetIdentity;
  readonly cfg: ModelMapAssetIdentity;
  readonly auxiliaries?: readonly ModelMapAssetIdentity[];
  readonly entries: readonly ModelMapEntry[];
  // ADR-6: モデル別語彙(後述 C4)。optional、非侵襲。
  readonly vocabulary?: ModelVocabulary;
}

export interface ModelVocabulary {
  readonly namedInvariants: readonly string[];
  readonly traceStateVariables: readonly string[];
}
```

- `parseTlaModelMap(bytes: Uint8Array): Result<ModelMap, ModelLoadError>` — シグネチャ不変。`parseModel` 内部で `exactObject` を「auxiliaries/vocabulary あり/なし」の許可キー集合へ拡張。aux 要素は `parseAssetIdentity` 流の検証を通すが path 期待値は `specs/tla/<Name>.tla` 形式のみ許容(cfg や他拡張子は MODEL_MAP_INVALID)。未知キーは従来どおり拒否。
- `findModelMapModel(modelMap, name)` — 不変。
- エラー方針: 不正 aux(空配列は許容しない方針 — 省略と空を区別し、空配列は `MODEL_MAP_INVALID` として fail-closed;重複 path も拒否)は全て `invalid(...)` 経由の明示失敗。

## C2: 推移解決リゾルバ(tla-module-deps.ts、新規)

```ts
export type ModuleDepsErrorCode =
  | "MODULE_DEP_UNRESOLVED"   // 参照先モジュールが specs/tla に存在しない
  | "MODULE_DEP_CYCLE"        // 循環参照
  | "MODULE_DEP_OUT_OF_BOUNDS"; // specs/tla 外参照(パストラバーサル含む)

export interface ModuleDepsError {
  readonly kind: "MODULE_DEPS";
  readonly code: ModuleDepsErrorCode;
  readonly relativePath: string;
  readonly detail: string;
}

// 直接依存の抽出(コメント除去済みソースに対して行ベースで走査)
export function extractModuleRefs(
  moduleName: string,
  source: string,
): Result<readonly string[], ModuleDepsError>;

// 推移閉包(自己を除く、ソート済み・重複排除)
export function resolveAuxiliaryModules(
  moduleName: string,
  readModule: (name: string) => Result<string, ModuleDepsError>,
): Result<readonly string[], ModuleDepsError>;
```

- `readModule` を注入シームにするのは loader の `TlaFileSystem` 抽象(tla-model-loader-internal.ts:52-58)と整合させ、sensor 側では node fs 直接読みにするため。
- 抽出規則: `(* … *)` ブロックコメント(複数行)と `\*` 行コメントを除去後、行頭(前置空白許容)が `EXTENDS` または `INSTANCE` の行のみ走査。`INSTANCE X WITH …` の改行跨ぎは INSTANCE 行のモジュール名のみ採ればよい(WITH 句の代入名は依存でない)。`Core!Foo` 形の参照は新たな依存を生まない(INSTANCE 宣言で捕捉済み)。

## C3: loader(tla-model-loader-internal.ts / tla-model-loader.ts)

```ts
export interface VerifiedModelSource {
  readonly model: ModelMapModel;
  readonly moduleBytes: Uint8Array;
  readonly cfgBytes: Uint8Array;
  readonly moduleSource: string;
  readonly cfgSource: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  readonly auxIdentities: readonly ModelMapAssetIdentity[]; // 解決済み aux の実測 identity
}

export interface VerifiedTlaSources {
  readonly models: readonly VerifiedModelSource[]; // model-map.json の models 配列の宣言順(parser が一意・名前昇順を強制するため、宣言順は名前昇順に一致する決定的順序)
  readonly modelMap: ModelMap;
}

export function loadVerifiedTlaSourcesInternal(
  moduleUrl: string,
  fs?: TlaFileSystem,
): Result<VerifiedTlaSources, TlaModelPipelineError | ModuleDepsError>;

// 選択絞り込み(未登録名は MODEL_LOAD 明示失敗 — NFR-2)
export function selectVerifiedModel(
  sources: VerifiedTlaSources,
  name: string,
): Result<VerifiedModelSource, ModelLoadError>;
```

- `loadVerifiedTlaSourceInternal`(単数形)は廃止または薄い互換 wrapper とする。呼出側(run-model-check-source.ts 等)は `selectVerifiedModel` でモデルを選ぶ。**無引数 wrapper(tla-model-loader.ts)の意味は「全登録モデルを検証して返す」**(SD Q1=A;無引数ピン t-formal-verif-tla-model-loader.test.ts:10-13 の改訂は requirements FR-4 で確定済み)。
- 検証順序(fail-fast): (1) map 読込・parse → (2) 全モデルの model/cfg/aux identity 照合(`verifyRegisteredAssets` 拡張、実行モデル skip 撤廃) → (3) 全モデルの推移解決と宣言集合の双方向差分検査(不一致は SOURCE_DRIFT 系の明示失敗;宣言漏れ・過剰宣言を detail で区別) → (4) implementation entries 照合(現行どおり)。
- aux identity 計算: `canonicalIdentity(source, "amadeus.formal-verif.tla.module.v1")`(model と同型、RA Q1=A)。

## C4: 語彙供給(tla-arm.ts / tlc-toolchain.ts)

```ts
// tla-arm.ts — モデル別 invariant 集合の解決(model-map vocabulary を唯一の源に)
export function namedInvariantsFor(
  model: ModelMapModel,
): Result<readonly string[], TlaArmError>; // vocabulary 未設定は明示失敗

// tlc-toolchain.ts — TRACE 解析語彙のモデル別供給
export interface TraceVocabulary {
  readonly moduleName: string;              // ラベル regex のモジュール名
  readonly traceStateVariables: readonly string[];
  readonly namedInvariants: readonly string[];
}
```

- 既存の `TLA_NAMED_INVARIANTS`(tla-arm.ts:322-330)と `TRACE_STATE_VARIABLES`(tlc-toolchain.ts:418)のコード側既定値は**削除**する。model-map.json の vocabulary が唯一の源であり、コードに値の複製を残さない(Finding-1 確定: FormalElection エントリへ vocabulary を追加し、identity 値・entries は不変 — FE Q2=A / ADR-3)。toolchain 内部の参照(:475 / :511)は `TraceVocabulary` 経由へ切替。
- `parseTlcTrace` 系の入口で語彙を引数化(メソッドシグネチャへ `vocabulary: TraceVocabulary` を追加)。語彙不一致(変数数・順序の不一致、未知 invariant 名)は従来どおり `failed("GRAMMAR", …)` の fail-closed。
- `hasFrozenModelOutputBinding`(:492 実測)は frozen モデル binding の検査であり、**frozen モデル自体は FormalElection 語彙のまま不変**(成功 iii)。一般化の対象外であることを型・コメントで明示する。

## C5: byte-pin(run-model-check-source.ts)

```ts
// 要求モデルの選択とバイト照合(:118-123 の一般化)
function bindRequestedModel(
  sources: VerifiedTlaSources,
  requestedName: string,
  modelPath: string,
  cfgPath: string,
): Result<VerifiedModelSource, ModelLoadError | SourceDriftError>;
```

- 振る舞い: `selectVerifiedModel` で選択 → 要求 `modelPath`/`cfgPath` のバイトを読み、選択モデルの `moduleBytes`/`cfgBytes` と `sameBytes` 照合(現行 semantics をモデル単位へ移すだけ)。不一致は従来どおり `sourceDrift(...)`。未登録モデル名は `MODEL_LOAD` 明示失敗。

## C6: CI ポート/診断/スケルトン

- `node-ci-model-check-port.ts`: モデル実行コマンド生成を `buildModelCheckArgv(modelName: string, outDir: string): readonly string[]` に抽出し、`:200-202` の固定引数を置換。`run` は登録全モデルを反復して `<root>/<model-name>/` へ証跡出力。
- `run-model-check-ci.ts`: `parseRoot`(:11-21)を拡張し `run|verify --root <abs> [--model <name>]` を許容。`--model` 省略時は全登録モデル(SD Q1=A)。未知モデル名は usage エラー(明示失敗)。verify は per-model terminal evidence を全件検査。
- `run-model-check-diagnostic.ts`: `:208-209` の固定パスを実行対象モデルから導出。**既定(引数なし)は全登録モデル反復**(loader と同じ既定 — SD Q1=A に整合)、`--model <name>` で単一絞り込み可(未登録名は明示失敗)。必須引数化はしない。
- `run-skeleton-ci.ts`: `:82-83` の書出し名を実行対象モデル名から導出。frozen モデル生成(`generateFrozenTlaModel`)は変更しない。

## C7: sensor / updateModelMap

- `amadeus-sensor-model-completeness.ts` の check 経路: 各登録モデルについて C2 の `resolveAuxiliaryModules` を実行し、`model.auxiliaries` の path 集合と比較。不一致は sensor 失敗(detail に declared/resolved 両集合)。
- canonical CLI の `updateModelMap` 経路: 不一致検出時に aux 宣言を解決集合へ補正し、identity を `amadeus.formal-verif.tla.module.v1` domain で計算して書戻す。model/cfg/entries の既存書戻し semantics(--impl-only 等)は不変。

## C9: ci.yml

YAML 変更のみ(TypeScript シグネチャなし)。ステップの `run` スクリプトは C6 の全モデル駆動を前提にサマリへ per-model 結果(completion marker + state 統計)を出力する。permissions / timeout / if 条件は不変。
