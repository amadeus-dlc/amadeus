# Component Methods — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(FR-1a/1b の読取一本化契約、FR-2a/2b/2c のプロパティ形、FR-4a のプロパティ2種の書き分け、A-2 の `setField` 不変)、architecture.md(「正規化後の同値」で張れという設計段申し送り、fail-closed プロパティでの棄却規則の再実装禁止)、component-inventory.md(コーデック正本8ファイル/テスト側10パス/静的ガード1本という対象境界 — 下記の変更面をその内側に閉じる)

測定 ref: すべて **worktree HEAD `5a6f79727`**。`git diff --stat 9750f8aea..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` は空のため、RE observed 由来の file:line は HEAD でそのまま成立する。

## 変更面の所在(棚卸しとの対応)

component-inventory.md 現在節が挙げる対象3グループのうち、本書が関数シグネチャ水準で設計するのは (1) コーデック正本の 8 ファイル中 **3 ファイル**(`amadeus-election-store.ts` = U1 の唯一の改修対象、`amadeus-election-model.ts` と `amadeus-state.ts` / `amadeus-lib.ts` = 読むだけで変更しない対象)、(2) テスト側 10 パスへの新規追加、(3) 静的ガード 1 本、である。同節の「dist 側は core/tools の投影コピーのみで、独立コンポーネントは増えない」に従い、dist 側のシグネチャは本書の対象外とする。

## U1: election 読取一本化のメソッド設計

### 現状(実読による確認)

```ts
// packages/framework/core/tools/amadeus-election-store.ts:71-83
function readJson<T>(path: string): Result<T, StoreError> {
  if (!existsSync(path)) return err("not-found");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return err("io-error");
  }
  try {
    return ok(JSON.parse(text) as T);      // :80 — 無検査キャスト
  } catch {
    return err("corrupt");                  // :82 — 既存 fail-closed 分岐
  }
}
```

`ElectionFile` の型定義は `:86` 実文 `type ElectionFile = Election & { state: ElectionState };`。`Election.parse` は `packages/framework/core/tools/amadeus-election-model.ts:100-101` の `export const Election = { parse(raw: unknown): Result<Election, "parse-failure"> {` で、**`state` を知らない**(戻り型は `Election` のみ)。したがって読み側は「`Election` 部の検証」と「`state` 部の検証」を合成する必要がある。

### 新設(private・同一ファイル内)

```ts
// 新設: election.json 専用の読み口。汎用 readJson は変更しない(A-3)。
function parseElectionFile(raw: unknown): Result<ElectionFile, StoreError>;
```

- **入力**: `readJson<unknown>` が返した JSON 値(型引数を `unknown` にすることで、呼出し側の静的型が無検証のまま `ElectionFile` を名乗ることを防ぐ。なお `readJson<T>` 本体 `:80` の `as T` は残るため U4 ガードの検出対象であり続ける — 本体不変は ADR-4 の決定)。
- **出力**: `Result<ElectionFile, StoreError>` — 成功時は `Election.parse` が構築した `Election` に検証済み `state` を合成した値。失敗時は既存語彙 `"corrupt"`(`:49` の `StoreError` union、`:82` で既に使用)。**新しいエラー種別は導入しない**(FR-1b「既存の `err("corrupt")` 系の loud な失敗経路へ落とす」)。
- **検証の内訳**:
  1. `Election.parse(raw)` — `:100`。失敗(`"parse-failure"`)は `"corrupt"` へ写像する。これで #1459 の硬化(`:65` `hasDuplicates` / `:76` `parseChoices` の空 choices 拒否 / `:100` 以降の重複 voter 拒否)が読み戻し経路に載る。
  2. `state` フィールド — 同一ファイル既存の `VALID_STATES`(`:254` 実文 `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([`)で照合する。**新設しない**(不在主張の反証確認: `grep -rn "isElectionState\|ELECTION_STATES" packages/framework/core/tools/*.ts` → 0 件、`VALID_STATES` が実在する唯一の集合)。
- **エラー処理方針の明文照合**(`cid:application-design:citation-semantics-check`): 引用する既習 idiom は同一ファイルの `isElectionRegistryEntry`(`:270`)/ `readElectionsRegistry`(`:283`)である。当該 idiom は「行レベルの検証失敗 → 読み全体を corrupt(fail-closed)」「ファイル不在は corrupt ではなく `absent`」という分岐を持つ。本設計はこのうち**前者(検証失敗 → corrupt)だけを踏襲**し、後者は踏襲しない — `election.json` の不在は既存 `readJson` が `"not-found"`(`:72`)で表現しており、レジストリの `absent` に相当する「正当な未採用状態」ではないためである。この差は**意図的相違**として記録する。

### 適用点(2箇所 — 対称性)

| 呼び出し | 現状(HEAD 実文) | 変更後 |
| --- | --- | --- |
| `Store.load`(`:503`) | `const read = readJson<ElectionFile>(` (`:504-506`) | `readJson<unknown>` → `parseElectionFile` |
| `Store.setState`(`:512`) | `const read = readJson<ElectionFile>(path);`(`:515`) | 同上 |

`Store.load` だけを直しても `Store.setState` が同じ `election.json` を無検査で読む非対称が残る(`cid:requirements-analysis:symmetric-pair-review`)。したがって**読み口2箇所を同時に一本化する**。`Store.setState` は読んだ値を `{ ...read.value, state }` として書き戻す(`:516`)ため、検証を通さないと**不正な定義を再書き込みして固定してしまう**書き手側の穴でもある。

### 消費者棚卸し(grep 出力からの転記 — 2キー)

`cid:application-design:dual-key-consumer-inventory` に従い、変数名キーとリテラルキーの両方で採る。**表からの複製ではなく、本ステージで実行した grep 出力を転記**した(`cid:functional-design:inventory-from-grep-each-time`)。

**キー1(シンボル名)**: `grep -rn "Store\.load(" packages/ scripts/ tests/ plugins/` → プロダクション **10 件** / テスト **4 件**(内訳の件数は `grep -rn "Store\.load(" packages/ scripts/ | wc -l` = 10、`grep -rn "Store\.load(" tests/ | wc -l` = 4)。

| ファイル:行 |
| --- |
| `packages/framework/core/tools/amadeus-election.ts:138` / `:195` / `:254` / `:395` / `:431` / `:458` / `:473` / `:558` |
| `packages/framework/core/tools/amadeus-election-store.ts:580` / `:643` |
| `tests/integration/t235-election-store.integration.test.ts:68` / `:97` / `:102` / `:123` |

**キー1(バリデータ側)**: `grep -rnE "Election\.parse|Ballot\.parse" packages/framework/core/tools/ scripts/` → 実呼出は `amadeus-election.ts:310`(`const parsed = Election.parse(raw);`)と `:433`(`const parsed = Ballot.parse(raw, loaded.value.election);`)の **2 件のみ**。残る 3 ヒットは `amadeus-election-model.ts:3` / `:193` / `:211` のコメント。requirements.md Intent analysis と architecture.md 現在節の「消費側 0 件」がそのまま HEAD で再現する。

**キー2(リテラル)**: `grep -rn '"election.json"' packages/ scripts/ tests/` → **計 24 件**(`packages` 4 / `scripts` 2 / `tests` 18)。

| 領域 | ファイル:行 | 本 intent での扱い |
| --- | --- | --- |
| packages | `amadeus-election-store.ts:481`(存在判定)/ `:495`(create の書き)/ `:505`(load の読み)/ `:514`(setState の読み) | `:505` `:514` が U1 の変更点。`:481` `:495` は書き手側で不変 |
| scripts | `scripts/amadeus-election-migrate.ts:229`(`JSON.parse(readFileSync(join(dir, "election.json"), "utf8")) as Record<` = 独自の読み口)/ `:252` | **U1 の対象外**。移行ツールは Store を経由せず独自に読む。U4 のガード母集団に残り、allowlist で可視化される |
| tests | `t259-elections-registry.integration.test.ts` 6 件 / `t236-election-loop.integration.test.ts` 4 件 / `t262-elections-migration.integration.test.ts` 6 件 / `t235-election-store.integration.test.ts` 2 件 | 既存 fixture が U1 の硬化で壊れないことを実読で確認済み(下記) |

**既存 fixture 影響の実読確認**(実装前に判明させておく破壊リスク):

- `t236:531-536` / `:553` は `const efile = JSON.parse(...)` を**スプレッドして** `{ ...efile, state: "hold" }` 等を書くため、定義部は妥当なまま。U1 で壊れない。
- `t262:114` は `JSON.stringify({ state: "recorded" })` という**定義部を欠く**最小 fixture を書くが、その直後の消費者は `readCandidates`(移行ツール独自の読み口)であり `Store.load` ではない。既に `expect(() => readCandidates(...)).toThrow(/invalid election.json/)` を期待しており、U1 と独立。
- `t235:91` の既存テスト `fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes` は壊れた JSON(`'{"electionId": "E-STORE-1", "state": '`)を書いて `"corrupt"` を期待する。U1 はこの契約を**拡張する**(壊れた JSON に加え、構文的に妥当だが意味的に不正な定義も corrupt にする)。既存 assertion はそのまま緑を維持する。

### TDD の Red 面(C-1)

先に書く失敗テストは「重複 internalNo を持つ妥当 JSON を `election.json` へ書き、`Store.load` が `"corrupt"` を返すこと」。現行実装ではこの入力が `ok` で返るため、**実装前に確実に赤くなる**。Red の実測面は `tests/integration/`(実 FS)。

## U2: election PBT のプロパティ関数

### P-EL1(round-trip・unit 層)

```ts
// 妥当 Election の JSON 往復が定義を保存する
// property: for all e in validElectionArb,
//   Election.parse(JSON.parse(JSON.stringify(e))) === ok(e)
```

- **オラクル**: なし(メタモルフィック)。`cid:build-and-test:pbt-oracle-cancellation` に非抵触。
- **注意**: `Choice.description` は「不在(キーごと無い)」が正で `null` ではない(`amadeus-election-model.ts:51` 近傍のコメント「Optional — a definition without it stays valid and the key is then absent (never null), which is the pinned shape downstream.」)。arbitrary は `description` を**任意で省く**形で生成し、`undefined` を明示代入しない(JSON がそれを表現できないため round-trip が偽の赤になる)。

### P-EL2(fail-closed・integration 層)

```ts
// 非適合な election.json は読取経路で必ず棄却される
// property: for all raw in invalidElectionFileArb,
//   writeFileSync(electionJsonPath, JSON.stringify(raw));
//   Store.load(root, id).ok === false   // かつ error === "corrupt"
```

- **オラクル相殺の回避**: arbitrary は**非適合入力の生成に徹し**、なぜ不適合かの判定をテスト側で再実装しない(architecture.md 申し送り 4)。生成器は「妥当な基底値から1つの不変条件を壊す」変換で作る(重複 internalNo を注入 / choices を空配列に / voters を重複させる / voters を空に / electionId を空文字に / state を未知の文字列に)。壊し方の**種類**は列挙するが、棄却されるべき理由の再判定はしない。
- **判定は被検側へ委ねる**: assertion は `loaded.ok === false` の1点のみ。エラー種別は `"corrupt"` に固定する(既存語彙の維持を同時にピンする)。

### P-EL3(#1459 反例のピン・FR-4d)

P-EL2 の shrink 最小反例を example-based テストとして固定する(t204 規約第3項)。初期値は既知の3形(重複 internalNo / 空 choices / 重複 voter)を明示 example として置き、property は探索を続ける。

## U3: state PBT のプロパティ関数

対象シグネチャ(HEAD 実読):

```ts
// packages/framework/core/tools/amadeus-state.ts:239
export function parseMirrorBoundaryReceipts(raw: string | null): MirrorBoundaryReceipts
// :278
export function serializeMirrorBoundaryReceipts(receipts: MirrorBoundaryReceipts): string
// packages/framework/core/tools/amadeus-lib.ts:5179
export function getField(content: string, field: string): string | null
// :5237
export function setField(content: string, field: string, value: string): string
// :5263
export function fieldExists(content: string, field: string): boolean
```

### P-ST1(構造フィールド round-trip・正規化後の同値)

```ts
// property: for all r in receiptsArb,
//   parseMirrorBoundaryReceipts(serializeMirrorBoundaryReceipts(r)) === r
```

方向は `parse ∘ serialize`(受理ドメイン上の恒等)で張る。逆向き `serialize ∘ parse = id` は**張らない** — 書き手が `MIRROR_BOUNDARY_PHASES`(`:225`)順へ並べ替える正規化書き手であるため、キー順が自由な生テキストに対しては成立せず偽の赤になる(architecture.md 申し送り 1)。

### P-ST2(構造フィールド fail-closed・5 throw 分岐)

```ts
// property: for all s in nonConformingReceiptsTextArb,
//   expect(() => parseMirrorBoundaryReceipts(s)).toThrow()
```

`throw` することだけを検査し、**メッセージ文言では判定しない**(棄却規則の再実装を避ける)。5 分岐(`:248` 重複 phase / `:257` 不正 JSON / `:261` 非オブジェクト / `:266` 未知 phase / `:270` 不正 status)の到達は、生成器の各コンストラクタが 1 分岐に対応することで担保し、到達実測は lcov の DA で確認する(`cid:build-and-test:error-path-reach-lcov`)。

### P-ST3(テキストフィールド round-trip・条件付き)

```ts
// property: for all (content, field, value) with fieldExists(content, field) === true
//                    and value に改行を含まない,
//   getField(setField(content, field, value), field) === value.trim()
```

- **受理ドメインの明示**: 前提は `fieldExists(content, field) === true`(`:5263`)。この前提を外すと `setField` のサイレント no-op(`:5248` 実文 `  return content;`)により恒真でも偽の赤でもない曖昧なプロパティになる(architecture.md の層 (c) 記述)。
- **`.trim()` 込み**: `getField` は `:5189` 実文 `  return match ? match[1].trim() : null;` を返す。等式の右辺を `value.trim()` にするのはこの実装意味論の直接反映であり、**`setField` の意味変更ではない**(requirements.md A-2 を維持)。
- **値の制約**: `setField` の正規表現は `m` フラグ付き単一行マッチのため、改行を含む値は round-trip しない。生成器の側で改行を除外する(仕様の記述であり変更提案ではない)。

### P-ST4(サイレント no-op の特性化)

```ts
// property: for all (content, field) with fieldExists(content, field) === false,
//   setField(content, field, anyValue) === content     // バイト同一
```

A-2 の「現行挙動を維持する」を**プロパティとして固定**する。これにより将来の意図せぬ変更が赤になる — 仕様変更を禁じるのではなく、変更を無音にしない。

## U4: 静的ガードの関数群

`tests/callsite-guard.ts` の公開面(`:133` `Census` / `:142` `buildCensus` / `:201` `diffAgainstAllowlist` / `:248` `parseAllowlist` / `:318` `CheckOptions` / `:330` `runCheck`)と同型に設計する。差分は検出関数のみ。

```ts
// 検出: AST 走査。1ファイル1パス。
export type UncheckedCastMatch = {
  readonly file: string;
  readonly line: number;
  readonly kind: "json-parse-as";   // 将来の述語追加に備えた1語彙
};
export function detectUncheckedCasts(file: string, source: string): UncheckedCastMatch[];

// 台帳: (file, kind) → count。行ピンは使わない(allowlist-line-pin-stale)。
export type Census = Record<string, Record<string, number>>;
export function buildCensus(matches: readonly UncheckedCastMatch[]): Census;
export function diffAgainstAllowlist(census: Census, allowlist: AllowlistDoc): GuardVerdict;

// CLI(in-process 駆動可能な seam 付き — spawn 盲点回避、NFR-2)
export type CheckOptions = {
  readonly allowlistPath?: string;
  readonly reportPath?: string;
  readonly census?: Census;   // テストから注入し、違反側の分岐を in-process で駆動する
};
export function runCheck(options?: CheckOptions): number;
export function runUpdate(path?: string): number;
```

- `detectUncheckedCasts` の述語: `ts.isAsExpression(node)` かつ `node.expression` を `unwrapExpression`(`tests/lib/typescript-source.ts:19`)で剥いた結果が `JSON.parse(...)` の `CallExpression` であり、かつ `node.type.kind !== ts.SyntaxKind.UnknownKeyword`。`as unknown` を除外するのは、`unknown` へのキャストが型の証明を主張しない(parse-don't-validate と両立する)ためで、HEAD 実測で SCAN_ROOTS 上に 8 件ある。
- `census` seam を持つ理由は `tests/callsite-guard.ts:321-322` のコメントに前例がある(実文 `  // The census to judge, for tests. It defaults to a live scan, and argv has no` / `  // way to set it — \`main\` only ever measures. The seam exists because the`)。違反アームを in-process で駆動できないと「落ちる実証」が spawn 越しになり lcov の盲点に落ちる。
- **エラー処理方針の明文照合**: 引用元 `callsite-guard.ts` は allowlist 不読を `ALLOWLIST_UNREADABLE` で fail-closed にする(`:334`)。本ガードも同一方針を採る — 相違なし。

## U8: arbitrary 群のシグネチャ

配置は `tests/helpers/arbitraries/`(既存 `semver.ts` / `manifest.ts` の隣)。既存方針(生成器はパーサの入力境界で止め、ブランド型を直接作らない)を踏襲する。

```ts
// election.ts
export const validElectionArb: fc.Arbitrary<Election>;            // P-EL1 用(妥当のみ)
export const invalidElectionFileArb: fc.Arbitrary<unknown>;       // P-EL2 用(1不変条件を壊した値)
export const validElectionFileArb: fc.Arbitrary<unknown>;         // 妥当 election.json 相当(state 付き)

// state-receipts.ts
export const receiptsArb: fc.Arbitrary<MirrorBoundaryReceipts>;   // P-ST1 用
export const nonConformingReceiptsTextArb: fc.Arbitrary<string>;  // P-ST2 用(5分岐へ対応)

// state-field.ts
export const stateContentWithFieldArb: fc.Arbitrary<{ content: string; field: string }>;  // P-ST3 用
export const stateContentWithoutFieldArb: fc.Arbitrary<{ content: string; field: string }>; // P-ST4 用
export const fieldValueArb: fc.Arbitrary<string>;                 // 改行を含まない値
```

`Goa` のようなブランド型は生成器から直接作らない(`amadeus-election-model.ts:26-34` の `Goa.parse` が唯一の構築路)。ballot を含むプロパティを将来足す場合も、生成器は入力境界(数値)まででスマートコンストラクタに委ねる。

## 全メソッド共通の規約(FR-4c)

各 PBT ファイル冒頭に t204 の4項規約ヘッダ(`tests/unit/t204-audit-escape.pbt.test.ts:16-28`)を置き、**4項すべてを充足**する:

1. 固定 `PBT_SEED` + numRuns 既定(100)
2. 失敗時の seed / replay / 縮小反例の出力(fast-check 既定)
3. 縮小反例の example-based ピン(P-EL3 がその実施)
4. `AMADEUS_PBT_DEEP=1` による深掘り階層 — `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };`

`PBT_SEED` は既存 3 値(`t204:38` `0xa0_d17` / `t352:25` `16280702` / `t364:41` `26072903`)と重複しない値をファイルごとに固定する。
