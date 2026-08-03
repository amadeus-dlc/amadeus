# Domain Entities — unit `election-readpath`(#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**。型定義はすべて実読による verbatim 転記(`awk` の行指定出力)。`git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` は空のため、components.md / component-methods.md / decisions.md の file:line は HEAD で成立する。

---

## 1. 型の所有マップ

| 型 | 所在(正本) | 本 unit での扱い |
| --- | --- | --- |
| `Result<T, E>` | `amadeus-election-model.ts:12` | 再利用のみ。変更なし |
| `Goa`(ブランド型) | `amadeus-election-model.ts:26` | **本 unit では生成しない**(ballot を扱わない)。BR-ELRP-12 の対象 |
| `ElectionState` | `amadeus-election-model.ts:39-46` | 再利用のみ |
| `Choice` | `amadeus-election-model.ts:51` | 生成器の対象。型定義は変更しない |
| `Election` | `amadeus-election-model.ts:53-59` | 生成器の対象。型定義は変更しない |
| `StoreError` | `amadeus-election-store.ts:44-50` | 再利用のみ。**union に値を追加しない**(BR-ELRP-5) |
| `ElectionFile` | `amadeus-election-store.ts:86` | `parseElectionFile` の戻り値型。定義は変更しない |
| `VALID_STATES` | `amadeus-election-store.ts:254` | `state` 検証の**唯一の所有者**。本 unit が読み取り消費者を1つ増やす |

この所有マップは requirements.md の境界規定に従う。FR-1a が読取一本化を election ファイルに限定し、A-3 が「`readJson` の汎用形は他ファイル種(ledger.json 等)でも使われる。FR-1 は election ファイルの読取経路のみを一本化し、残余は FR-3 の allowlist ratchet が可視化・縮小方向で管理する」と定めるため、`LedgerFile`(`amadeus-election-store.ts:87` = `type LedgerFile = { ballots: Ballot[]; late: LateBallot[] };`)以下の他ファイル種の型は本 unit の検証対象に入らない。また requirements.md A-2 が `setField` の現行意味論を維持と定めるため、state 境界のテキストフィールド型も本 unit の対象外である。unit-of-work.md の Unit 一覧が本 unit を「AD U1 + U2 + U8 の election 系 arbitrary」と定義し、U8 の state 系 arbitrary を `state-pbt` へ帰属させていることが、§6 の生成器ファイル分割の直接の根拠である。

**新規ドメイン型はゼロ**である。components.md「コンポーネント分割の方針」が「新規プロダクションコンポーネントはゼロで、追加されるのは (a) 既存 core モジュール内の関数1本(読み側パーサ)…」と定めるとおり、本 unit が新設するのは関数1本と生成器のみで、型は既存の合成に留まる。

---

## 2. `Election`(ドメイン定義)

HEAD 実読(`amadeus-election-model.ts:53-59`):

```ts
export type Election = {
  electionId: string;
  kind: string;
  question: string;
  choices: Choice[];
  voters: string[];
};
```

`Choice`(`:51` 実文):

```ts
export type Choice = { internalNo: number; label: string; description?: string };
```

直上のコメント(`:49-50` 実文)が `description` の正準形を固定している:

```
// not the motion. Optional — a definition without it stays valid and the key is
// then absent (never null), which is the pinned shape downstream.
```

### 検証の所有: `Election.parse`

`Election` の**唯一の構築路**は `Election.parse`(`:101` 実文 `  parse(raw: unknown): Result<Election, "parse-failure"> {`)である。本 unit は新しい構築路を作らない(BR-ELRP-2)。parse が課す不変条件(実読):

| 不変条件 | 実装行 |
| --- | --- |
| raw がオブジェクト非 null | `Election.parse` 冒頭 |
| `electionId` が非空文字列 | 同上 |
| `kind` / `question` が文字列 | `:105` = `    if (typeof r.kind !== "string" \|\| typeof r.question !== "string") return err("parse-failure");` |
| `choices` が非空配列 | `:77` = `  if (!Array.isArray(raw) \|\| raw.length === 0) return null;` |
| `choices[].internalNo` が数値・`label` が文字列 | `parseChoices` 内 |
| `choices[].description` は不在または文字列 | `parseChoices` 内(`cc.description !== undefined && typeof cc.description !== "string"`) |
| `choices[].internalNo` が一意 | `parseChoices` 末尾 `hasDuplicates(...)`(判定基盤 `:65` = `function hasDuplicates<T>(values: T[]): boolean {`) |
| `voters` が非空の文字列配列 | `:108` = `    if (!isStringArray(r.voters) \|\| r.voters.length === 0) return err("parse-failure");` |
| `voters` が一意 | `:109` = `    if (hasDuplicates(r.voters)) return err("parse-failure");` |

### 正規化の意味論(P-EL1 の受理ドメインの根拠)

`Election.parse` は成功時に `:110-116` で**既知5フィールドのみ**を再構築して返す(`electionId` / `kind` / `question` / `choices` / `voters`)。したがって:

- **余剰フィールドは落ちる**。`parse(x) = ok(y)` のとき `y` は必ず `Election` 形であり `x` の余剰キーを持たない。
- ゆえに P-EL1(`Election.parse(JSON.parse(JSON.stringify(e))) = ok(e)`)は **`e` が `Election` 形ちょうどであるドメイン上でのみ恒真**である。生成器はこのドメインに限定して作る(§5.1)。
- `description` は `undefined` を明示代入せず**キーごと省く**。JSON がキー値 `undefined` を表現できないため、明示代入すると `JSON.stringify` の時点でキーが消え、parse 結果と原値が構造的に食い違って**偽の赤**になる(component-methods.md P-EL1 の注意事項)。

---

## 3. `ElectionState` と `VALID_STATES`

HEAD 実読(`amadeus-election-model.ts:39-46`):

```ts
export type ElectionState =
  | "draft"
  | "open"
  | "collecting"
  | "tallied"
  | "rendered"
  | "recorded"
  | "hold";
```

実行時の判定集合は `amadeus-election-store.ts:254` 実文 `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([` に始まる7要素で、`:255-261` が上記7値を列挙する(実読)。**型の値数 7 と集合の要素数 7 が一致する**(機械照合: 型の union アーム 7 = 集合リテラル要素 7)。

### 所有と再利用

decisions.md ADR-4 Rationale 3 が「`state` の検証集合を新設しない」と裁定し、不在主張の反証確認(`grep -rn "isElectionState\|ELECTION_STATES" packages/framework/core/tools/*.ts` → 0 件)を記録している。HEAD での既存消費者は `isElectionRegistryEntry`(`:270` = `export function isElectionRegistryEntry(v: unknown): v is ElectionRegistryEntry {`)内の1箇所(実文 `  if (typeof r.status !== "string" || !VALID_STATES.has(r.status)) return false;`)。

本 unit は `parseElectionFile` を**第2の消費者**として追加する。集合は移動も複製もしない(BR-ELRP-4)。

---

## 4. `ElectionFile` と `StoreError`

### `ElectionFile`(ストレージ表現)

HEAD 実読(`amadeus-election-store.ts:86`):

```ts
type ElectionFile = Election & { state: ElectionState };
```

**export されていない**(module-private)。decisions.md ADR-4 代替 C の却下理由が示すとおり、`state` はストレージ層の関心であり、ドメイン層 `amadeus-election-model.ts`(冒頭 `:4-5` 実文 `// ballot acceptance. No fs/network/clock access — every fallible API returns a` / `// discriminated-union Result and never throws (functional-domain-modeling-ts).`)はこれを知らない。この所有境界を本 unit は動かさない(BR-ELRP-31)。

`parseElectionFile` の戻り値型は `Result<ElectionFile, StoreError>` であり(component-methods.md U1 の宣言シグネチャ)、`ElectionFile` と同じく module-private に留まる(components.md U1「モジュール内 private 関数」)。

### `StoreError`

HEAD 実読(`:44-50`):

```ts
export type StoreError =
  | "exists"
  | "duplicate"
  | "not-found"
  | "io-error"
  | "corrupt"
  | "unknown-ref";
```

本 unit が使うのは既存の `"corrupt"`(`:49`)・`"not-found"`(`:72` が返す)・`"io-error"`(`:77` が返す)のみ。**union に値を追加しない**(BR-ELRP-5、component-methods.md「新しいエラー種別は導入しない」)。

`Election.parse` のエラー型 `"parse-failure"` から `StoreError` の `"corrupt"` への**写像**が `parseElectionFile` の責務であり、`"parse-failure"` を store の公開面に漏らさない。

---

## 5. スキーマ: `election.json`

`Store.create` が書く形(`:494` 実文 `    const file: ElectionFile = { ...election, state: "draft" };`、直後に `writeStoreFile(join(dir, "election.json"), JSON.stringify(file, null, 2))`)。

```jsonc
{
  "electionId": "E-STORE-1",       // 非空文字列(必須)
  "kind": "zero-confirm",          // 文字列(必須)
  "question": "q",                 // 文字列(必須)
  "choices": [                     // 非空配列(必須)
    { "internalNo": 1, "label": "a" }              // description はキーごと省略可
  ],
  "voters": ["alice", "bob"],      // 非空・一意の文字列配列(必須)
  "state": "draft"                 // VALID_STATES の元(必須)
}
```

- **キー順は意味を持たない**(JSON オブジェクト)。ただし `Election.parse` が既知5フィールドのみ再構築するため、**未知キーは読み戻しで落ちる**(前方互換ではなく切り捨て)。この性質は `isElectionRegistryEntry` の「Unknown EXTRA fields are ignored (forward-compat)」(`:265` 実文 `// types AND status is a known ElectionState. Unknown EXTRA fields are ignored`)と同方向である。
- 本 unit は**スキーマを変更しない**。変えるのは「読むときに上記制約を検査するか否か」だけである。

### 検証の所有(境界別)

| 検証対象 | 所有者 | 新設/再利用 |
| --- | --- | --- |
| 定義部(5フィールド) | `Election.parse`(model) | 再利用 |
| `state` フィールド | `VALID_STATES`(store) | 再利用 |
| 2者の合成 + エラー写像 | `parseElectionFile`(store、新設) | **新設(合成のみ)** |
| JSON 構文 | `readJson` の catch(`:82`) | 再利用・不変 |
| ファイル存在 | `readJson` の `:72` | 再利用・不変 |

---

## 6. 生成器(arbitrary)の型と生成境界

配置は `tests/helpers/arbitraries/election.ts`(component-methods.md U8、既存 `semver.ts` / `manifest.ts` の隣)。component-methods.md U8 が宣言するシグネチャをそのまま採る:

```ts
export const validElectionArb: fc.Arbitrary<Election>;            // P-EL1 用(妥当のみ)
export const invalidElectionFileArb: fc.Arbitrary<unknown>;       // P-EL2 用(1不変条件を壊した値)
export const validElectionFileArb: fc.Arbitrary<unknown>;         // 妥当 election.json 相当(state 付き)
```

※ `receiptsArb` / `nonConformingReceiptsTextArb` / `stateContentWith(out)FieldArb` / `fieldValueArb` は component-methods.md U8 の **state 系**であり、`state-pbt` unit が `tests/helpers/arbitraries/state-receipts.ts` / `state-field.ts` に置く。本 unit は同ディレクトリの**別ファイル**にのみ書き、非交差を保つ(unit-of-work-dependency.md「helpers 内は別ファイル」)。

### 6.1 `validElectionArb` の生成境界

| フィールド | 生成域 | 境界の根拠 |
| --- | --- | --- |
| `electionId` | 長さ 1 以上の文字列 | `electionId.length === 0` 拒否(`Election.parse`) |
| `kind` / `question` | 任意の文字列(空可) | parse は文字列型のみを要求(長さ制約なし) |
| `choices` | 長さ 1 以上の配列。`internalNo` は**一意**な整数、`label` は文字列、`description` は**確率的にキーごと省略**(`fc.option` の `undefined` 明示代入は使わない) | `:77` の非空要求 + `internalNo` 一意要求 + `:49-50` の「キーごと不在」注記 |
| `voters` | 長さ 1 以上の**一意**文字列配列 | `:108` 非空要求 + `:109` 一意要求 |

**一意性の作り方**: `fc.uniqueArray` 等で生成側から一意を保証する(生成後に重複を検出して捨てる方式は、判定の再実装に近づくため採らない)。生成器は「妥当な値だけを作る」ことに徹し、妥当性の**判定**は書かない。

`validElectionFileArb` は `validElectionArb` に `state ∈ VALID_STATES の7値` を付した値を返す(型は `unknown` — ディスクへ書く生の JSON 値として扱うため)。

### 6.2 `invalidElectionFileArb` の生成境界(P-EL2)

component-methods.md P-EL2 の方針「妥当な基底値から1つの不変条件を壊す変換で作る」を採る。**壊し方の種類は列挙するが、棄却されるべき理由の再判定はしない**(BR-ELRP-9)。

| # | 変換 | 壊す不変条件 |
| --- | --- | --- |
| 1 | 既存 `choices` の1要素を複製して `internalNo` を既存値と同じにする | internalNo 一意 |
| 2 | `choices` を `[]` にする | choices 非空 |
| 3 | `voters` の1要素を複製する | voters 一意 |
| 4 | `voters` を `[]` にする | voters 非空 |
| 5 | `electionId` を `""` にする | electionId 非空 |
| 6 | `state` を `VALID_STATES` に無い文字列にする | state 妥当 |
| 7 | 必須フィールドの1つを型不一致値(数値・null・配列)に置換する | 型要求 |
| 8 | `choices[].description` を非文字列にする | description 型要求 |

生成器は上記変換の `fc.oneof` として構成する。**変換 6 は `Election.parse` を通過して `parseElectionFile` の手順 (2) で初めて落ちる**唯一のクラスであり、新設した `state` 照合の到達を保証する(lcov の DA で到達確認 — `cid:build-and-test:error-path-reach-lcov`)。

**注意(生成の健全性)**: 変換 6 の「`VALID_STATES` に無い文字列」は、生成した文字列が偶然7値のいずれかに一致しないことを生成側で保証する(例: 既知7値と衝突しない接頭辞を付ける)。これは棄却規則の再実装ではなく、**生成器が意図した非適合クラスを実際に作れていること**の保証である。

### 6.3 ブランド型の非生成(BR-ELRP-12)

`Goa`(`amadeus-election-model.ts:26` = `export type Goa = number & { readonly __brand: "Goa" };`)は `Goa.parse` が唯一の構築路であり、生成器から直接構築しない。本 unit のプロパティは ballot を扱わないため `Goa` は生成対象外だが、将来 ballot 系プロパティを足す場合も生成器は入力境界(数値)で止める(component-methods.md U8 末尾)。

---

## 7. 他 unit の型との照合(cross-unit-type-verbatim-check)

本 unit が参照する型のうち、**他 unit が正本を持つものは存在しない**。確認内訳:

| 型 | 正本の所在 | 本 unit との関係 |
| --- | --- | --- |
| `MirrorBoundaryReceipts` | `amadeus-state.ts`(components.md U3 の対象) | `state-pbt` unit が扱う。本 unit は**参照しない** |
| `Census` / `UncheckedCastMatch` / `GuardVerdict` | `tests/unchecked-cast-guard.ts`(新設、components.md U4) | `cast-guard` unit が所有。本 unit は**参照しない** |
| `Election` / `Choice` / `ElectionState` / `StoreError` / `ElectionFile` | 既存 core(本 unit の対象境界) | 本 unit が唯一の変更主体だが、**型定義自体は不変** |

したがって並行 unit 間の型形状の不一致(`cid:functional-design:cross-unit-type-verbatim-check`)が発生する面はない。共有するのは `tests/helpers/arbitraries/` ディレクトリのみで、ファイル単位で非交差(§6)。

---

## 8. 上流からの逸脱

なし。型の所有・生成境界・検証の所有はすべて component-methods.md U1 / U2 / U8 と decisions.md ADR-4 の裁定に一致する。

行番号の精密化1件(逸脱ではない): component-methods.md は `Choice.description` のコメントを「`amadeus-election-model.ts:51` 近傍」と記すが、HEAD 実読ではコメントが `:49-50`、型定義が `:51` である。本書は実読値を採る。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段1(破損した選挙台帳の読取時その場棄却=配布面/非対称バグの実装前検出=開発面)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が「新規 PBT ファイル群」として本 unit の PBT を深掘り対象に含むため、テストファイル命名・AMADEUS_PBT_DEEP 階層は services.md S2 の実行コマンド契約から参照される。
