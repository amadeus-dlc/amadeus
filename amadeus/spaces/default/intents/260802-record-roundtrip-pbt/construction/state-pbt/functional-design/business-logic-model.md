# Business Logic Model — unit `state-pbt` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: 本書の file:line・実測値はすべて **worktree HEAD `c8702be09`**(`git rev-parse HEAD`)での実読・実行による。application-design 群の測定 ref は `5a6f79727` だが、本ステージで対象2ファイルの当該行を実読し、component-methods.md「U3: state PBT のプロパティ関数」が挙げるシグネチャ行(`amadeus-state.ts:239` / `:278`、`amadeus-lib.ts:5179` / `:5237` / `:5263`)と5 throw 分岐行(`:248` / `:257` / `:261` / `:266` / `:270`)が HEAD でそのまま成立することを確認した。

## 1. 本 unit の位置づけ(スコープの確認)

unit-of-work.md の Unit 一覧は本 unit を「AD U3(state 2層の round-trip + fail-closed、140〜190)+ U8 の state 系 arbitrary(60〜90)。**プロダクション改修なしの純追加**」と定義し、対応 FR を FR-2a〜2c / FR-4a〜4c(state 側)としている。components.md の U3 も「依存: なし(読み側が既に fail-closed = architecture.md の層 (a) のため、プロダクション改修を伴わない純追加)」と同じ境界を引く。

したがって本 unit の業務ロジックは **既存プロダクション挙動の記述と固定** であって、挙動の設計ではない。`packages/framework/core/tools/` 配下は1行も変更しない(この帰結は §7 で NFR への含意として展開する)。

unit-of-work-dependency.md の YAML edge block は `state-pbt: depends_on: []` とし、batch 2(state-pbt / scope-ledger / mirror-property)で並行実行可能、書込面は「tests/unit+helpers」と宣言している。本書が定める新規ファイルはすべてその面の内側に収まる(§6)。同 edge block は `pbt-deep-ci: depends_on: [election-readpath, state-pbt, cast-guard]` でもあり、本 unit の PBT は後続 Bolt が `AMADEUS_PBT_DEEP=1` で走らせる対象になる — よって深掘り階層(requirements.md FR-4c 第4項)は本 unit で必ず実装する(未実装だと後続 Bolt の対象が欠ける)。

## 2. 対象境界(2層)と処理フロー

component-methods.md「U3」が対象シグネチャとして挙げる5関数のうち、本 unit がプロパティで拘束するのは4関数、前提述語として使うのが1関数(`fieldExists`)である。

### 層 A — 構造フィールド層(`Mirror Boundary Receipts`)

```
                    ┌──────────────────────────────────────────┐
  MirrorBoundary    │ serializeMirrorBoundaryReceipts (:278)   │   JSON テキスト
  Receipts(値) ──►│  MIRROR_BOUNDARY_PHASES(:225)順へ並べ替え │──► '{"ideation":...}'
                    │  未定義 phase は落とす(:283-284)         │
                    └──────────────────────────────────────────┘
                                                                        │
                    ┌──────────────────────────────────────────┐        │
  MirrorBoundary  ◄─│ parseMirrorBoundaryReceipts (:239)       │◄───────┘
  Receipts(値)      │  空/null → {}(:242)                      │
                    │  5つの棄却分岐(判定順は §3)            │
                    └──────────────────────────────────────────┘
```

書き手は **正規化書き手** である(`:281-285` 実文 `  const ordered: MirrorBoundaryReceipts = {};` / `  for (const phase of MIRROR_BOUNDARY_PHASES) {` / `    const status = receipts[phase];` / `    if (status !== undefined) ordered[phase] = status;` / `  }`)。この事実が、requirements.md FR-2a の「round-trip プロパティは『正規化後の同値』(`parse ∘ serialize = normalize`、正規化済み入力上では id)で張る」という指定と、component-methods.md P-ST1 の「逆向き `serialize ∘ parse = id` は**張らない**」という設計判断の根拠である。

### 層 B — テキストフィールド層(state ファイルの `- **Field**: value` 行)

```
  content ─┬─► fieldExists(content, field) (:5263) ──► true/false … 受理ドメインの判定子
           │
           └─► setField(content, field, value) (:5237)
                 ├─ 行が在る  → content.replace(regex, `$1 ${value}`) (:5246)
                 └─ 行が無い  → return content;  (:5248) ← サイレント no-op(A-2 で維持)
                        │
                        ▼
                 getField(content', field) (:5179) ──► match[1].trim()  (:5189) or null
```

requirements.md FR-2b と A-2 が「`setField` のフィールド不在時サイレント no-op という現行挙動は本 intent では変更しない」と定め、components.md U3 の「境界」節も「プロパティの受理ドメインを『フィールドが実在する content』に限定することで表現し、**挙動の変更提案は行わない**」と重ねている。本書はこれを **P-ST3(受理ドメイン内の条件付き round-trip)と P-ST4(受理ドメイン外の特性化)の2本に分けて固定** することで実現する。

## 3. 層 A の棄却規則 — 判定順序(生成器設計を規定する不変量)

`parseMirrorBoundaryReceipts` の5分岐は **直列で、先に立つ分岐が後続を覆い隠す**。この順序は本 unit のテストコードの正しさではなく、**生成器(arbitrary)の正しさ**を規定する:各コンストラクタが自分の意図した分岐へ到達するには、それより手前の分岐を踏まない入力を作らなければならない。

| 順 | 判定 | 行 | 判定材料 | 手前の分岐を踏まないための生成器制約 |
| --- | --- | --- | --- | --- |
| 0 | `raw === null` または `raw.trim() === ""` → `{}` を返す(棄却しない) | `:242` | 生テキスト | 棄却系生成器は null・空白のみの文字列を生成しない |
| 1 | 重複 phase | `:248` | **生テキストの正規表現走査**(`:245` 実文 `    const matches = raw.match(new RegExp(`"${escaped}"\\s*:`, "g"));`) | 他の4分岐用の入力は、テキスト中に `"<phase>"` + 任意空白 + `:` の並びを2回以上含めない |
| 2 | 不正 JSON | `:257` | `JSON.parse` の例外(`:253-255`) | 分岐1を踏まない壊し方(例: 先頭の `{` だけ)を使う |
| 3 | 非オブジェクト(null / 配列 / プリミティブ) | `:261` | `value === null \|\| typeof value !== "object" \|\| Array.isArray(value)` (`:260`) | JSON として妥当であること |
| 4 | 未知 phase | `:266` | `MIRROR_BOUNDARY_PHASES` 非包含(`:265`) | 既知 phase を1つも含まない/あるいは含めても分岐1を起こさない単一キー |
| 5 | 不正 status | `:270` | `status !== "pending" && status !== "completed"`(`:268`) | キーは既知 phase、値は 2 語彙以外の文字列。値の中に `"<phase>":` 相当の並びを埋め込まない(分岐1への逆流回避) |

**実測(本ステージで実行、read-only の scratch スクリプト経由 — 対象2関数を直接 import して呼ぶだけで、repo の状態は変更していない)**:

```
dup        throw: Mirror Boundary Receipts has duplicate phase "ideation"
badjson    throw: Mirror Boundary Receipts is invalid JSON: JSON Parse error: Expected '}'
nonobj-null throw: Mirror Boundary Receipts must be a JSON object
nonobj-arr  throw: Mirror Boundary Receipts must be a JSON object
nonobj-num  throw: Mirror Boundary Receipts must be a JSON object
nonobj-str  throw: Mirror Boundary Receipts must be a JSON object
unknown    throw: Mirror Boundary Receipts has unknown phase "operation"
badstatus  throw: Mirror Boundary Receipts has invalid status for "ideation"
whitespace-only: {}
```

5分岐すべてが単一欠陥入力で到達可能であることを確認した。component-methods.md P-ST2 が求める「生成器の各コンストラクタが 1 分岐に対応する」構成は実現可能である。

### 既存 example テストとの関係(重複と空白の把握)

`tests/unit/t265-engine-boundary.test.ts` の `describe("t265 mirror boundary receipts")` は、分岐1・2・4・5 を example で既にピンしている(`:57` `rejects invalid JSON` / `:61` `rejects unknown phases` / `:67` `rejects unknown statuses` / `:73` `rejects duplicate phases instead of accepting JSON last-write-wins`)。**分岐3(非オブジェクト、`:261`)だけは example が存在しない**(測定: `grep -rn "must be a JSON object" tests/` の3ヒットはいずれも `tests/deletion-gate.ts` / `tests/callsite-guard.ts` の別メッセージ)。

本 unit の P-ST2 はこの5分岐を **性質として一括で拘束する**ため、既存 example の再実装ではなく、その一般化かつ未被覆分岐の補完になる。t265 は変更しない(unit-of-work-dependency.md の batch 2 非交差宣言を守る)。

## 4. プロパティの業務ロジック定義(P-ST1〜P-ST4)

component-methods.md「U3」が定義した P-ST1〜P-ST4 をそのまま採用し、実装可能な水準まで判定の意味を確定する。**プロパティの新設・削除は行わない。**

### P-ST1(層 A・round-trip / 正規化後の同値)

- 命題: 任意の `r ∈ receiptsArb` について `parseMirrorBoundaryReceipts(serializeMirrorBoundaryReceipts(r))` が `r` と同値。
- **同値の定義**: キー順に依存しない深い等価(`expect(...).toEqual(r)`)。`serialize` が `MIRROR_BOUNDARY_PHASES` 順へ並べ替えるため、`r` の挿入順が異なっても等価判定は成立しなければならない。バイト等価では張らない。
- オラクル: なし(メタモルフィック)。`cid:build-and-test:pbt-oracle-cancellation` に非抵触 — 棄却規則も正規化規則もテスト側で再実装しない。
- 実測(空 receipts と順序入れ替え):`S({})` = `"{}"`、`P(S({}))` = `{}`;`S({construction:"pending", ideation:"completed"})` = `{"ideation":"completed","construction":"pending"}`、その parse は `{"ideation":"completed","construction":"pending"}` — 挿入順と無関係に元の集合が復元される。

### P-ST2(層 A・fail-closed / 5 throw 分岐の否定側)

- 命題: 任意の `s ∈ nonConformingReceiptsTextArb` について `parseMirrorBoundaryReceipts(s)` が throw する。
- **判定はメッセージ文言で行わない**(component-methods.md P-ST2 の指定)。`expect(() => ...).toThrow()` のみ。棄却理由の再判定はテスト側に置かない。
- 分岐到達の担保: 生成器の5コンストラクタが §3 の表の制約を満たすこと。到達の実測は lcov の DA で確認する(`cid:build-and-test:error-path-reach-lcov`)。

### P-ST3(層 B・条件付き round-trip)

- 命題: `fieldExists(content, field) === true` かつ `value` が受理ドメイン(§5)に属するとき、`getField(setField(content, field, value), field) === value.trim()`。
- 右辺が `value.trim()` である理由は `getField` の実装意味論(`:5189` 実文 `  return match ? match[1].trim() : null;`)の直接反映であり、`setField` の意味変更ではない(requirements.md A-2 / component-methods.md P-ST3 の明記どおり)。

### P-ST4(層 B・サイレント no-op の特性化)

- 命題: `fieldExists(content, field) === false` のとき、任意の `value` に対し `setField(content, field, value) === content`(**バイト同一**)。
- 意図: requirements.md A-2 の「現行挙動を維持する」をプロパティとして固定し、将来の意図せぬ変更を赤にする。仕様変更の禁止ではなく、無音の変更の禁止である。
- 実測: `fieldExists(c, "Z")` = `false`、`setField(c, "Z", "v") === c` = `true`。

## 5. 層 B の受理ドメイン(本ステージの実測による確定)

component-methods.md P-ST3 は値の制約を「改行を含まない」と記していた。本ステージで `getField ∘ setField` を実測したところ、**round-trip を破る入力クラスは改行以外にも実在する**。設計判断そのものは変えず、AD が示した「生成器の側で除外する(仕様の記述であり変更提案ではない)」方針を、実測に接地した具体的な除外集合へ精密化する。

実測(HEAD `c8702be09`、`content = "- **F**: old\n- **G**: x\n"`、`field = "F"`):

| 入力 `value` | `getField(setField(...))` | `value.trim()` | 判定 |
| --- | --- | --- | --- |
| `"plain"` | `"plain"` | `"plain"` | OK |
| `"  sp  "` | `"sp"` | `"sp"` | OK |
| `""` | `""` | `""` | OK |
| `"a\tb"` | `"a\tb"` | `"a\tb"` | OK |
| `"a b"`(U+0020) | `"a b"` | `"a b"` | OK |
| `"a\nb"`(LF) | `"a"` | `"a\nb"` | MISMATCH |
| `"a\rb"`(CR) | `"a"` | `"a\rb"` | MISMATCH |
| `"a" + U+2028 + "b"`(LINE SEPARATOR) | `"a"` | 左辺そのもの | MISMATCH |
| `"a" + U+2029 + "b"`(PARAGRAPH SEPARATOR) | `"a"` | 左辺そのもの | MISMATCH |
| `"$&"` | `"- **F**: old"` | `"$&"` | MISMATCH |
| `` "$`" `` | `""` | `` "$`" `` | MISMATCH |
| `"$'"` | `""` | `"$'"` | MISMATCH |
| `"$1"` | `"- **F**:"` | `"$1"` | MISMATCH |
| `"a$$b"` | `"a$b"` | `"a$$b"` | MISMATCH |

機序は2つある。

1. **行終端子**: `setField` / `getField` の正規表現は `m` フラグ付きで `.` と `$` を使う(`:5242` 実文 `` `^(- \\*\\*${escapeRegex(field)}\\*\\*:)[ \\t]*.*$` `` / `:5185` 同型)。JavaScript の `.` は行終端子(LF / CR / U+2028 / U+2029)にマッチせず、`m` 付き `$` はその手前にマッチする。したがって行終端子を含む値は書けても読み戻せない。AD の「改行」を **行終端子4種** へ拡張する。
2. **置換パターン**: `setField` の書き込みは `content.replace(regex, `$1 ${value}`)`(`:5246`)であり、`value` は **置換文字列として解釈される**。`$&` `` $` `` `$'` `$<n>` `$$` は `String.prototype.replace` の特殊シーケンスとして展開されるため、書かれるバイト列が `value` と異なる。AD が明示していなかった第2の除外クラスである。

**確定**: `fieldValueArb`(component-methods.md U8 の「改行を含まない値」)の受理ドメインを **「行終端子4種を含まず、かつ `$` を1文字も含まない文字列」** とする。`$` の全面除外は必要条件より強い(`$x` のような無害な並びも落とす)が、判定を1文字の有無に落として生成器を単純に保つ選択である。これは実装意味論の記述であり、`setField` の挙動変更提案ではない(A-2 を維持)。

**この精密化は AD からの逸脱ではない** — AD が委ねた「生成器の側で除外する」の中身を実測で埋めたものであり、プロパティの本数・向き・受理ドメインの立て方(条件付き round-trip)はいずれも component-methods.md P-ST3 のままである。

## 6. 成果物(新規ファイル)と実行契約

decisions.md ADR-1(新規 PBT / arbitrary は **core 正本 import** に統一)に従い、import 先は `packages/framework/core/tools/` とする。対象境界の既存テスト `tests/unit/t265-engine-boundary.test.ts:13` 実文 `} from "../../packages/framework/core/tools/amadeus-state.ts";` と同じ面であり、ADR-1 Rationale 3(兄弟テストとの局所整合)がそのまま成立する。

| 新規ファイル | 内容 | 層 | 見積 |
| --- | --- | --- | --- |
| `tests/unit/t418-state-receipts-codec.pbt.test.ts` | P-ST1 / P-ST2 | unit(size: small) | 70〜95 行 |
| `tests/unit/t419-state-field-codec.pbt.test.ts` | P-ST3 / P-ST4 | unit(size: small) | 70〜95 行 |
| `tests/helpers/arbitraries/state-receipts.ts` | `receiptsArb` / `nonConformingReceiptsTextArb` | helper | 35〜50 行 |
| `tests/helpers/arbitraries/state-field.ts` | `stateContentWithFieldArb` / `stateContentWithoutFieldArb` / `fieldValueArb` | helper | 25〜40 行 |

合計 **200〜280 行** — unit-of-work.md が本 unit へ割り当てた「テスト・helper 200〜280行」と一致する(機械再計算: 下限 70+70+35+25 = 200、上限 95+95+50+40 = 280)。ファイル名・所在は components.md U3(`tests/unit/`)/ U8(`tests/helpers/arbitraries/`、既存 `semver.ts` / `manifest.ts` の隣)の指定どおりで、unit-of-work-dependency.md batch 2 が宣言した非交差面(tests/unit + helpers、helpers 内は別ファイル)を越えない。

- **層の適合**: 両テストとも実 FS に触れない純関数テストである。`tests/lib/test-size.ts:38` の filesystem シグナル正規表現(`\bnode:fs\b|from ["']fs["']|\breadFileSync\b|…`)に **テストファイル自身のソースが**一致しないことが `size: small` 宣言の成立条件であり(`:49` `classifyTestSize` は当該ファイルのソーステキストを走査する)、`cid:code-generation:fs-tests-integration-first` の「unit は純関数層に限る」と整合する。
- **実行 tier**: requirements.md FR-4b のとおり `test:ci`(= smoke + unit + integration、`tests/run-tests.ts:117`)に自動的に載る。新規ランナーは不要(components.md Reuse inventory「実行 tier」の再利用)。
- **PBT 規約4項**(requirements.md FR-4c / component-methods.md「全メソッド共通の規約」): 各ファイル冒頭に `tests/unit/t204-audit-escape.pbt.test.ts:16-28` の4項規約ヘッダを置き、`const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };`(t204:41 と同型)で深掘り階層を持つ。第3項(縮小反例の example-based ピン)は、本 unit のプロパティが実バグを捕らえた場合に発動する運用条項として規約ヘッダに明記する(既知バグ再現の義務は FR-4d = election 側の要件であり、state 側には課されていない)。

## 7. 非機能要件の当たり(本 unit への含意)

- **NFR-1(投影同期)/ NFR-2(coverage patch)/ NFR-3(境界契約)**: いずれも `packages/framework/core/tools/` を触る変更に課される条件であり、**本 unit には適用されない**。unit-of-work.md「全 Unit 共通の実装制約」が「election-readpath のみ `packages/framework/core/` を触る」と明示している。本 unit は dist 再生成を発生させない(発生したら、それは純追加という前提が破れた合図として停止する)。
- **NFR-4(決定性・実行時間)**: 固定 `PBT_SEED` + 既定 numRuns 100。新規 PBT ファイル群の直接実行合計が 2 秒以内という上限は本 unit の2ファイルにも適用される。`AMADEUS_PBT_DEEP=1` の深掘りは上限の対象外(PR CI の階層ではない)。
- **NFR-5(既存ゲート)**: 現行ブロッキング集合の全緑維持。純テスト追加のため coverage relative / complexity への影響は測定で確認する。
- **C-1(TDD 既定)**: requirements.md C-1 は「PBT 追加自体も対象境界の seam へ失敗プロパティを先に張れる場合は Red を実測する」。本 unit の対象はすでに fail-closed / 正規化済みの既存実装であり、**正しい実装に対して赤を出す失敗プロパティは存在しない**。したがって Red は「プロパティを先に書き、arbitrary 未実装で落ちる」形ではなく、**各プロパティの実効性を pre-fix 面切替で1回ずつ実測する**形で担保する(BR-ST-11)。

## 8. リスク

| ID | リスク | 緩和 |
| --- | --- | --- |
| R-1 | 生成器が判定順序(§3)を無視し、意図した分岐へ到達しない(P-ST2 が実質1分岐しか検査しない偽の緑) | 5コンストラクタごとに到達を lcov DA で実測(BR-ST-6)。生成器の制約は §3 表を正本とする |
| R-2 | `fieldValueArb` の除外集合が広すぎて、実質的に無害な文字列しか生成せずプロパティが空洞化する | 除外は行終端子4種と `$` のみ。Unicode・制御文字・空文字列・前後空白は残す(BR-ST-8) |
| R-3 | tNNN 採番が Bolt 1(election-readpath)と衝突する | 着手時に固定 base SHA の `tests/` 実測で再確認(BR-ST-12)。現時点の最大は t415(測定: `ls tests/unit tests/integration \| grep -oE '^t[0-9]+' \| sed 's/^t//' \| sort -n \| tail -1`) |
| R-4 | `PBT_SEED` が既存ファイルと重複し、規約第1項の「ファイルごとに固定」の意図が薄れる | 着手時に `grep -rn "PBT_SEED = " tests/` で重複確認(BR-ST-13) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段2(state 2層の write⇔read 非対称の常時監視)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が本 unit の PBT を深掘り対象に含むため、AMADEUS_PBT_DEEP 階層の実装は services.md S2 の実行コマンド契約と整合させる。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:26:04Z
- **Iteration:** 1
- **Scope decision:** none

無申告逸脱なし。P-ST3 受理ドメイン精密化(行終端子4種+$ 除外)は AD 委任範囲内で言語仕様に照らし妥当、A-2 不変、P-ST2 はオラクル相殺回避。GoA 1-2。Minor 2件(レビュー手続きの scope 外読取の自己開示・AD への相互参照提案)は verdict に影響なし。

### Findings

- [Minor] レビュー手続き — 許可外 unit-of-work-dependency.md を check-read なしで参照(内容は FD 引用と一致、影響なしと自己開示)
- [Minor] AD component-methods.md への相互参照提案(非ブロッキング・見送り)
