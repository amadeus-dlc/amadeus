# Business Logic Model — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): unit-of-work(u3 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — user-stories スコープ外のため stories 未生成、FR 写像がストーリー代替), requirements(FR-4 / FR-6, NFR-1/2), components(C4 / C5 / C8), component-methods(C1 ModelVocabulary / C3 / C4 / C5 節), services(S2 / S3 / S4), decisions(ADR-3 / ADR-4 / ADR-5 / ADR-6 / ADR-10), u2-loader-generalization functional-design(business-logic-model §3 VerifiedTlaSources / selectVerifiedModel / §3.4 呼出側適応, domain-entities §1〜§3, business-rules BR-S1〜S5 / BR-I1〜I3), 実測ソース(`plugins/formal-model-check/tools/tla-arm.ts` :1-7 import / :322-330 TLA_NAMED_INVARIANTS / :332-346 型 / :357-364 invariantMap / :402-411 invariantRhs / :447-500 generateFrozenTlaModel 系 / :513-587 receipt 系, `plugins/formal-model-check/tools/tlc-toolchain.ts` :4-9 import / :418 TRACE_STATE_VARIABLES / :426-444 parseTrace / :468-496 counterexample+binding / :503-531 initial-state 反例 / :533-562 parseTlcOutput174, `plugins/formal-model-check/tools/run-model-check-source.ts` :90-144, `specs/tla/model-map.json` 全文, `specs/tla/MirrorLifecycle.cfg` 全文, `specs/tla/MirrorLifecycle.tla` :27-29, `specs/tla/MirrorLifecycleCore.tla` :239-243, `specs/tla/FormalElection.tla` :82-83, `tests/unit/t-formal-verif-tlc-toolchain.test.ts` 全文, `tests/unit/t-formal-verif-tlc-output.test.ts` :1-120, `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` :387-393)

unit-of-work-story-map は FR-1〜FR-6 → Unit の写像表(user-stories 未生成の代替)であり、u3 帰属は FR-4(語彙/byte-pin)/ FR-6(pin 主たる実証)で本設計の FR 帰属と一致する。フロントエンド要素はなく frontend-components.md は生成しない。

## 0. 変更の輪郭

現行の arm/toolchain は「語彙(invariant 名集合・状態変数タプル・モジュール名)をコード内定数として持つ単一モデル専用実装」である:

- `TLA_NAMED_INVARIANTS`(tla-arm.ts:322-330、FormalElection 7件)とその全消費者(:359 invariantMap / :405 invariantRhs / :464 / :521 / :538 / :553-554 / :575)
- `TRACE_STATE_VARIABLES`(tlc-toolchain.ts:418、7変数タプル)とその検査点(:439-440 / :515-516)
- トレースラベル regex の `of module FormalElection>` 固定(:434-436)
- 反例 invariant 名のメンバシップ検査(:475 / :511、`TLA_NAMED_INVARIANTS.includes`)
- `hasFrozenModelOutputBinding`(:492-496、FormalElection リテラル)
- run-model-check-source.ts の byte-pin(:118-131、単一 canonical source との照合)

本 Unit はこれらを **model-map.json の optional `vocabulary` フィールドを唯一の源とするモデル別語彙供給**へ切り替える(ADR-5 / ADR-6)。骨子:

1. model-map.json の **FormalElection エントリへ vocabulary を追加**(値は現行定数と一字一致。identity 値・entries 配列・パース結果は不変 — ADR-3 / ADR-10。MirrorLifecycle エントリの vocabulary は **u4 の所有**であり本 Unit では触らない)。
2. コード側の語彙既定値(`TLA_NAMED_INVARIANTS` / `TRACE_STATE_VARIABLES` 定数)を**削除**する。map が唯一の源であり、値の複製をコードに残さない(ADR-6 / Finding-1 確定)。
3. toolchain の 6 箇所の単一モデル固定を、`VerifiedModelSource.model.vocabulary`(u2 が供給する受け口)由来の `TraceVocabulary` へ一般化する。語彙欠如モデルの TRACE 解析要求は明示失敗(fail-closed)。
4. run-model-check-source.ts の byte-pin を「要求モデル名で選択 → 選択モデルの verified source と照合」へ一般化(C5)。照合 semantics は不変。
5. `hasFrozenModelOutputBinding` と frozen model 生成・receipt 系は **FormalElection 語彙固定のまま不変**(ADR-10)。一般化の対象外であることを型・コメントで明示する。

語彙の配給経路(component-dependency の「toolchain は map を直接読まない」規則どおり、loader 経由のみ):

```
model-map.json vocabulary ──(u1 parse)──> ModelMapModel.vocabulary
      ──(u2 loader 検証)──> VerifiedModelSource.model
      ──(u3 選択 selectVerifiedModel)──> TraceVocabulary 解決 ──> arm / toolchain / byte-pin
```

toolchain・arm が model-map.json を直接読む経路は作らない。語彙は必ず loader が検証済みの `VerifiedModelSource` に乗って届く(ADR-6)。

## 1. 語彙値の確定(2 モデル分の実測)

### 1.1 FormalElection(本 Unit で map へ移管。値は現行定数と一字一致 — u3 AC1 pin)

- **namedInvariants**(tla-arm.ts:322-330 の現行値、宣言順そのまま):
  1. `ChoiceWinner`
  2. `UnknownChoiceRejected`
  3. `ReceivedAtAxis`
  4. `InvalidTimestampRejected`
  5. `AmendSubmission`
  6. `UnknownRefRejected`
  7. `PerVoterResolution`
- **traceStateVariables**(tlc-toolchain.ts:418 の現行値、タプル順そのまま — TLC トレース出力の `/\ <name> =` 行の出現順に一致):
  1. `initialBudget`
  2. `amendBudget`
  3. `accepted`
  4. `holdMarkers`
  5. `holdBudget`
  6. `tally`
  7. `reexamRequired`
- **moduleName**: `FormalElection`(語彙フィールドには持たず `model.name` から導出 — §2.2)

留意: FormalElection.tla:82-83 の VARIABLES 宣言順(`accepted, reexamRequired, initialBudget, amendBudget, holdBudget, holdMarkers, tally`)と traceStateVariables の順は**一致しない**。traceStateVariables は TLC の実出力順に合わせたものであり、宣言順ではない。map へ移管する値はあくまで tlc-toolchain.ts:418 のタプル順である。

### 1.2 MirrorLifecycle(宣言は u4 の所有。本 Unit は受け口の正しさを fixture で検証するため値をここに確定する)

- **namedInvariants**(MirrorLifecycle.cfg:6-8 実測、cfg 宣言順):
  1. `TypeOK`
  2. `NoCloseWithoutLandedSync`
  3. `NoDuplicateCreate`
  - cfg のコメント(:1-2)に "Both invariants" とあるが実宣言は3件であり、**cfg 実測の3件が正**(ADR-5 の「cfg 実測の3件」と一致)。`CloseUnreachable`(MirrorLifecycle.tla:41)は cfg の INVARIANT に宣言されておらず語彙に含めない。
- **traceStateVariables**(MirrorLifecycle.tla:27 / MirrorLifecycleCore.tla:239-243 の VARIABLES 実測):
  1. `receipts`
  2. `issueNumber`
  3. `boundaryIdx`
  - 集合としては VARIABLES 宣言どおり確定。**タプル順は TLC の実出力順に一致する必要があり、MirrorLifecycle の実測出力順は未計測**(u5 の AsIntended 実走で確定・pin する — ADR-8 measure-first)。u4 が宣言する順は vars タプル順(`<<receipts, issueNumber, boundaryIdx>>`)を暫定とし、u5 の実測で異なれば u4 宣言値の順序のみ修正する(identity 値には影響しない — vocabulary は pin 照合対象外、ADR-6)。
- **moduleName**: `MirrorLifecycle`

## 2. 語彙供給の流れ(map → loader → arm/toolchain)

### 2.1 map スキーマ(u1 供給の受け口、変更なし)

u1 が `ModelMapModel` に追加する optional フィールド(component-methods C1 どおり、本 Unit は消費のみ):

```ts
export interface ModelVocabulary {
  readonly namedInvariants: readonly string[];
  readonly traceStateVariables: readonly string[];
}
// ModelMapModel.vocabulary?: ModelVocabulary
```

`exactObject` の許可キー集合拡張・省略時の byte 不変は u1 の責務で確定済み(ADR-3)。本 Unit が行う map 変更は **FormalElection エントリへの vocabulary 追加のみ**で、スキーマ側の変更はない。

### 2.2 TraceVocabulary の解決(toolchain 側の語彙レコード)

component-methods C4 どおり、tlc-toolchain.ts に語彙レコードを置く:

```ts
// tlc-toolchain.ts
export interface TraceVocabulary {
  readonly moduleName: string;              // ラベル regex のモジュール名 = model.name
  readonly traceStateVariables: readonly string[];
  readonly namedInvariants: readonly string[];
}
```

解決は `ModelMapModel` からの純粋関数として定義する(ファイル I/O なし、loader 検証済みの宣言を受け取るだけ):

```ts
// tla-arm.ts(map 語彙の唯一の解決点 — invariant 集合)
export function namedInvariantsFor(
  model: ModelMapModel,
): Result<readonly string[], ModelLoadError>; // vocabulary 省略は MODEL_MAP_INVALID 明示失敗

// tlc-toolchain.ts(TRACE 解析語彙の解決点)
export function traceVocabularyFor(
  model: ModelMapModel,
): Result<TraceVocabulary, ModelLoadError>; // 同上。moduleName は model.name を写す
```

- **vocabulary 省略モデルは明示失敗**(u3 AC2、ADR-6)。失敗コードは新設せず、既存の `MODEL_MAP_INVALID`(kind MODEL_LOAD)を使う(u2 BR-I4「エラー列挙不変」の踏襲 — detail は `model <name> does not declare a vocabulary` 系)。component-methods C4 の当初表記 `TlaArmError` は新エラー型の新設と読めるが、**新設しない**: 語彙欠如は宣言の欠陥であり、loader 系の失敗分類(MODEL_MAP_INVALID)に載せるのが既存流儀と整合する。本解釈を上流へ反映済み(component-methods C4 のシグネチャを `Result<…, ModelLoadError>` へ修正し、u3 functional-design での修正旨を同所に記録)。decisions.md に TlaArmError への言及はなく、ADR 側の追随変更は不要(実測 grep で確認)。
- `moduleName` は map に語彙フィールドとして持たず `model.name` から導出する。model name は parser が一意・文法検証済み(u1)のため、regex 埋込み時の追加検証は不要(§3.2 でエスケープして埋め込む)。
- `namedInvariantsFor` と `traceVocabularyFor` は同一の `model.vocabulary` を読む2つのビューであり、**語彙値そのものの複製は生じない**(map 1箇所が唯一の源)。

### 2.3 配給シーケンス(services S4 の具現化)

run 系(run-model-check-source.ts)の 1 回の呼出しで:

1. `loadVerifiedTlaSources()`(u2 改名後の無引数 loader)で全モデル検証。ここで drift・宣言不一致は既に赤。
2. 要求 `modelPath` の basename からモデル名を導出(現行 :141 の `basename(model.value, ".tla")` を流用。`specs/tla/<Name>.tla` 形であることの検査は verifiedPath の拡張子検査 :97 と dirname 共有検査 :101-107 が既に担う)。
3. `bindRequestedModel`(§4)で選択 + byte-pin 照合。
4. `traceVocabularyFor(selected.model)` で語彙解決。語彙省略モデルはここで明示失敗(u3 AC2)。
5. 解決した `TraceVocabulary` を toolchain 正規化(parseTlcOutput174)の入力へ乗せる(§3.1)。**toolchain 本体は map も loader も import しない**(component-dependency 規則維持)。

FormalElection に対しては (1)〜(5) の結果が現行と byte レベルで一致する(u3 AC1 / FR-6 の pin 対象)。

## 3. toolchain(tlc-toolchain.ts)の 6 箇所の一般化

### 3.1 入口: parseTlcOutput174 の語彙引数化

```ts
export interface TlcOutputInput {
  // ... 既存フィールド不変 ...
  readonly vocabulary: TraceVocabulary; // 追加(必須)
}

export function parseTlcOutput174(input: TlcOutputInput): TlcExploration; // シグネチャ形は不変
```

- 語彙は `TlcOutputInput` の必須フィールドとして追加する(component-methods C4「メソッドシグネチャへ vocabulary: TraceVocabulary を追加」の具現化 — 個別引数ではなく input レコードのメンバとし、既存の input 集約流儀に揃える)。
- 内部の `parseTrace` / `counterexampleExploration` / `initialStateCounterexampleExploration` / `statisticsShapeExploration` は `TraceVocabulary` を引数で受け回す(domain-entities.md §3 ToolchainModelContext)。
- `hasFrozenModelOutputBinding`(:492-496)は**一般化しない**(ADR-10、§3.5)。

### 3.2 トレースラベル regex のモジュール名一般化(:434-436)

現行は `of module FormalElection>$` 固定。語彙の `moduleName` から構築する:

```ts
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const traceLabelPattern = (moduleName: string): RegExp =>
  new RegExp(`^<[A-Za-z_][A-Za-z0-9_]* line [1-9][0-9]*, col [1-9][0-9]* to line [1-9][0-9]*, col [1-9][0-9]* of module ${escapeRegExp(moduleName)}>$`);
```

- アクション名部・行/桁 span の grammar は**一字も変えない**(現行コメント :420-424 の実測由来 grammar 維持)。一般化はモジュール名の埋込みのみ。
- model name は TLA 識別子文法が parser で保証されるが、regex 埋込みは防御的にエスケープする(NFR-2 の fail-closed 精神 — 仮に文逸脱が混入しても regex 意味論を壊さない)。
- ordinal=1 の `<Initial predicate>` 受理はモデル非依存で不変。

### 3.3 反例変数列検証(:439-440 / :515-516)

`TRACE_STATE_VARIABLES` 定数参照を `vocabulary.traceStateVariables` へ置換するだけで、検査 semantics は不変:

- 変数**数の一致**(`variables.length !== vocabulary.traceStateVariables.length`)
- 変数**名の順序一致**(`variables.some((name, index) => name !== vocabulary.traceStateVariables[index])`)
- 不一致は従来どおり: parseTrace は `null`(→ GRAMMAR)、initial-state 反例は `failed("GRAMMAR", …)`。

### 3.4 反例 invariant 名検査(:475 / :511)

`TLA_NAMED_INVARIANTS.includes(invariantName)` を `vocabulary.namedInvariants.includes(invariantName)` へ置換。失敗時の失敗分類は不変: `failed("GRAMMAR", "counterexample invariant is outside the frozen set")`。**未知 invariant 名の拒否 semantics はモデルごとに保存される**(u3 AC2、BR-G4): そのモデルの語彙にない invariant 名を TLC が報告したら GRAMMAR 赤。和集合で緩めない(ADR-5 の却下案 (a) の偽陰性を避ける)。

`model.invariantSourceMap[invariantName]` の参照は receipt のキー集合が語彙由来(§5.2)になるため、語彙と receipt のキー集合の一致は `validateFrozenTlaModelReceipt` の closed-set 検査(§5.2)が保証する — ここでの追加検査は不要。

### 3.5 hasFrozenModelOutputBinding(:492-496)— 一般化しない(ADR-10)

```ts
function hasFrozenModelOutputBinding(input: TlcOutputInput): boolean {
  return input.expectedModuleName === "FormalElection"
    && input.expectedModulePath.split(/[\\/]/).at(-1) === "FormalElection.tla"
    && input.expectedStandardModuleDirectory.startsWith("/");
}
```

- **本 Unit では一字も変更しない**。frozen model receipt が FormalElection 語彙に固定される以上、receipt と出力の binding も FormalElection にスコープされるのが一貫した semantics(ADR-10 / BR-F1)。
- 「一般化対象外」であることをコメントで明示する(型変更は伴わない)。
- **下流との緊張の記録**: u5 が MirrorLifecycle を toolchain で実走する際、現行の parseTlcOutput174 は `validateFrozenTlaModelReceipt` + `hasFrozenModelOutputBinding` の2ゲートを通すため、FormalElection 以外のモデルの正規化はこの入口では成立しない。MirrorLifecycle の TLC 証跡正規化をどう構成するか(frozen receipt と等価の per-model binding を u5 で設計するか、別入口か)は **u5 の設計事項**であり、u3 は FormalElection 面を不変に保つことのみ責務とする(unit-of-work u3 所有ファイルに MirrorLifecycle 実行経路は含まれない)。§6 の引き渡し事項に記録する。

### 3.6 TRACE_STATE_VARIABLES 定数の削除

:418 の `const TRACE_STATE_VARIABLES = [...] as const` は**削除**する(ADR-6: コード側既定値を残さない)。:439-440 / :515-516 の参照は §3.3 の語彙参照へ切替済みのため、削除後に残余参照がないことを typecheck で機械確認する(t404 の grep ガードでも固定 — §5.1)。

## 4. arm(tla-arm.ts)の語彙供給化

### 4.1 TLA_NAMED_INVARIANTS 定数の削除と型の改訂

- :322-330 の `export const TLA_NAMED_INVARIANTS` は**削除**する。
- :332 の `export type TlaNamedInvariant = (typeof TLA_NAMED_INVARIANTS)[number]` は値集合の消滅に伴い維持不能。receipt 型のキー精度は実行時の closed-set 検査(exactPlainObject、§5.2)が担っているため、**型は `Record<string, …>` へ緩和**する:

```ts
export interface FrozenTlaModelReceipt {
  // ... 既存フィールド不変 ...
  namedInvariantFormulas: Record<string, string>;                    // キー集合 = 選択モデルの語彙(実行時検査)
  invariantSourceMap: Record<string, TlaInvariantSourceLocation>;
  freezeRevision: 1;
}
```

- `TlaNamedInvariant` 型 alias 自体は廃止する(残すと削除済み定数への幽霊参照になる)。公開面の変更だが、本 repo 内の消費者は tlc-toolchain.ts(:4/:9 の import、:475-476/:511-512)とテストのみで同 PR 追随できる(最小変更の範囲内 — tlc-toolchain 側は `string` として扱えばよい)。

### 4.2 内部関数の語彙引数化(消費者 :359 / :405 / :464 / :521 / :538 / :553-554 / :575)

定数参照を全て引数経由へ切り替える。計算式・走査規則は一字不変:

- `invariantMap(source, invariants: readonly string[])`(:357-364)— `invariants.map(...)` へ。`missing invariant formula` の throw 条件不変。
- `invariantRhs(source, name, invariants)`(:402-411)— 後続 invariant 探索の候補集合を引数から取る。`Spec ==` 終端探索不変。
- `generateFrozenTlaModelFromSource(source, input, invariants)`(:447-491 周辺)— profileIdentity の計算入力(TLA_VOTERS 等)は不変。formulas / sourceMap を `invariants` から構築。
- `createFrozenTlaModelReceipt`(:513-527)— `invariantSourceMap` の再構築ループを bundle のキー集合(Object.keys)または同じ `invariants` で回す。**receipt のキー集合は語彙集合に一致する**ことが契約。
- `invariantReceiptShapeError` / `validateFrozenTlaModelReceipt`(:534-587)— closed-set 検査(:553-554)と shape/location 検査(:538 / :575)の期待キー集合を語彙引数から取る。`exactPlainObject` の semantics は不変。

### 4.3 generateFrozenTlaModel の選択結線(FormalElection 明示選択)

現行 :493-500 は `loadVerifiedTlaSource()` を呼ぶ。u2 の改名・複数形化に伴い:

```ts
export function generateFrozenTlaModel(input: { publicContractIdentity: string }): FrozenTlaModelBundle {
  // ... 入力検査 :494-496 不変 ...
  const sources = loadVerifiedTlaSources();
  if (!sources.ok) throw toTlaModelHarnessError(sources.error);
  const selected = selectVerifiedModel(sources.value, "FormalElection"); // frozen model は FormalElection 固定(ADR-10)
  if (!selected.ok) throw toTlaModelHarnessError(selected.error);
  const invariants = namedInvariantsFor(selected.value.model);            // map 語彙が唯一の源(ADR-6)
  if (!invariants.ok) throw toTlaModelHarnessError(invariants.error);
  return generateFrozenTlaModelFromSource(selected.value, input, invariants.value);
}
```

- `"FormalElection"` のリテラルは**意図的な固定**であり、ADR-10 の「frozen モデルは FormalElection 語彙のまま」の具現化である。コメントで明示する(一般化漏れではない)。
- 語彙の出所がコード定数から map 宣言へ変わるだけで、**供給される値は一字一致**(§1.1)— したがって modelIdentity / receipt identity は前後で byte 一致する(u3 AC1、ADR-10 の入力列挙どおり vocabulary は receipt 計算の入力に入らず、receipt の中身を成す formulas/sourceMap のキー・値も同一)。
- `loadVerifiedTlaSource` / `VerifiedTlaSource` の import(:1-7)は u2 の改名に追随(`loadVerifiedTlaSources` / `VerifiedModelSource` + `selectVerifiedModel`)。
- `toTlaModelHarnessError`(:427-445)の扱うエラー union に u2 の `ModuleDepsError` が加わる場合の追随は u2 側の責務で確定済み(u2 domain-entities §5)。本 Unit は新たなエラー種を追加しない。

### 4.4 語彙解決関数の配置

`namedInvariantsFor`(§2.2)は tla-arm.ts に置く(component-methods C4 どおり)。`ModelMapModel` 型は tla-model-map.ts から import する。tla-arm が model-map.json を**直接読むことはない** — 受け取るのは parse 済みの宣言オブジェクトのみ(component-dependency 規則)。

## 5. byte-pin の要求モデル選択一般化(run-model-check-source.ts、C5)

### 5.1 bindRequestedModel(component-methods C5 どおり)

```ts
function bindRequestedModel(
  sources: VerifiedTlaSources,
  requestedName: string,
  modelPath: string,
  cfgPath: string,
  readBytes: (path: string) => Uint8Array, // dependencies 注入の既存シームを通す
): Result<VerifiedModelSource, ModelLoadError | SourceDriftError>;
```

振る舞い(現行 :118-127 の semantics をモデル単位へ移すだけ):

1. `selectVerifiedModel(sources, requestedName)` — 未登録名は `MODEL_MAP_INVALID` 明示失敗(u2 BR-S3、u3 AC3)。
2. 要求 model/cfg のバイトを読み(現行 :109-121 の読込・失敗分類を流用)、選択モデルの `moduleBytes` / `cfgBytes` と `sameBytes` 照合。不一致は従来どおり `sourceDrift(modelPath, "model bytes differ from the verified U1 source")` / cfg 同文 — **メッセージ文字列も変えない**(既存 red ケースの期待値保護)。
3. `publicContractIdentity` = `sha256(selected.model.entries の sha256 を "\n" join)`(:129-131 の計算式不変。`canonical.value.executionModel.entries` → `selected.model.entries` への参照変更のみ)。

### 5.2 loadRunModelCheckSource の改訂後フロー

```ts
export function loadRunModelCheckSource(modelPath, cfgPath, dependencies = DEFAULT_SOURCE_DEPENDENCIES)
    : Result<RunModelCheckSource, TlaModelPipelineError> {
  const sources = loadVerifiedTlaSources();
  if (!sources.ok) return sources;
  // verifiedPath / dirname 共有検査 / bytes 読込は現行 :97-121 不変
  const requestedName = basename(model.value, ".tla"); // 現行 :141 の導出を前段へ移動
  const selected = bindRequestedModel(sources.value, requestedName, modelPath, cfgPath, dependencies.readBytes);
  if (!selected.ok) return selected;
  const publicContractIdentity = createHash("sha256")
    .update(selected.value.model.entries.map(({ sha256 }) => sha256).join("\n")).digest("hex");
  const bundle = generateFrozenTlaModel({ publicContractIdentity }); // frozen receipt は FormalElection 固定(ADR-10)
  const vocabulary = traceVocabularyFor(selected.value.model);       // §2.3-4。語彙省略は明示失敗
  if (!vocabulary.ok) return vocabulary;
  return { ok: true, value: { source: selected.value, vocabulary: vocabulary.value,
    modelReceipt: createFrozenTlaModelReceipt(bundle), modelPath: model.value,
    cfgPath: cfg.value, workspaceRoot: dirname(model.value), moduleName: requestedName } };
}
```

- `RunModelCheckSource.source` の型は `VerifiedTlaSource` → `VerifiedModelSource` へ追従(u2 §3.4 の確定どおり)。`vocabulary: TraceVocabulary` フィールドを追加し、toolchain 正規化の入力語彙として配給する(services S4-(3))。
- **frozen receipt の生成は本 Unit では FormalElection 語彙固定のまま**(§4.3)。非 FormalElection モデルに対する loadRunModelCheckSource は byte-pin 選択と語彙解決までは一般化されるが、modelReceipt は従来どおり generateFrozenTlaModel 由来である — MirrorLifecycle 向けの完全な証跡経路の成立は u5 の設計事項(§3.5 の緊張と同じ引き渡し)。u3 AC3 が要求するのは「byte-pin が要求モデル名で選択され、未登録要求が明示失敗し、照合 semantics が不変」までであり、receipt の per-model 化は要求されていない。
- FormalElection を要求した場合の戻り値(source bytes / receipt / moduleName)は現行と byte 一致する(u3 AC1)。

## 6. model-map.json への vocabulary 追加(C8-FormalElection 面)

FormalElection エントリに次のフィールドを追加する(entries・identity 値・他エントリは一切変更しない):

```json
"vocabulary": {
  "namedInvariants": [
    "ChoiceWinner",
    "UnknownChoiceRejected",
    "ReceivedAtAxis",
    "InvalidTimestampRejected",
    "AmendSubmission",
    "UnknownRefRejected",
    "PerVoterResolution"
  ],
  "traceStateVariables": [
    "initialBudget",
    "amendBudget",
    "accepted",
    "holdMarkers",
    "holdBudget",
    "tally",
    "reexamRequired"
  ]
}
```

- 値は §1.1 の現行定数と**一字一致**(順序含む)。この pin が u3 AC1 / FR-6 の検査対象。
- MirrorLifecycle エントリへの vocabulary/auxiliaries 追記は **u4 の所有**(unit-of-work 共通契約: 同一ファイルでも別エントリのため同時編集は発生しない。u4 は u3 の map 変更を前提に追記する)。
- vocabulary フィールドは drift pin の照合対象ではない(ADR-6 の正直な限定どおり — pin が照合するのは model/cfg/aux の bytes と宣言 identity であり、vocabulary 編集は identity 値を動かさない)。語彙値の保護は t404 の pin テスト(§5.1)で担う。

## 7. 不変性の固定(ADR-10 / FR-6 の arm/toolchain 側保護)

- **frozen model receipt identity は不変**: 入力は (1) frozen bytes(FormalElection 語彙、map 移管後も値一字一致)と (2) publicContractIdentity(計算式不変)のみ。vocabulary は receipt 計算の入力に入らない(ADR-10)。u3 AC1 の pin は据置き・変化時に落ちる。
- **TLC 出力 grammar の semantics は不変**: ライフサイクル検証(:390-416)・統計/深度 payload・完了マーカー regex(:448-451)・反例ヘッダ grammar(:472-473 / :508-509)には触れない。一般化は「語彙値の出所」と「モジュール名の埋込み」のみ。
- **失敗分類の不変**: 語彙不一致・未知 invariant・変数列不一致は全て従来どおり `failed("GRAMMAR", …)`(component-methods C4)。新しい失敗 kind/code は追加しない。
- **FormalElection の TLC 解析結果は不変**: 供給語彙が一字一致のため、同一入力に対する parseTlcOutput174 の出力(探索結果・反例 identity を含む)は前後で一致する。counterexampleIdentity の計算式(canonicalIdentity …tlc.counterexample.v1、:484 / :525)は不変。

## 8. テスト計画(u3 所有面)

unit-of-work テスト割当節どおり: 新規 **t404** + `t-formal-verif-tlc-toolchain.test.ts` / `t-formal-verif-tlc-output.test.ts`(語彙供給経由への追従)+ `t-formal-verif-run-model-check-source.integration.test.ts`(byte-pin 選択追従)+ `t-formal-verif-tla-model-loader.integration.test.ts` :392(文字列検査の追随)。

### 8.1 新規 t404(`tests/unit/t404-tla-vocabulary-supply.test.ts` — 単体、u3 AC1/AC2)

- **FormalElection 語彙 pin(AC1)**: 実 model-map.json を parse し、FormalElection エントリの `vocabulary.namedInvariants` / `vocabulary.traceStateVariables` が §1.1 の7+7件と**順序含め一字一致**することを deep-equal で assert。本テストが「語彙を変更したら落ちる」検査として機能する(FR-6 — drift pin が語彙を覆わないため、この pin が語彙の唯一の機械的保護)。
- **frozen receipt 不変 pin(AC1)**: 固定 `publicContractIdentity`(`"a".repeat(64)` 等)に対する `generateFrozenTlaModel` → `createFrozenTlaModelReceipt` の `modelIdentity` / `namedInvariantFormulas` / `invariantSourceMap` が、変更前の既存テスト(tlc-toolchain 系・統合系)と同一の生成経路で一致することを assert(receipt 入力列挙の不変、ADR-10)。既存の identity 定数 pin(統合 :380-384)が期待値不変で通ることも併せて確認。
- **MirrorLifecycle 語彙の正しさ(fixture 駆動)**: §1.2 の値を持つ fixture `ModelMapModel`(MirrorLifecycle 宣言は u4 所有のため実 map は使わない)に対し、`traceVocabularyFor` が moduleName `MirrorLifecycle` + 3 invariant + 3 変数を返すこと。その語彙で構築したラベル regex が `<Close line …, col … to line …, col … of module MirrorLifecycle>` を受理し、`of module FormalElection>` を受理しないこと(逆方向も: FormalElection 語彙の regex が MirrorLifecycle ラベルを拒否)。3 変数のトレース行(`/\ receipts = …` 等)が変数列検査を通ること。
- **vocabulary 省略 red(AC2、落ちる実証)**: vocabulary を持たない fixture モデルに対し `namedInvariantsFor` / `traceVocabularyFor` が kind MODEL_LOAD(code MODEL_MAP_INVALID)の明示失敗を返すこと。silent fallback(空配列・既定値)を返さないこと。
- **コード既定値削除の grep ガード**: tla-arm.ts のソースに `TLA_NAMED_INVARIANTS` が残余参照として残らないこと、tlc-toolchain.ts のソースに `TRACE_STATE_VARIABLES` が残らないこと(既存の :387-393 型のソース文字列検査と同型)。
- **未知 invariant 拒否の保存(AC2)**: MirrorLifecycle 語彙のもとで TLC が FormalElection の invariant 名(例: `ChoiceWinner`)を報告した反例入力が `failed("GRAMMAR", …)` になること(和集合緩和の偽陰性を防ぐ pin — 従来 :475/:511 と同じ分類)。

### 8.2 t-formal-verif-tlc-output.test.ts の改訂(語彙供給経由への追従)

- `parseTlcOutput174` の入力に `vocabulary` 必須フィールドが増えるため、`context` ヘルパ(:95-100)へ FormalElection の `TraceVocabulary` を追加する。**値の出所は実 map(parse 済み)から `traceVocabularyFor` で解決**し、テスト内に語彙リテラルを複製しない(複製すると t404 の pin と二重管理になる)。
- トレース行の変数列(:66-74)・ラベル文字列(`of module FormalElection>`)・反例 invariant 名(`InvalidTimestampRejected`)の期待値は**一切変更しない** — 供給語彙が一字一致であることの実証として、全既存ケースが期待値不変で通ることがそのまま AC1 の裏付けになる。
- `expectedModuleName` / `expectedModulePath`(:95-96)は `hasFrozenModelOutputBinding` 不変のため据置き。

### 8.3 t-formal-verif-tlc-toolchain.test.ts の改訂(最小)

- 本ファイルは語彙定数を直接参照していない(実測 :1-285 — generateFrozenTlaModel / createFrozenTlaModelReceipt 経由のみ)。`TlaNamedInvariant` 型の廃止・定数削除に伴う import 修正が必要になった場合のみ追随し、**テストケースの期待値は不変**を原則とする(unit-of-work テスト割当「期待語彙値は不変」)。:178-180 の frozen model 生成は §4.3 の結線変更後も同一 publicContractIdentity に対し同一 receipt を返すため不変で通るはず — 落ちた場合は語彙値の不一致を疑う(AC1 pin 違反)。

### 8.4 t-formal-verif-run-model-check-source.integration.test.ts の改訂(byte-pin 選択追従、u3 仕分け)

- `loadRunModelCheckSource` の FormalElection 経路は戻り値 byte 一致(§5.2)のため、既存ケースは `source` の型追従(VerifiedModelSource のフィールド名)のみで期待値不変。
- **未登録モデル要求 red の追加(AC3)**: 登録にないモデル名のパス(例: fixture 内の `NoSuch.tla`)を要求した場合に kind MODEL_LOAD の明示失敗になること。
- **byte-pin 選択の実証(AC3)**: 2 モデル登録 fixture で MirrorLifecycle 相当の model/cfg を要求した場合に、そのモデルの verified source と照合されること(誤バイト注入で従来どおり SOURCE_DRIFT 赤 — 照合 semantics 不変)。
- fixture 構成は u2 の統合 fixture(aux 宣言補正済み map、u2 §5.3)を前提に、u3 で FormalElection vocabulary を含む map へ追随させる(u3 の map 変更と同じ形)。

### 8.5 t-formal-verif-tla-model-loader.integration.test.ts :392 の文字列追随

- :392 の `expect(adapterSource).toContain("loadVerifiedTlaSource()")` は、u2 の改名後 `"loadVerifiedTlaSources()"` は `"loadVerifiedTlaSource()"` を部分文字列として**含まない**(`s()` の `s` が挟まる)ため落ちる。u3 で tla-arm.ts が `loadVerifiedTlaSources()` 呼出へ書き換わる(§4.3)のに合わせ、期待文字列を `"loadVerifiedTlaSources()"` へ改訂する(u2 §6 オープン事項 (b) の確定: **u3 で追随**。本テストは u2 仕分けだが、tla-arm.ts の書換え主体が u3 であるため文字列追随は u3 が運ぶ — 検査の意図「loader 経由でソースを取得し埋込み fallback がない」は不変)。

### 8.6 patch gate

変更行 0-hit 不許容(team-practices Testing Posture)。上記テストは修正と同 PR で運ぶ(u3 AC4)。`bun run typecheck` / `bun run lint` / 既存テスト green。

## 9. 設計上の留意(下流 Unit への引き渡し・27 ファイル仕分け)

### 9.1 本 Unit が触るファイル(unit-of-work u3 所有 + テスト仕分けの確定)

| 区分 | ファイル | 変更内容 |
|---|---|---|
| 所有(実装) | `plugins/formal-model-check/tools/tla-arm.ts` | TLA_NAMED_INVARIANTS 削除、namedInvariantsFor 新設、語彙引数化(§4)、loader 複数形追随 |
| 所有(実装) | `plugins/formal-model-check/tools/tlc-toolchain.ts` | TRACE_STATE_VARIABLES 削除、TraceVocabulary / traceVocabularyFor 新設、6 箇所の一般化(§3) |
| 所有(実装) | `plugins/formal-model-check/tools/run-model-check-source.ts` | bindRequestedModel(byte-pin 選択)、語彙配給(§5) |
| 所有(宣言) | `specs/tla/model-map.json` | FormalElection エントリへ vocabulary 追加のみ(§6) |
| テスト新規 | `tests/unit/t404-tla-vocabulary-supply.test.ts` | §8.1 |
| テスト改訂(u3 仕分け) | `tests/unit/t-formal-verif-tlc-output.test.ts` | §8.2(語彙供給追従、期待値不変) |
| テスト改訂(u3 仕分け) | `tests/unit/t-formal-verif-tlc-toolchain.test.ts` | §8.3(import 追随のみ、期待値不変) |
| テスト改訂(u3 仕分け) | `tests/integration/t-formal-verif-run-model-check-source.integration.test.ts` | §8.4(byte-pin 選択) |
| テスト改訂(文字列追随) | `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` :392 | §8.5 |

unit-of-work テスト割当節の但し書きどおり、「維持」仕分けの実走系(tlc-runtime / run-model-check-real 等)が語彙供給切替で落ちる場合は「維持」ではなく u3 改訂へ再仕分けし、code-summary に記録する。

### 9.2 下流への引き渡し

- **u4 への供給**: MirrorLifecycle vocabulary の確定値(§1.2)と TraceVocabulary 契約。u4 は map の MirrorLifecycle エントリへ vocabulary(3 invariant + 3 変数)を宣言する。タプル順の最終確定は u5 の実測(§1.2 の留意)。
- **u5 への供給**: `traceVocabularyFor` / `TraceVocabulary` / 語彙必須の `TlcOutputInput`、および「parseTlcOutput174 の frozen binding が FormalElection スコープのまま」という制約(§3.5)— MirrorLifecycle の TLC 証跡正規化経路は u5 が設計する。u5 の CI 駆動は「語彙は model-map の vocabulary から供給」(services S2-2)の前提で組める。
- **u2 との境界**: loader 側の型・選択 API は u2 が供給済み(本 Unit は消費のみ)。u2 設計 §3.4 の結線(1)〜(5)は本設計 §5.2 で確定。
- 新規外部依存なし(NFR-4)。生成ツリー(dist/ 等)は本 Unit の最後に `bun scripts/package.ts` 再生成で追随(手編集禁止)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:43:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 minors closed: story-map cited as consumed; component-methods C4 amended to ModelLoadError consistently; iteration 2 no findings.

### Findings

- None
