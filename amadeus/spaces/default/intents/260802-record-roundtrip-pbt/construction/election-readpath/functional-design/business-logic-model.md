# Business Logic Model — unit `election-readpath`(#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: 本書の file:line・件数はすべて **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`** の実読による。decisions.md / components.md / component-methods.md が測定 ref とする `5a6f79727` から HEAD までの `git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` は**空**(差分ゼロ)であり、上流 AD の file:line は HEAD でそのまま成立する。verbatim 断片はすべて `awk` による行指定の実読出力からの転記。

---

## 1. 本 unit の境界と責務

unit-of-work.md の Unit 一覧が本 unit を「AD U1(`parseElectionFile` 新設 + `Store.load`/`Store.setState` の読み口2箇所改修)+ U2(election PBT)+ U8 の election 系 arbitrary」と定義し、**walking skeleton(Bolt 1)** と位置づけている。unit-of-work-dependency.md の YAML edge block は `election-readpath` を `depends_on: []`、かつ `cast-guard` / `pbt-deep-ci` の前提として置く。したがって本 unit の業務ロジックは以下の3層に閉じる。

| 層 | 対象 | 出所 |
| --- | --- | --- |
| (A) プロダクション | `packages/framework/core/tools/amadeus-election-store.ts` の読み側一本化 | components.md U1、decisions.md ADR-4 |
| (B) 検証(PBT) | `Election.parse` の round-trip(unit 層)と `Store.load` の fail-closed(integration 層) | components.md U2、component-methods.md P-EL1〜P-EL3 |
| (C) 生成器 | `tests/helpers/arbitraries/election.ts` | component-methods.md U8 の election 系 |

本 unit は **state 境界(`state-pbt` unit が所有する P-ST1〜P-ST4)には一切触れない**。components.md U3 が state 境界を別ユニットに置き、unit-of-work-dependency.md がそれを独立 Unit として非交差判定しているためである。

---

## 2. 現行フロー(欠陥のある状態)

requirements.md Intent analysis が「書き手側だけがバリデータを通り、読み戻し側が素通りする非対称」と記述する構造を、HEAD 実読で ASCII に固定する。

```
[発行(write)経路]
  amadeus-election.ts:310  Election.parse(raw) ──► 検証 OK ──► Store.create
                                                                  │
                                                     writeStoreFile(election.json)
                                                                  ▼
                                                          ┌───────────────┐
                                                          │ election.json │
                                                          └───────┬───────┘
[消費(read)経路]                                                  │
  Store.load(:503) ──► readJson<ElectionFile>(:504) ──────────────┘
                            │
                            └─► :80  return ok(JSON.parse(text) as T);   ← 無検査キャスト
                                     (構文エラーのみ :82 err("corrupt"))
                            ⇒ Election.parse を通らない = #1459 の硬化が載らない

  Store.setState(:512) ──► readJson<ElectionFile>(path)(:515)
                            │
                            └─► :517 writeStoreFile(path, JSON.stringify({ ...read.value, state }, ...))
                                     ⇒ 不正な定義を検証なしで再書き込みして固定する
```

実読で確認した verbatim 断片:

- `amadeus-election-store.ts:80` = `    return ok(JSON.parse(text) as T);`
- `amadeus-election-store.ts:82` = `    return err("corrupt");`
- `amadeus-election-store.ts:504` = `    const read = readJson<ElectionFile>(`
- `amadeus-election-store.ts:515` = `    const read = readJson<ElectionFile>(path);`
- `amadeus-election-store.ts:517` = `    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));`

この経路が素通りさせる硬化は `amadeus-election-model.ts` に既に実装済みである(実読):

- `:65` = `function hasDuplicates<T>(values: T[]): boolean {`(重複 internalNo / 重複 voter の判定基盤)
- `:77` = `  if (!Array.isArray(raw) || raw.length === 0) return null;`(空 choices 拒否)
- `:101` = `  parse(raw: unknown): Result<Election, "parse-failure"> {`(唯一の定義バリデータ)

---

## 3. 改修後フロー(本 unit が成立させる状態)

decisions.md ADR-4 の裁定「election の読み側検証は store 内 private `parseElectionFile` に置き、`Store.load` と `Store.setState` の2読み口が経由する。汎用 `readJson` は変更しない」をそのまま実装形に落とす。

```
  Store.load(:503) ─┐
                    ├─► readJson<unknown>(path)  ──► Result<unknown, StoreError>
  Store.setState ───┘        │                          │ not-found / io-error / corrupt(構文)
                             │                          └────────────► そのまま呼び出し元へ返す
                             ▼ ok(raw)
                    parseElectionFile(raw): Result<ElectionFile, StoreError>
                             │
                             ├─ (1) Election.parse(raw)  ──失敗("parse-failure")──► err("corrupt")
                             │        └─ 成功 ──► Election(5フィールド)
                             │
                             ├─ (2) raw.state を VALID_STATES(:254)で照合
                             │        └─ 不一致/非文字列 ──────────────► err("corrupt")
                             │
                             └─ (3) 合成 ──► ok({ ...election, state })
                                              │
                    Store.load    ────────────┴─► ok({ election, state })
                    Store.setState ─────────────► writeStoreFile({ ...validated, state })
```

**設計上の核**: 検証ロジックを新規に書かない。decisions.md ADR-4 Rationale 1 が「新しい検証ロジックを書かない**ことが最大の設計目標**である — 書けばそれ自体が発行側とずれる新しい非対称になる」と定めている。`parseElectionFile` は既存の `Election.parse`(`amadeus-election-model.ts:101`)と既存の `VALID_STATES`(`amadeus-election-store.ts:254` = `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([`)の**合成器**にすぎない。

`readJson<T>` 本体(`:71` = `function readJson<T>(path: string): Result<T, StoreError> {`)は不変である(decisions.md ADR-4 Decision / requirements.md A-3)。呼び方を `readJson<unknown>` へ変えるのみで、`:80` の `as T` は残り、`cast-guard` unit のガード母集団に残り続ける(components.md U4 依存節「初期値 33/18 は不変」)。

---

## 4. 状態と不変量

### 4.1 `election.json` のライフサイクル状態

`Store.create`(components.md U1 が「書き手側で不変」とする面)が書く初期形は `:494` 実文 `    const file: ElectionFile = { ...election, state: "draft" };` であり、以後の状態遷移は `Store.setState` のみが行う。状態語彙は `VALID_STATES`(`:254-262` の7値: draft / open / collecting / tallied / rendered / recorded / hold)。

本 unit は**状態遷移規則を変更しない**。変更するのは「遷移の前後でファイルを読むときに検証を通すか否か」だけである。

### 4.2 不変量(本 unit が新たに成立させるもの)

| ID | 不変量 | 成立させる機構 |
| --- | --- | --- |
| INV-EL-1 | `Store.load` が `ok` を返したとき、その `election` は `Election.parse` を通過した値である | `parseElectionFile` 手順 (1) |
| INV-EL-2 | `Store.load` が `ok` を返したとき、その `state` は `VALID_STATES` の元である | `parseElectionFile` 手順 (2) |
| INV-EL-3 | `Store.setState` が書き戻す `election.json` の定義部は、書き戻し直前に `Election.parse` を通過している | 読み口2箇所の同時一本化(decisions.md ADR-4 Rationale 4) |
| INV-EL-4 | 検証失敗はすべて既存語彙 `err("corrupt")` に写像され、新しいエラー種別は導入されない | component-methods.md U1「新しいエラー種別は導入しない」 |
| INV-EL-5 | `election.json` の不在は `"corrupt"` ではなく `"not-found"`(`:72` = `  if (!existsSync(path)) return err("not-found");`)のまま | component-methods.md U1 の意図的相違節 |
| INV-EL-6 | 検証失敗時にディスク上のバイト列は変更されない(無音再初期化なし) | 既存方針(ファイル冒頭コメント実文 `// prevented by tmp+rename (writeStoreFile). Parse failures of existing files` / `// reject with "corrupt" (fail-closed load; never silently re-initialize).`) |

INV-EL-5 は decisions.md ADR-4 の「引用元 idiom との意味論照合」節が定める**意図的相違**である。同節は `readElectionsRegistry`(`:283`)の3値(`ok` / `absent` / `corrupt`)を踏襲しないと明記し、理由を「登録済み election の定義ファイルが無いのは異常である」と述べている。本 unit はこの裁定を逸脱しない。

---

## 5. プロパティ(業務ロジックとしての固定)

component-methods.md U2 が定義する P-EL1〜P-EL3 を、本 unit の業務ロジックとして受理ドメイン込みで固定する。

### P-EL1 — round-trip(unit 層 / `tests/unit/`)

```
for all e ∈ validElectionArb:
    Election.parse(JSON.parse(JSON.stringify(e))) = ok(e)
```

- **層**: 純関数のみ(fs 非依存)。requirements.md FR-4b と `cid:code-generation:fs-tests-integration-first` により `tests/unit/`。
- **オラクル**: なし(メタモルフィック)。requirements.md FR-4a が禁じる「棄却規則のテスト側再実装」に該当しない(`cid:build-and-test:pbt-oracle-cancellation` 非抵触)。
- **受理ドメインの根拠**: `Election.parse` は既知5フィールド(`amadeus-election-model.ts:53-59` の `electionId` / `kind` / `question` / `choices` / `voters`)のみを再構築して返す(`:110-116` の `return ok({ electionId, kind, question, choices, voters })`)。したがって余分なフィールドを持つ値では `parse(x) = ok(y)` かつ `y ≠ x` となり round-trip は成立しない。**生成器は `Election` 型の値のみを生成する**(余剰フィールドを混ぜない)ことが受理ドメインの条件である。
- **`description` の扱い**: component-methods.md P-EL1 の注意事項どおり、`Choice.description` は「キーごと不在」が正であり `null` でも `undefined` 明示代入でもない。実読根拠は `amadeus-election-model.ts:51` = `export type Choice = { internalNo: number; label: string; description?: string };` と同 `:49-50` のコメント実文 `// not the motion. Optional — a definition without it stays valid and the key is` / `// then absent (never null), which is the pinned shape downstream.`。生成器は `description` を**任意で省く**形で作る(§6.3)。

### P-EL2 — fail-closed(integration 層 / `tests/integration/`)

```
for all raw ∈ invalidElectionFileArb:
    writeFileSync(<electionDir>/election.json, JSON.stringify(raw))
    Store.load(root, electionId).ok = false  ∧  error = "corrupt"
```

- **層**: 実 FS を触る(`cid:code-generation:fs-tests-integration-first` により integration)。既存 `tests/integration/t235-election-store.integration.test.ts` のヘッダ実文 `// Layer: integration (touches a tmp elections root — fs-tests-integration-first).` と同じ層規約。
- **オラクル相殺の回避**: assertion は `loaded.ok === false` と `error === "corrupt"` の2点のみ。**なぜ不適合かの判定をテスト側で再実装しない**(component-methods.md P-EL2)。生成器は「妥当な基底値から不変条件を1つ壊す」変換で作る(§6.3)。
- **前提**: 対象 election が registry に登録済みであること。`Store.load` は `resolveElectionDir` を経由し、未登録 id では **throw する**(`tests/integration/t235-election-store.integration.test.ts:102` 実文 `    expect(() => Store.load(root, "E-NOPE")).toThrow("election not in registry: E-NOPE");`)。したがってプロパティは `Store.create` で作った election の `election.json` を上書きしてから読む形を取る。

### P-EL3 — #1459 反例のピン(requirements.md FR-4d)

P-EL2 の shrink 最小反例を example-based テストとして固定する(t204 規約第3項)。初期 example は既知3形:

| # | 壊し方 | 拒否する実装位置(実読) |
| --- | --- | --- |
| 1 | `choices` 内の `internalNo` 重複 | `parseChoices` 末尾の `hasDuplicates(choices.map((c) => c.internalNo))`(`:65` の判定基盤) |
| 2 | `choices` が空配列 | `:77` = `  if (!Array.isArray(raw) || raw.length === 0) return null;` |
| 3 | `voters` 重複 | `Election.parse` 内 `hasDuplicates(r.voters)` |

要件対応: requirements.md FR-1c が「#1459 の再現入力(重複 internalNo 等)が読取経路で棄却されること(AC-2)」を受け入れ条件としており、P-EL3 がその実測面である。

### プロパティ2種の書き分け(requirements.md FR-4a)

| プロパティ | 種別 | 独立オラクル | 層 |
| --- | --- | --- | --- |
| P-EL1 | round-trip(符号化層の全単射性) | 不要(メタモルフィック) | unit |
| P-EL2 | fail-closed(棄却は被検側が判定) | 不要(棄却規則を再実装しない) | integration |
| P-EL3 | 反例ピン(example-based) | 不要 | integration(P-EL2 と同居) |

---

## 6. 業務フロー — TDD(Red 先行)を織り込んだ実装手順

requirements.md C-1 が `cid:code-generation:tdd-default-with-narrow-exceptions` を既定と定め、component-methods.md「TDD の Red 面(C-1)」が Red の内容を確定している。本節はそれを実行順序として展開する。**各ステップは1件の失敗テストから始め、それを通す最小実装で Green にしてから次へ進む**(一括先行・実装後追加は TDD 実施とみなさない)。

### Step 0(準備・振る舞い不変)

- テスト番号を予約する。HEAD 実測の最大既存番号は **t415**(測定コマンド: `ls tests/unit tests/integration tests/smoke tests/e2e | grep -oE '^t[0-9]+' | sed 's/t//' | sort -n -u | tail -5` → `411 412 413 414 415`)。候補は unit 側 **t416**、integration 側 **t417**。再接地時は固定 base SHA の `tests/` 実測で再確認する(unit-of-work.md 全 Unit 共通の実装制約、`cid:code-generation:c1-tnnn-collision-on-regrounding`)。
- `PBT_SEED` を既存3値と重複しない値で選ぶ。HEAD 実測の既存値は `tests/unit/setup-semver.pbt.test.ts:41` `0x5e_6970` / `tests/unit/setup-manifest.pbt.test.ts:29` `0x5e_6970` / `tests/unit/t204-audit-escape.pbt.test.ts:38` `0xa0_d17` / `tests/unit/t352-journal-codec.pbt.test.ts:25` `16280702` / `tests/integration/t364-journal-v2.pbt.test.ts:41` `26072903`(測定: `grep -rn "PBT_SEED = " tests/`)。component-methods.md 全メソッド共通の規約が指す「既存3値」に加え setup 系2件も実在するため、選定時は上記5値すべてと重複しないことを確認する。

### Step 1(Red 1 — fail-closed の中核)

`tests/integration/t417-…` に「重複 internalNo を持つ**構文的には妥当な** JSON を `election.json` へ書き、`Store.load` が `err("corrupt")` を返す」example テストを1件書く。

- **現行実装では必ず赤になる**: `readJson` は JSON 構文が通れば `ok` を返すため、`loaded.ok` は `true` になる(component-methods.md「実装前に確実に赤くなる」)。
- Red は**実 FS 面**で測る(integration 層)。

### Step 2(Green 1 — `parseElectionFile` 新設 + `Store.load` 一本化)

`parseElectionFile` を新設し、`Store.load`(`:503`)の読み口だけを `readJson<unknown>` + `parseElectionFile` に切り替える。Step 1 が緑になる最小実装。

### Step 3(Red 2 — 対称性の穴)

「不正な定義を持つ `election.json` に対し `Store.setState` を呼ぶと `err("corrupt")` を返し、**ディスク上のバイト列が変わらない**」テストを1件書く。Step 2 の実装では `Store.setState` が `readJson<ElectionFile>`(`:515`)のままなので赤になる。

### Step 4(Green 2 — `Store.setState` 一本化)

`Store.setState` の読み口を `parseElectionFile` 経由へ切り替える。decisions.md ADR-4 Rationale 4(`cid:requirements-analysis:symmetric-pair-review`)の充足点。

### Step 5(Red 3 — `state` フィールドの検証)

「定義部は妥当だが `state` が未知文字列(例: `"unknown-state"`)の `election.json` を `Store.load` が棄却する」テストを1件書く。Step 4 時点で `parseElectionFile` が `state` を照合していなければ赤になる。

### Step 6(Green 3 — `VALID_STATES` 照合)

`parseElectionFile` の手順 (2) を追加して緑にする。**`VALID_STATES` を新設しない**(decisions.md ADR-4 Rationale 3 の不在主張の反証確認済み: `grep -rn "isElectionState\|ELECTION_STATES" packages/framework/core/tools/*.ts` → 0 件)。

### Step 7(PBT の常駐 — P-EL1)

`tests/helpers/arbitraries/election.ts` の `validElectionArb` を書き、`tests/unit/t416-…` に P-EL1 を置く。round-trip は現行実装でも成立するため、ここでの Red は「生成器が受理ドメインを外している場合の偽の赤」を検出するステップとして機能する(赤が出たら生成器側を直す — 実装は変えない)。

### Step 8(PBT の常駐 — P-EL2 / P-EL3)

`invalidElectionFileArb` を書き、P-EL2 を Step 1/3/5 と同じ integration ファイルへ置く。Step 1 の example を P-EL3 のピン1件目として残し、2形目・3形目(空 choices / 重複 voter)を追加する。

### Step 9(既存契約の非破壊確認)

decisions.md ADR-4 Consequences が列挙する既存 election テスト群(**t234 / t235 / t236 / t238 / t239 / t240 / t242 / t259 / t262**)の緑を実測で確認する。特に:

- `tests/integration/t235-election-store.integration.test.ts:93` の既存テスト(実読 `  test("fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes", () => {` — components.md / component-methods.md は `:91` と記すが HEAD 実読は `:93`)は壊れた JSON で `"corrupt"` を期待しており、本 unit の変更は**この契約を拡張する**(構文破損に加え意味的不正も corrupt)。既存 assertion は緑を維持する。
- `t236` はスプレッドで定義部を保つため壊れない(component-methods.md「既存 fixture 影響の実読確認」)。
- `t262:114` の最小 fixture は移行ツール独自の読み口(`readCandidates`)を通り `Store.load` を通らないため独立(同上)。

### Step 10(出荷条件)

unit-of-work.md 全 Unit 共通の実装制約に従う。本 unit は6 Unit のうち**唯一 `packages/framework/core/` を触る**ため以下が出荷条件になる。

| 条件 | 出所 |
| --- | --- |
| `bun scripts/package.ts` + `bun run promote:self` で dist **7ハーネス**再生成、`dist:check` / `promote:self:check` green | requirements.md NFR-1、unit-of-work.md |
| ローカル lcov で diff 追加行未カバー **0**(in-process seam 前提。`Store.load` は t235 が既に in-process で呼ぶため spawn 盲点は生じない — decisions.md ADR-4 Consequences) | requirements.md NFR-2 |
| `t258-boundary-guard`(出荷 core/tools のコメント・文字列に `scripts/` パストークンを書かない) | requirements.md NFR-3 |
| PBT 4項規約全充足(固定 `PBT_SEED` / numRuns 100 / 反例ピン / `AMADEUS_PBT_DEEP=1` 階層) | requirements.md FR-4c、unit-of-work.md |
| 新規 PBT ファイル群の `bun test` 直接実行が合計 **2秒以内** | requirements.md NFR-4 |
| `tests/.coverage-patch-allowlist.json` の行ピン2件(HEAD 実読 `:94` `    "lines": "476-477",` / `:100` `    "lines": "491",`)の機械 remap + reason 直読照合、span 膨張なしの確認 | decisions.md ADR-4 Consequences(`cid:code-generation:c1-allowlist-mechanical-remap` / `cid:code-generation:cg-allowlist-straddle-swell`) |

### Step 11(walking skeleton ゲート)

requirements.md C-3 と unit-of-work-dependency.md「Bolt 1(単独・ゲート付き)」により、本 unit は**単独で PR を出しユーザー承認を得てから**残 Bolt へ進む。承認前に `cast-guard` / `pbt-deep-ci` を先行させない(依存エッジ `election-readpath → {cast-guard, pbt-deep-ci}`)。

---

## 7. エラー写像(業務ルールの根拠)

| 入力の状態 | 現行の結果 | 改修後の結果 | 根拠 |
| --- | --- | --- | --- |
| ファイル不在 | `err("not-found")` | 変更なし | `:72`、INV-EL-5 |
| 読み取り不能(権限等) | `err("io-error")` | 変更なし | `:77` = `    return err("io-error");`(`readJson` の read catch) |
| JSON 構文エラー | `err("corrupt")` | 変更なし | `:82` |
| 構文は妥当・定義部が不正(重複 internalNo / 空 choices / 重複 voter / 型不一致 / 空 electionId) | **`ok`(素通り)** | `err("corrupt")` | 新設手順 (1) |
| 構文は妥当・`state` が未知文字列または非文字列 | **`ok`(素通り)** | `err("corrupt")` | 新設手順 (2) |
| すべて妥当 | `ok` | `ok`(同値) | 手順 (3) |

太字の2行が本 unit の**唯一の挙動変更**である。decisions.md ADR-4 Consequences「負(挙動変更)」がこれを承認済みの範囲として記録している。

---

## 8. 上流からの逸脱

なし。本書は requirements.md FR-1a〜1c / FR-4a〜4d、components.md U1 / U2 / U8、component-methods.md U1 / U2 / U8、decisions.md ADR-1(core 正本 import)/ ADR-4(store 内 private)、unit-of-work.md の Unit 定義と実装制約、unit-of-work-dependency.md の Bolt 1 ゲート付き単独実行、をそのまま実装フローへ展開したものである。

上流の記載と実読が食い違った点が1件ある(逸脱ではなく行番号の精密化): component-methods.md 適用点表と decisions.md ADR-4 Context は `Store.setState` の書き戻しを `:516` と記すが、HEAD 実読では `:516` = `    if (!read.ok) return read;`、書き戻しは **`:517`** = `    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));` である。本書は実読値 `:517` を採る(`cid:requirements-analysis:mechanism-cite-verify-at-draft`)。設計判断への影響はない。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段1(破損した選挙台帳の読取時その場棄却=配布面/非対称バグの実装前検出=開発面)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が「新規 PBT ファイル群」として本 unit の PBT を深掘り対象に含むため、テストファイル命名・AMADEUS_PBT_DEEP 階層は services.md S2 の実行コマンド契約から参照される。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:26:04Z
- **Iteration:** 1
- **Scope decision:** none

無申告逸脱なし。P-EL1〜3 受理ドメインは Election.parse 意味論から正しく導出、ADR-4 完全一致、行番号精密化4件妥当。Minor 2件(allowlist 行ピン値の出典明示・:252 注記の性質差)は conductor 是正/記録済み。GoA 2。

### Findings

- [Minor] business-rules.md BR-ELRP-27 — allowlist 行ピン値の出典明示不足(是正: 直読出典を明記)
- [Minor] BR-ELRP-23 :252 注記は行番号でなく分類の精密化(実害なし・記録のみ)
