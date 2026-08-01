# Business Logic Model — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): unit-of-work(u2 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — user-stories スコープ外のため stories 未生成、FR 写像がストーリー代替), requirements(FR-2 / FR-4 / FR-6, NFR-1/2/4), components(C3), component-methods(C3 / C5 節), services(S1 / S3 / S4), decisions(ADR-1 / ADR-2 / ADR-4 / ADR-7 / ADR-10), u1-schema-resolver functional-design(business-logic-model §2.6 宣言照合 semantics, domain-entities §6 ModuleDeclarationDrift, business-rules BR-C1〜C3 / BR-R3 TLA_STANDARD_MODULES 豁免), 実測ソース(`plugins/formal-model-check/tools/tla-model-loader-internal.ts` 全文 — verifyRegisteredAssets :252-275 / locateAssets :165-183 / loadVerifiedTlaSourceInternal :279-338, `tla-model-loader.ts` :17-19, `run-model-check-source.ts` :118-123 / :129-131, `tests/unit/t-formal-verif-tla-model-loader.test.ts` :10-13, `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` 全文)

unit-of-work-story-map は FR-1〜FR-6 → Unit の写像表(user-stories 未生成の代替)であり、u2 帰属は FR-2(loader 側検出点)/ FR-4(実行選択)/ FR-6(pin 主たる実証)で本設計の FR 帰属と一致する。フロントエンド要素はなく frontend-components.md は生成しない。

## 0. 変更の輪郭

現行 loader(tla-model-loader-internal.ts)は「固定1モデル(TLA_EXECUTION_MODEL_NAME)だけを検証して単一 `VerifiedTlaSource` を返し、他登録モデルは drift 監視のみ(verifyRegisteredAssets :252-275、:258 の skip)」という構造。本 Unit はこれを SD Q1=A の裁定どおり「**全登録モデルを同じ深さで検証し、全モデルの検証済みソース配列を返す**」構造へ改訂する。改訂の骨子:

1. `verifyRegisteredAssets` を「全モデルの model/cfg/**aux** identity 照合」へ拡張(実行モデル skip 撤廃 + aux 照合の新設)。
2. u1 の `resolveAuxiliaryModules` + 宣言照合(u1 §2.6)を全登録モデルに実行し、宣言漏れ・過剰宣言を loader 側検出点で赤化(RA Q2=A 検出点①)。
3. 戻り値を `VerifiedTlaSources`(全モデル配列)へ改訂し、`selectVerifiedModel` による名前選択を新設。`TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH` の固定導出を撤廃。
4. 無引数 wrapper(tla-model-loader.ts)の意味を「全登録モデルを検証して返す」へ改訂(ADR-4。無引数ピン :10-13 の改訂は FR-4 で裁定確定済み)。
5. `run-model-check-source.ts` の byte-pin(:118-123)を「要求モデル名で選択 → 選択モデルの verified source と照合」へ一般化(C5 の loader 側基盤 — 実装本体は u3 所有だが、u2 が供給する型・選択 API の前提をここで固定する)。

## 1. verifyRegisteredAssets の全モデル・aux 照合拡張

### 1.1 実行モデル skip の撤廃と「全資産の二重照合」の解消

現行の検証構造は非対称である: 実行モデルは本体(:302-319)で model/cfg を identity 照合し、非実行モデルは verifyRegisteredAssets(:257-273)で照合する。改訂後は**全登録モデルが「実行され得るモデル」**になるため、この非対称を解消し、model/cfg/aux の identity 照合を全モデルに対して verifyRegisteredAssets 系の単一経路へ統一する。アルゴリズム(現行 :259-272 のループを基盤に拡張):

```
for model of modelMap.models:                    // skip なし(全件)
  assets = [
    { recorded: model.model, kind: "MODEL", domain: "amadeus.formal-verif.tla.module.v1" },
    { recorded: model.cfg,   kind: "CFG",   domain: "amadeus.formal-verif.tla.cfg.v1" },
    ...(model.auxiliaries ?? []).map(aux =>
      { recorded: aux, kind: "MODEL", domain: "amadeus.formal-verif.tla.module.v1" }),
  ]
  for asset of assets:
    path     = verifyAssetPath(root, asset.recorded.path, asset.kind, fs)   // specs/tla 境界・symlink 拒否(現行 :129-163 不変)
    bytes    = readAsset(path, asset.recorded.path, asset.kind, fs)         // 非空検査(現行 :185-199 不変)
    identity = sourceIdentity(bytes, asset.recorded.path, asset.domain)     // UTF-8 fatal + canonicalIdentity(現行 :201-212 不変)
    if identity !== asset.recorded.identity:
      return drift(asset.recorded.path, "registered asset identity differs from model map")
```

- aux の identity domain は **model と同型の `amadeus.formal-verif.tla.module.v1`**(ADR-1 / RA Q1=A、services S3 の契約表どおり)。aux は TLA モジュールなので MODEL kind の検査経路(verifyAssetPath / readAsset)をそのまま通す。aux 専用の新しい検査・エラーコードは追加しない。
- 照合と同時に、各モデルの検証済み bytes / source / identity を `VerifiedModelSource` の素材として蓄積する(§3)。**2 回読まない**: 現行は「登録資産の読込・identity 計算」と「実行モデルの bytes 返却」が別経路で、改訂後は全モデルが返却対象になるため、読込結果(bytes / TextDecoder 済み source / identity)をモデルごとに保持して戻り値へ流用する。
- aux identity の不一致も `drift(...)`(SOURCE_DRIFT)で fail-closed(NFR-2)。model/cfg と同じエラー種で、detail は「registered asset identity differs from model map」で統一し relativePath が aux の宣言 path を指す。

### 1.2 検証順序の再編(fail-fast の維持)

現行 loadVerifiedTlaSourceInternal(:279-338)の順序は (a) locate → (b) 実行モデル bytes 読込 → (c) map parse → (d) 実行モデル identity 照合 → (e) verifyRegisteredAssets → (f) verifyImplementationEntries。改訂後の順序(component-methods C3 の検証順序どおり):

1. **repository root 解決 + map 読込・parse**: locateAssets は現行 TLA_MODEL_PATH / TLA_CFG_PATH / TLA_MODEL_MAP_PATH の3資産を固定検証しているが、改訂後は model/cfg パスがモデルごとに異なるため、locateAssets の責務を **root 解決 + map パス検証** に縮小する(個別 model/cfg のパス検証は §1.1 の各モデルループ内で行う)。既存の MODEL_MISSING / CFG_MISSING 系の失敗分類は「最初のモデルの最初の資産」で発火する形を維持し、統合テストの既存分類ケース(:118-165)が意味を保つようにする(詳細は §5 テスト計画)。
2. **全モデルの model/cfg/aux identity 照合**(§1.1)。
3. **全モデルの推移解決と宣言集合の双方向差分検査**(§2)。
4. **implementation entries 照合**(verifyImplementationEntries :214-247 不変 — 全モデルの entries を flatMap する現行 semantics を据置く)。

いずれかの段階の失敗で打ち切る fail-fast は不変。

## 2. 宣言-vs-解決の loader 側照合(RA Q2=A 検出点①)

### 2.1 結線

u1 が提供する `plugins/formal-model-check/tools/tla-module-deps.ts` から `resolveAuxiliaryModules` と宣言照合ヘルパ(u1 §2.6、ModuleDeclarationDrift を返す比較)を import する。`readModule` 注入シームには loader 側でアダプタを噛ませる:

- リゾルバの `readModule(name)` は「specs/tla 内の `<Name>.tla` の UTF-8 ソース文字列」を返す契約(u1 component-methods C2)。loader 側では §1.1 で読込済みの資産(各モデルの model source と検証済み aux source)を優先的に返し、未読込の aux(= 宣言にないが解決で現れたモジュール)は `verifyAssetPath` + `readAsset` + UTF-8 decode(fatal)でその場読みする。読取系の失敗は `ModuleDepsError`(`MODULE_DEP_UNRESOLVED`)へ変換して伝播させ、loader の `ModelLoadError` 体系と混線させない(リゾルバのエラー型は u1 が定義済み — 本 Unit の戻り型 union にそのまま含める、domain-entities.md §5)。
- **identity 照合済み bytes を解決にも使う**ことで、読込の二重化と「照合した bytes と解決したソースが別物」という TOCTOU 的な齟齬を構造的に排除する(単一読込原則、§1.1 と同じ)。

### 2.2 照合 semantics(u1 BR-C1 の消費)

各登録モデルについて:

- **declared** = `model.auxiliaries` の path から basename の拡張子を除いたモジュール名集合(省略は空集合)。
- **resolved** = `resolveAuxiliaryModules(model.name, readModule)` の出力(自己除く・ソート済み・重複排除、u1 BR-R5)。
- **missing = resolved − declared**(宣言漏れ)/ **extra = declared − resolved**(過剰宣言)。**どちらか一方でも非空なら不一致**。

不一致時は `drift(...)`(SOURCE_DRIFT)で明示失敗する。relativePath は当該モデルの model path(`specs/tla/<Name>.tla`)、detail は missing / extra を区別した人間可読診断とし、declared / resolved 両集合を含める(u1 BR-C3 の「detail に両集合」義務の loader 側具現化)。例: `declared auxiliaries drift for model MirrorLifecycle; missing=[MirrorLifecycleCore] extra=[] declared=[...] resolved=[...]`。

リゾルバ自体の失敗(MODULE_DEP_UNRESOLVED / CYCLE / OUT_OF_BOUNDS)は drift ではなく `ModuleDepsError` としてそのまま伝播する — 「宣言と解決がズレた」(SOURCE_DRIFT)と「解決そのものが成立しない」(MODULE_DEPS)は別の欠陥クラスであり、呼出側が区別できるよう error union を分離する。

### 2.3 現行登録モデルに対する期待動作

- MirrorLifecycle: 現行 map には `auxiliaries` 宣言がない(u4 が追記)。リゾルバは `["MirrorLifecycleCore"]` を解決するため、**u2 単体の時点では missing = {MirrorLifecycleCore} で loader が赤になる** — これは u2 AC1(declaration-mismatch red)の実ファイル実証そのものであり、u4 の宣言追記で緑に転じる設計(u4 AC3 と表裏)。u2 のグリーン経路テストは aux 宣言を含む fixture map または FormalElection(EXTENDS が標準モジュールのみで resolved = declared = ∅)で構成する。
- FormalElection: EXTENDS は標準モジュールのみ(u1 BR-R3 の TLA_STANDARD_MODULES 豁免で追跡外)のため resolved = ∅、宣言省略 → declared = ∅ で一致。本 Unit の変更で FormalElection の loader 検証結果は不変(FR-6 の足場)。

## 3. 戻り値の改訂: VerifiedTlaSource → VerifiedTlaSources

### 3.1 新しい戻り型(無引数ピン改訂の中身)

```ts
export interface VerifiedModelSource {
  readonly model: ModelMapModel;          // 宣言本体(entries / auxiliaries / vocabulary 含む)
  readonly moduleBytes: Uint8Array;
  readonly cfgBytes: Uint8Array;
  readonly moduleSource: string;
  readonly cfgSource: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  readonly auxIdentities: readonly ModelMapAssetIdentity[]; // 実測した aux identity(宣言と一致確認済み)
}

export interface VerifiedTlaSources {
  readonly models: readonly VerifiedModelSource[]; // 宣言順(= parser 強制の名前昇順、決定的)
  readonly modelMap: ModelMap;
}
```

- `models` の順序は model-map.json の models 配列の宣言順をそのまま使う。parser が一意・名前昇順を強制するため宣言順 = 名前昇順の**決定的順序**であり、ソートを追加しない(component-methods C3 コメントどおり)。
- 旧 `VerifiedTlaSource` の `executionModel` 単一フィールドは**撤廃**する。「実行モデル」という概念は loader の責務から消え、選択は全て呼出側の `selectVerifiedModel` へ移る(ADR-4)。
- 旧 `VerifiedTlaSource` 型と旧 singular loader は**即時廃止せず、期間限定の互換 shim として残す**(Finding-1 裁定、選択肢 (a))。呼出側の正確な列挙: `tla-model-loader.ts`(:17-19、u2 所有)、`run-model-check-source.ts`(:15/:95、u3 所有)、`tla-arm.ts`(production wrapper 呼出、統合テスト :387-393 の grep 対象、u3 所有)の3箇所。u3 は DAG 上 u2 に依存しない(u1 のみに依存)ため着順の保証がなく、u2 が singular export を削除すると u2 着弾〜u3 着弾の間で typecheck / 既存テストが壊れ、u2 AC4(既存テスト green)に違反する。よって:
  - `loadVerifiedTlaSourceInternal` / `VerifiedTlaSource` / `loadVerifiedTlaSource()` の旧 singular 面は**旧 semantics のまま維持**し(u3 着弾までの暫定)、新規の複数形面(`loadVerifiedTlaSourcesInternal` / `VerifiedTlaSources` / `selectVerifiedModel` / `loadVerifiedTlaSources()`)を**追加**する形で実装する。旧面の内部実装は新しい全モデル検証パイプラインの上に「FormalElection を選択して旧型へ射影する」薄い shim として再構成してよい(検証 semantics は新パイプラインに一本化し、旧戻り型だけを互換のために残す — 二重の検証実装は持たない、ADR-2 の単一実装原則と同じ趣旨)。
  - **除去条件(shim の time-box)**: u3 が `run-model-check-source.ts` と `tla-arm.ts` を複数形 API へ追随させた時点で旧 singular export を削除する。u3 の component-methods C5(`bindRequestedModel`)がこの shim を前提としないことは上流設計で確定済みのため、除去は u3 の範囲内で完結する。u3 の code-generation 冒頭で shim 削除を作業項目に含めるよう、本ファイル §6 と memory.md に引き継ぐ。
  - 無引数ピン(:10-13)の改訂はこの shim 方針と整合させる — export 一覧の期待値は **`["loadVerifiedTlaSource", "loadVerifiedTlaSources"]`(ソート順)** へ改訂し、shim 存在期間中の production seam(両関数とも引数なし・注入なし)をピンで検査する。u3 で shim 除去時に `["loadVerifiedTlaSources"]` へ再改訂する(ピンの2段階改訂 — 各段階が落ちる検査として機能する)。
- `loadVerifiedTlaSourcesInternal(moduleUrl, fs?)` のシグネチャは現行の internal seam を踏襲し、戻り値のみ `VerifiedTlaSources` + エラー union に `ModuleDepsError` を追加する。

### 3.2 selectVerifiedModel(選択絞り込み)

```ts
export function selectVerifiedModel(
  sources: VerifiedTlaSources,
  name: string,
): Result<VerifiedModelSource, ModelLoadError>;
```

- `name` が `sources.models` に存在しない場合は `MODEL_MAP_INVALID`(kind MODEL_LOAD)の明示失敗。silent fallback なし(NFR-2、u2 AC2)。detail は `model map does not register the requested model <name>` 系。
- 名前の検査は「登録済みか」のみ。MODEL_NAME 文法検査は map parse 側(u1)が保証済みのため二重に行わない。
- 本関数は loader 無引数フローの外で使う純粋関数 — ファイル I/O を持たない。

### 3.3 無引数 wrapper(tla-model-loader.ts)の改訂

```ts
export function loadVerifiedTlaSources(): Result<VerifiedTlaSources, TlaModelPipelineError | ModuleDepsError> {
  return loadVerifiedTlaSourcesInternal(import.meta.url);
}
```

- **新規関数名は複数形**とする(戻り型の意味が変わるため同名維持は呼出側の誤解を招く)。旧 singular `loadVerifiedTlaSource()` は shim として併存する(Finding-1 裁定、§3.1)ため、無引数ピン :10-13 の期待 export 一覧は shim 期間中 `["loadVerifiedTlaSource", "loadVerifiedTlaSources"]`、shim 除去(u3)後 `["loadVerifiedTlaSources"]` への2段階改訂(FR-4 で裁定確定済みのピン改訂 — §5.2)。
- production seam の性質(引数なし・注入なし、`import.meta.url` 固定)は不変 — ピンが検査する「実行時入力で root/fs を選べない」性質は改訂後も維持される。

### 3.4 呼出側の適応(run-model-check-source.ts、u3 実装の前提)

u2 が供給する型を前提に、u3(C5)が行う byte-pin 一般化の結線をここで固定する(services S4):

1. `loadVerifiedTlaSources()` で全モデル検証。
2. 要求 `modelPath` の basename からモデル名を導出(`specs/tla/<Name>.tla` 形・fail-closed、u3 責務)。
3. `selectVerifiedModel(sources, name)` で選択(未登録名は明示失敗)。
4. 要求バイトを選択モデルの `moduleBytes` / `cfgBytes` と `sameBytes` 照合 — **照合 semantics(:118-123)は不変で、照合相手が単一 canonical から選択モデルへ変わるだけ**。
5. `publicContractIdentity`(:129-131)は `selected.model.entries` の sha256 列から計算。**計算式は一切変更しない**(ADR-10: receipt identity の入力は frozen bytes + publicContractIdentity のみ、FormalElection では値不変)。

`RunModelCheckSource.source` の型は `VerifiedTlaSource` → `VerifiedModelSource` へ追従する(u3 実装面。u2 は型供給のみ)。

## 4. 不変性の固定(ADR-10 / FR-6 の loader 側保護)

- **canonicalIdentity 計算式・domain 文字列(model/cfg)は不変**(ADR-1 は aux の domain 選択のみ)。
- **verifyAssetPath / readAsset / sourceIdentity / verifyImplementationEntries の semantics は不変**(aux が同じ経路を通るだけ)。
- **FormalElection の検証結果は不変**: model/cfg identity 照合・entries 照合は同じ bytes に対して同じ計算を行い、aux 解決は resolved = declared = ∅ で発火しない(§2.3)。
- **frozen model receipt の入力列挙は不変**: (1) `generateFrozenTlaModel` が生成する frozen bytes(FormalElection 語彙固定、u2 非接触)、(2) `publicContractIdentity` = sha256(entries sha256 join)(run-model-check-source.ts:129-131、u2 非接触)。loader の戻り型変更は receipt 計算の入力に入らないため、**FormalElection の receipt identity は本 Unit の前後で byte 一致する**(u2 AC3 の pin 対象)。
- `TLA_EXECUTION_MODEL_NAME` 参照の撤廃範囲は loader 内部に限定する。tla-model-map.ts 側の定数 export 自体は u2 では削除しない(他消費者の有無は u3/u5 で確認・撤廃 — スコープ外の波及を本 Unit に持ち込まない)。

## 5. テスト計画(u2 所有面)

unit-of-work テスト割当節どおり: 新規 **t403** + `t-formal-verif-tla-model-loader.test.ts`(:10-13 ピン改訂)+ `t-formal-verif-tla-model-loader.integration.test.ts`(全モデル化追従)。`t-formal-verif-run-model-check-source.integration.test.ts` は u3 改訂仕分けのため本 Unit では触らない。

### 5.1 新規 t403(`tests/unit/t403-tla-loader-generalization.test.ts` — loader 単体、u2 AC1/AC2)

注入 fs + fixture map で `loadVerifiedTlaSourcesInternal` を駆動する(統合テストの fixture 手法と同型だが単体配置 — t402 の合成ソース手法に倣う)。ケース:

- **全モデル配列契約(緑)**: 2 モデル登録 fixture(FormalElection 相当 + aux 宣言済み MirrorLifecycle 相当)で `models.length === 2`、宣言順(名前昇順)が保持され、各要素の moduleIdentity / cfgIdentity / auxIdentities が宣言値と一致する。
- **declaration-mismatch red — 宣言漏れ(u2 AC1)**: MirrorLifecycle 仮宣言で `auxiliaries` を省略(または Core を含まない)した map + INSTANCE を含むソース → `SOURCE_DRIFT`、detail に missing 側が現れる。
- **declaration-mismatch red — 過剰宣言(u2 AC1)**: 宣言に存在しない(解決されない)aux を持つ map → `SOURCE_DRIFT`、detail に extra 側が現れる。双方向の別ケース化必須(片方向だけで「双方向検出」を主張しない)。
- **aux identity mismatch red**: 宣言 aux identity と実ファイルの canonical identity が不一致 → `SOURCE_DRIFT`(relativePath が aux path)。
- **resolver 失敗の伝播**: 循環参照 fixture → `ModuleDepsError`(kind MODULE_DEPS)がそのまま返る(SOURCE_DRIFT へ変換されないこと)。
- **selectVerifiedModel**: 登録名で該当要素が返る。未登録名 → kind MODEL_LOAD の明示失敗(u2 AC2、NFR-2)。
- **skip 撤廃の実証**: 旧 semantics では実行モデルの drift は本体経路・非実行モデルは登録資産経路だったが、改訂後は**どのモデルの drift も同一経路で赤**になること(全モデルループの網羅性)。

### 5.2 無引数ピン改訂(`tests/unit/t-formal-verif-tla-model-loader.test.ts` :10-13)

- :11 の export 一覧期待値を `["loadVerifiedTlaSource", "loadVerifiedTlaSources"]`(shim 期間中の2本、Finding-1 裁定)へ改訂、:12 の arity 検査は両関数とも `.length === 0` を維持(production seam 性質の不変を pin)。shim 除去(u3)時に `["loadVerifiedTlaSources"]` へ再改訂する2段階方式。
- :15-61 のエラーマッピング系ケースは ModelLoadErrorCode 列挙が不変(u2 は新コードを追加しない)のため期待値不変で通ることを確認。
- **u2 AC3 の invariance pin**: FormalElection の moduleIdentity / cfgIdentity / entries 由来の publicContractIdentity 計算が変更前後で一致することを pin として追加(統合側の EXPECTED_* 定数と同じ値 :33-34 を参照し、改訂後 loader 経由で再計算して一致を assert)。

### 5.3 統合テスト追従(`tests/integration/t-formal-verif-tla-model-loader.integration.test.ts`)

- import を `loadVerifiedTlaSources` / `loadVerifiedTlaSourcesInternal` へ追従。戻り値の shape 検査(:108-114)は `value.models` から FormalElection 要素を選んで identity を比較する形へ改訂(EXPECTED_MODULE_IDENTITY / EXPECTED_CFG_IDENTITY の値は**不変** — FR-6)。
- fixture 構成: 現行 fixture は実 map をコピーする(:71)。u2 単体時点の実 map は MirrorLifecycle の aux 宣言がないため §2.3 どおり loader が赤になる。**u2 の統合 fixture は「aux 宣言を含む補正済み map」を生成**する(createFixture 内で MirrorLifecycleCore.tla をコピーし、map へ auxiliaries を追記した上で identity を実測計算して埋める)。これにより統合のグリーン経路が成立し、赤経路(宣言漏れ)は t403 と統合の両方で実証される。
- 「fails closed when the map does not register the execution model」(:345-356)は改訂後の意味が変わる — 実行モデル概念の撤廃により「FormalElection 未登録でも loader は緑(残モデルを検証して返す)」が新 semantics。本ケースは**削除し、代わりに「models が空配列の map は MODEL_MAP_INVALID」の fail-closed ケース**へ置き換える。規則は business-rules.md BR-S6 に固定した(条件付き: u1 parser が空配列を許容する場合は loader 側ガードで明示失敗、拒否する場合は parse 段階の失敗で足り loader ガードは二重化しない — 確定は code-generation 冒頭の u1 実測、§6)。
- :327-343(非実行モデルの drift 報告)は skip 撤廃後も同じ red を期待できるためケース維持(期待値不変)。:387-393(tla-arm.ts の `loadVerifiedTlaSource()` 参照文字列検査)は **u2 では据置き** — Finding-1 裁定(選択肢 (a))により tla-arm.ts は shim 経由で旧 singular 名を呼び続けるため、:392 の期待文字列は u2 着弾後もそのまま green を維持する。u3 が tla-arm.ts を複数形 API へ追随させた時点で :392 の期待文字列を `loadVerifiedTlaSources()` へ改訂する(u3 作業項目として引き継ぐ)。

### 5.4 patch gate

変更行 0-hit 不許容(team-practices)。上記テストは修正と同 PR で運ぶ(u2 AC4)。

## 6. 設計上の留意(下流 Unit への引き渡し・オープン事項)

- **u1 依存**: import するのは `tla-module-deps.ts` の `resolveAuxiliaryModules` / 宣言照合ヘルパ / `ModuleDepsError` 系と、`tla-model-map.ts` 経由の `ModelMapModel.auxiliaries`。u1 が未実装の段階では本設計の §2 の結線部が実装不可 — u1 完了が前提(unit-of-work の依存 DAG どおり)。
- **u3 への供給**: `VerifiedTlaSources` / `VerifiedModelSource` / `selectVerifiedModel` の3型と「aux identity は model domain の canonical」契約(S3)。u3 は `VerifiedModelSource.model.vocabulary` を toolchain へ渡す経路を実装する(ADR-6 の「語彙は loader 経由で配給」規則の受け口が `VerifiedModelSource.model`)。**shim 除去の引き継ぎ(Finding-1 裁定)**: u3 は `run-model-check-source.ts` / `tla-arm.ts` を複数形 API へ追随させた時点で、旧 singular export(`loadVerifiedTlaSource` / `loadVerifiedTlaSourceInternal` / `VerifiedTlaSource`)を削除し、無引数ピンの export 期待値を `["loadVerifiedTlaSources"]` へ、統合テスト :392 の期待文字列を `loadVerifiedTlaSources()` へ再改訂する(u3 作業項目)。
- **u4 への供給**: 宣言照合 semantics(u1 BR-C1)の loader 側具現化としての detail 形式。u4 の sensor/updateModelMap は同じ比較結果を別エラー体系で消費するが、集合計算は u1 単一実装を共有する(ADR-2)。
- **オープン事項(要 u1 確認)**: parser が `models: []` 空配列を許容するか — 許容する場合 loader 側に空 models ガードを追加する(business-rules.md BR-S6、§5.3)。code-generation 冒頭で実測して確定し、本ファイルへ追記または u1 の memory.md へ記録する。
- 新規外部依存なし(NFR-4)。生成ツリー(dist/ 等)は本 Unit の最後に `bun scripts/package.ts` 再生成で追随(手編集禁止)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:43:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 Major (caller enumeration/u3-owned breakage) resolved via time-boxed compat shim with recorded removal condition; BR-S6 empty-models guard added; iteration 2 no findings.

### Findings

- None
