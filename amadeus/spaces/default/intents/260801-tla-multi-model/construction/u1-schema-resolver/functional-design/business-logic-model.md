# Business Logic Model — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): unit-of-work(u1 節・AC1〜4), unit-of-work-story-map(FR→Unit 写像 — user-stories スコープ外のため stories 未生成、FR 写像がストーリー代替), requirements(FR-1 / FR-2, NFR-1/2/4), components(C1 / C2), component-methods(C1 / C2 節), services(S3 同一アルゴリズム規定), decisions(ADR-1 / ADR-2 / ADR-3 / ADR-6 / ADR-7), 実測ソース(`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`, `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` = byte-identical 確認済, `plugins/formal-model-check/tools/tla-model-map.ts`(re-export shim), `specs/tla/model-map.json`, `specs/tla/MirrorLifecycle.tla`, `tests/unit/t-formal-verif-model-map-v2.test.ts`)

unit-of-work-story-map は FR-1〜FR-6 → Unit の写像表(user-stories 未生成の代替)であり、u1 帰属は FR-1(model-map スキーマ拡張)/ FR-2(リゾルバ基盤)で本設計の FR 帰属と一致する。フロントエンド要素はなく frontend-components.md は生成しない。

## 1. スキーマ拡張(C1): optional auxiliaries / vocabulary のパース

対象ファイル: `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` と `packages/framework/core/tools/amadeus-formal-verif-model-map.ts`(byte-identical 2 複製、同一 byte で同時更新)+ re-export shim `plugins/formal-model-check/tools/tla-model-map.ts`(型 export の追記のみ)。

### 1.1 型の拡張(component-methods C1 どおり)

```ts
export interface ModelMapModel {
  readonly name: string;
  readonly model: ModelMapAssetIdentity;
  readonly cfg: ModelMapAssetIdentity;
  readonly auxiliaries?: readonly ModelMapAssetIdentity[]; // 新規 optional
  readonly entries: readonly ModelMapEntry[];
  readonly vocabulary?: ModelVocabulary; // 新規 optional
}

export interface ModelVocabulary {
  readonly namedInvariants: readonly string[];
  readonly traceStateVariables: readonly string[];
}
```

optional 追加のみ。既存フィールドの型・順序・必須性は一切変更しない(ADR-3 非侵襲方式、成功 (iii))。

### 1.2 exactObject 許可キー集合の拡張(パースアルゴリズム)

現行 `parseModel`(:203-218)の先頭ガードは `exactObject(value, ["cfg","entries","model","name"])` の1形のみ。これを**列挙型の複数形許可**へ拡張する。許容キー集合は次の4形のみ(和集合ではなく列挙 — 未知キーは従来どおり拒否):

1. `["cfg","entries","model","name"]`(従来形 — 省略時は byte レベルで同一のパース結果)
2. `["auxiliaries","cfg","entries","model","name"]`
3. `["cfg","entries","model","name","vocabulary"]`
4. `["auxiliaries","cfg","entries","model","name","vocabulary"]`

実装形: `exactObject` の呼出を「4形のいずれかに一致」の述語に置き換える(例: 許可集合の配列をループして `some` 判定)。`exactObject` 本体(:141-152)は変更しない。判定失敗時の detail メッセージは「name, model, cfg, entries(任意で auxiliaries / vocabulary)をちょうど持つこと」趣旨へ更新する。

### 1.3 auxiliaries 要素の検証(`parseAuxiliaryIdentities`、新設の内部関数)

`parseAssetIdentity`(:154-167)は `expectedPath` を固定引数に取るため aux には使えない(aux の path はモデルごとに異なる)。aux 専用の検証を新設する。アルゴリズム:

1. `Array.isArray` かつ `length >= 1`(**空配列は拒否** — 省略と空を区別し fail-closed、component-methods C1 エラー方針 / ADR-3)。
2. 各要素: `exactObject(element, ["identity","path"])`(model/cfg と同じ厳格形)。
3. `path` の検証(順序固定、いずれか違反で `invalid(...)`):
   - `typeof path === "string"`、`\\` 不含、`posix.isAbsolute` でない、`posix.normalize(path) === path`、`..` セグメント不含(`isCanonicalImplementationPath` :169-174 と同じ defensive 手続きを踏襲)。
   - `path.startsWith("specs/tla/")` かつ basename が `<Name>.tla` 形で `<Name>` が `MODEL_NAME` 文法(:127 `/^[A-Za-z][A-Za-z0-9]*$/`)に一致。**`.cfg`・他拡張子・`specs/tla` 外は全て拒否**(u1 AC1 の境界外負例)。
   - `path !== tlaModelPath(自モデル名)`(**自己 aux を拒否** — 意味論的に aux になり得ず、リゾルバの自己参照 fail-closed(BR-R 系)と宣言側で整合させる)。
4. `identity`: `typeof === "string"` かつ `SHA256`(:123 小文字64桁)に一致。
5. 配列全体: **path の一意性と昇順ソートを強制**(`entries` の :194-196 と同型の `previousPath` 比較 — 重複 path は拒否、component-methods C1)。
6. 成功時は `readonly ModelMapAssetIdentity[]` を返す。

すべての失敗は `invalid(...)`(:129-139)経由で `MODEL_MAP_INVALID` / `specs/tla/model-map.json` を返す。新しいエラーコードは追加しない(`ModelLoadErrorCode` 不変 — NFR-1)。

### 1.4 vocabulary 要素の検証(`parseModelVocabulary`、新設の内部関数)

1. `exactObject(value, ["namedInvariants","traceStateVariables"])`。
2. 各配列: 非空・全要素 string・各要素が `MODEL_NAME` 文法に一致(TLA 識別子)・一意(重複拒否)。空配列は拒否(省略と区別、aux と同一方針)。
3. 失敗は全て `invalid(...)`。語彙の**値の意味**(どの invariant 名が正しいか)はスキーマ層では判定しない — 供給側(u3/C4)と pin(u4/C8)の責務。スキーマは形だけを fail-closed に検証する。

### 1.5 非侵襲性の保証(成功 (iii) の設計上の固定)

- `auxiliaries` / `vocabulary` を持たないモデルは分岐 1(従来形)に入り、現行と同一コード経路・同一戻り値を得る。`specs/tla/model-map.json` の現行2モデルは本変更で**ファイル自体を変更しない**(u1 は map へ手を入れない — 値の追加は u3/u4)。
- identity 計算(`canonicalIdentity` :33-47)・`parseTlaModelMap` の公開シグネチャ・`findModelMapModel` / `diffModelMap` は不変。
- shim `tla-model-map.ts` には `type ModelVocabulary` の re-export 追加のみ行い、既存 export 一覧の意味は変えない。

### 1.6 byte-identical 2 複製の更新手順(擬似コード)

```
1. packages/framework/core/tools/amadeus-formal-verif-model-map.ts を編集
2. plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts へ同一 byte で複写
3. cmp <両パス> が exit 0 であることを確認(差分あれば失敗)
4. スキーマ表テストの describe.each(modules) が canonical / plugin 両コピーを
   同一表で駆動することを確認(新規ケースも同表に載せる — 片コピーだけの
   緑を構造的に排除)
```

dual-copy テスト機構(t-formal-verif-model-map-v2.test.ts:5-11): canonical コピーは直接 import、plugin 側は shim `tla-model-map.ts` 経由で import し、同一テーブルを `describe.each` で両モジュールに適用する。本 Unit の拡張ケースもこの表に乗せるため、**両コピーが同時に更新されない限りテストが落ちる**構造が維持される。

## 2. 推移解決リゾルバ(C2): `plugins/formal-model-check/tools/tla-module-deps.ts`(新規)

公開シグネチャは component-methods C2 節どおり(`extractModuleRefs` / `resolveAuxiliaryModules` / `ModuleDepsError` / エラーコード3種)。これに加え、§2.6 の宣言照合ヘルパを設計上の追加として提案する(ADR-2「実装は単一」の帰結。詳細は business-rules.md BR-C1)。

### 2.1 抽出規則(EXTENDS / INSTANCE の行ベース抽出)

入力: モジュール名 + ソース文字列。処理順序を固定する(偽陽性防止の核心):

1. **ブロックコメント除去**: `(*` から対応する `*)` までを複数行にまたいで除去する。現行4モジュール実測ではネストなし(components C2)のため、ネストは考慮しない単純走査。`(*` が閉じられない場合はモジュール末尾までコメントとみなす(TLA+ として不正なソースであり、解決結果に頼らず fail-closed 側へ倒す余地を残す — 詳細 BR-R6)。
2. **行コメント除去**: 各行について `\*` 以降を除去する(コメント除去の後に行う — `(* *)` 内の `\*` 紛いを二重処理しない)。
3. **キーワード行の走査**: コメント除去後の各行について、**行頭(前置空白のみ許容)が `EXTENDS` または `INSTANCE`** の行のみ採用する。行中に現れるキーワード文字列(定義内・識別子の一部)は採用しない — 行頭縛りが文字列リテラル中誤検出の構造的排除になる(components C2 留意)。
4. **EXTENDS 行**: キーワード以降をカンマ区切りで分割し、各トークンを trim して `MODEL_NAME` 文法に一致するもののみ採用(不一致トークンがあれば `MODULE_DEP_UNRESOLVED` ではなく**構文異常として detail 付きの失敗** — BR-R7)。例: `EXTENDS Naturals, FiniteSets`(MirrorLifecycle.tla:23)→ `{Naturals, FiniteSets}`。
5. **INSTANCE 行**: `INSTANCE <Name>` の最初の識別子のみ採用。`WITH` 句は改行跨ぎを含めて**一切読まない**(代入名は依存でない — component-methods C2)。例: MirrorLifecycle.tla:31-32 の `Core == INSTANCE MirrorLifecycleCore` + 次行 `WITH CaptureBoundaryAlwaysCreates <- FALSE` → `{MirrorLifecycleCore}` のみ。行頭が `INSTANCE` ではなく `<識別子> == INSTANCE <Name>` 形(実測 :31 / AsImplemented :37 がこの形)なので、走査は「行頭キーワード」に加えて **`== INSTANCE` の代入形**を採用対象に含める。正確には: 行頭が `INSTANCE` の行、または行頭識別子の後に `== INSTANCE <Name>` が続く行(前置空白許容)を採用し、後者では `INSTANCE` 直後の識別子を採る。
6. `Core!Foo` 形の参照は新たな依存を生まない(INSTANCE 宣言で捕捉済み — component-methods C2)。

重複はこの段階で排除しない(resolveAuxiliaryModules 側で正規化)。

### 2.2 標準モジュールの扱い(境界の精密化 — 設計上の決定)

実測4モジュールの EXTENDS は全て TLA 標準モジュール(`Naturals` / `Sequences` / `FiniteSets` / `TLC`)であり、specs/tla には存在しない。「参照先が specs/tla に存在しない場合は fail-closed」(components C2 境界)を文字どおり適用すると現行全モデルが赤になるため、境界を次のように精密化する:

- モジュール内に `TLA_STANDARD_MODULES: readonly string[]` として TLA2Tools 標準モジュールの固定リストを保持する(最低限 `Naturals, Sequences, FiniteSets, TLC, Integers, Reals, Bags`)。
- 抽出された参照名が標準モジュールリストに含まれる場合は**依存集合に入れず、失敗にもしない**(追跡対象外)。
- 標準リストに**含まれない**参照名のみ specs/tla 境界の解決対象とし、`readModule` による `<Name>.tla` の読取に失敗した場合は `MODULE_DEP_UNRESOLVED` で明示失敗する。

これにより「存在しないモジュールは明示失敗」の fail-closed 性は標準モジュール以外の全ての名前に対して保たれる。標準リストへの未収録名の追加はコード変更を伴うため、未知の標準モジュール参照は黙って通らない(NFR-2)。

### 2.3 推移閉包(`resolveAuxiliaryModules`)

注入シーム `readModule: (name: string) => Result<string, ModuleDepsError>`(component-methods C2 — loader の `TlaFileSystem` 抽象と整合、sensor 側は node fs 直接読み)。アルゴリズム:

1. 起点モジュールのソースを `readModule(起点名)` で取得(失敗はそのまま伝播)。
2. `extractModuleRefs` で直接依存を抽出(失敗は伝播)。
3. ワークリスト方式で幅優先に巡回する。`visited` 集合で訪問済みを管理し、**巡回中のパス上に既出のモジュールへ到達した場合は `MODULE_DEP_CYCLE`** で明示失敗(自己参照を含む)。標準モジュールは巡回対象から除く。
4. 収集したモジュール名集合から**起点自身を除き**、**ソート済み・重複排除**の配列として返す(components C2 留意どおり正規化)。

### 2.4 解決境界(specs/tla/ のみ)

- `readModule` の実装側が `specs/tla/<Name>.tla` のみを読む責務を持つ(loader 側は既存の `verifyAssetPath` 系の境界検査と整合)。リゾルバ本体はモジュール名が `MODEL_NAME` 文法外(パス区切り・`..` を含むなど)の場合に `MODULE_DEP_OUT_OF_BOUNDS` で拒否する — 抽出規則上 `MODEL_NAME` 不一致トークンは構文異常で弾かれるが、直接 API 呼出しに対する防御として関数名の入口でも検査する。

### 2.5 MirrorLifecycle に対する期待動作(受入の具現化)

- 入力: 実ファイル `specs/tla/MirrorLifecycle.tla`。
- 抽出: EXTENDS 行(:23)→ `{Naturals, FiniteSets}`(標準、追跡外)、INSTANCE 代入形(:31)→ `{MirrorLifecycleCore}`。
- 推移: `MirrorLifecycleCore.tla` を `readModule` で読み、:172 `EXTENDS Naturals, FiniteSets` のみ(標準)で追加依存なし。
- 出力: `["MirrorLifecycleCore"]`(u1 AC3 の緑側実証)。ブロックコメント :2-21 内のモジュール名様文字列・行コメント内の偽キーワードは一切採用しない(偽緑の落ちる実証)。

### 2.6 宣言-vs-解決の集合比較(RA Q2=A の比較 semantics)

比較の消費者は u2(loader)と u4(sensor/updateModelMap)だが、比較規則の単一実装は u1 のリゾルバに置く(ADR-2)。規則:

- **declared** = `model.auxiliaries` の path から basename 拡張子を除いたモジュール名集合(宣言が省略の場合は空集合として扱う — 省略は「aux なし宣言」と等価。空配列はスキーマが拒否済みなので曖昧さはない)。
- **resolved** = `resolveAuxiliaryModules` の出力集合。
- **missing(宣言漏れ)** = resolved − declared(INSTANCE/EXTENDS されているが宣言にない)。**red**。
- **extra(過剰宣言)** = declared − resolved(宣言にあるがソースから解決されない)。**red**。
- missing・extra がともに空のときのみ一致(緑)。**双方向のどちらか一方でも非空なら不一致**(Q2=A)であり、片方向だけの部分集合判定(例: declared ⊆ resolved のみ検査)は**不可** — 過剰宣言を取りこぼす。

出力は `DriftReport`(domain-entities.md 参照)として detail に両集合を保持し、呼出側(loader の SOURCE_DRIFT 系 / sensor の失敗 detail)が人間可読な診断を組み立てられるようにする。比較自体は red/緑の判定のみで、エラー型への変換は消費側の責務(loader は `TlaModelPipelineError` 系、sensor は sensor 失敗 — 既存の各エラー体系に従う)。

## 3. テスト計画(u1 所有面)

### 3.1 スキーマ表テスト拡張(`tests/unit/t-formal-verif-model-map-v2.test.ts` — 改訂、u1 仕分けどおり既存ケース期待値不変)

既存の describe("model map v2 schema") へ以下を追加し、`describe.each(modules)` の dual-copy 表(:277-309)にも aux/vocabulary 正例+負例を1ケースずつ追加する(両コピー同一表駆動の維持)。

正例(緑):
- `auxMirrorModel()`: MirrorLifecycle + `auxiliaries: [{ path: "specs/tla/MirrorLifecycleCore.tla", identity: SHA_x }]` → パース成功、戻り値が入力と等しい。
- vocabulary 正例: `vocabulary: { namedInvariants: ["TypeOK"], traceStateVariables: ["receipts"] }` 付きモデル → 成功。
- aux+vocabulary 同時 → 成功(キー集合4形目)。
- 省略モデル(既存 `electionModel()` / `mirrorModel()`)のパース結果が変更前と byte 一致(既存ケースがそのまま通ることで保証 — 成功 (iii))。

負例(赤 — u1 AC1「負例全件赤」):
- auxiliaries の未知キー混入(要素に `bytes` 追加 / モデル直下に未知キー `notes`)。
- `auxiliaries: []`(空配列)。
- aux path 境界外: `"specs/tla/../x.tla"`, `"/specs/tla/X.tla"`, `"plugins/x.tla"`, `"specs/tla/MirrorLifecycle.cfg"`(拡張子違い), `"specs/tla/1Bad.tla"`(文法外)。
- aux path が自モデルの model path と同一(自己 aux)。
- aux identity 非 canonical: 大文字 hex / 63文字 / 非 string。
- aux path の重複・非昇順。
- vocabulary 未知キー混入 / `namedInvariants: []` / 非識別子要素(`"not-an-inv"`)/ 重複要素。

### 3.2 新規 t402(`tests/unit/t402-tla-module-deps.test.ts` — リゾルバ単体)

採番は unit-of-work の予約どおり t402(現行最大 t401 を確認済)。ケース:

- `resolveAuxiliaryModules` が実ファイル MirrorLifecycle.tla から `["MirrorLifecycleCore"]` を返す(改行跨ぎ WITH 代入形を含む — AC3)。
- EXTENDS の標準モジュール(Naturals / FiniteSets / Sequences / TLC)が結果に混入しない。
- 偽陽性ガード(偽緑の落ちる実証): 行コメント内 `\* EXTENDS Fake`、ブロックコメント内(複数行)`(* INSTANCE Fake *)`、行中の `INSTANCE` 文字列、を含む合成ソースで `Fake` が結果に入らない。
- 偽陰性ガード(偽赤の落ちる実証): 前置空白付き `EXTENDS` 行・`<id> == INSTANCE X WITH`(改行跨ぎ)が正しく採用される。
- 推移閉包: A→B→C の合成モジュール列で `["B","C"]`(ソート・重複排除・起点除外)。
- 未解決: 標準リスト外かつ `readModule` 失敗の参照 → `MODULE_DEP_UNRESOLVED`。
- 循環: A↔B、および自己参照 → `MODULE_DEP_CYCLE`。
- 文法外モジュール名の直接入力 → `MODULE_DEP_OUT_OF_BOUNDS`。
- `readModule` 注入シーム: 注入した stub の失敗がそのまま伝播する。
- 宣言照合(§2.6 採用時): declared/resolved の missing・extra 双方向が DriftReport に正しく乗る。

patch coverage ゲート(team-practices): 変更行 0-hit 不許容 — 上記テストは修正と同 PR で運ぶ。

## 4. 設計上の留意(下流 Unit への引き渡し)

- u2(loader)は `resolveAuxiliaryModules` を全登録モデルに実行し、§2.6 の双方向比較で宣言漏れ・過剰宣言を区別して赤化する。u4(sensor/updateModelMap)は同じ比較結果から sensor 赤 / 宣言補正を行う。aux identity の計算 domain は `amadeus.formal-verif.tla.module.v1`(ADR-1)— u1 はスキーマの受入口のみで、identity 計算自体は行わない。
- 新規外部依存なし(NFR-4): `tla-module-deps.ts` は `node:`  import さえ不要な純粋モジュールとして書ける(`readModule` 注入のため fs 非依存)。
- 生成ツリー(dist/ 等)は本 Unit の最後に `bun scripts/package.ts` 再生成で追随(手編集禁止)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:43:40Z
- **Iteration:** 1
- **Scope decision:** none

u1 design covers all owned files and AC1-AC4 with precise BRs and red-proofs; cross-unit names match; rulings respected; fail-closed and dep-free. Findings: none.

### Findings

- None
