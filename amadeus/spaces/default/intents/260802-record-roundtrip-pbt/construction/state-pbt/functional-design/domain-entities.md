# Domain Entities — unit `state-pbt` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**。business-logic-model.md / business-rules.md と同一断面。

本書は unit `state-pbt` が扱う型・スキーマと、その **正規化・検証の所有(どのコードが正本か)** を固定する。unit-of-work.md が本 unit を「プロダクション改修なしの純追加」と定めるとおり、**本 unit は新しいドメイン型を1つも導入しない**。導入するのはテスト側の生成器(arbitrary)だけであり、それらはすべて既存型の入力境界に留まる。

## 1. 型の所有(既存プロダクション型 — 本 unit は読むだけ)

### 層 A: `MirrorBoundaryReceipts` 系(所有 = `packages/framework/core/tools/amadeus-state.ts`)

実読による型定義(`:225-237`):

```ts
export const MIRROR_BOUNDARY_PHASES = [
  "ideation",
  "inception",
  "construction",
] as const;
export const PHASE_CHECK_REQUIRED_PHASES: ReadonlySet<string> = new Set(
  MIRROR_BOUNDARY_PHASES,
);
export type MirrorBoundaryPhase = (typeof MIRROR_BOUNDARY_PHASES)[number];
export type MirrorBoundaryReceiptStatus = "pending" | "completed";
export type MirrorBoundaryReceipts = Partial<
  Record<MirrorBoundaryPhase, MirrorBoundaryReceiptStatus>
>;
```

| 関心 | 所有 | 本 unit の扱い |
| --- | --- | --- |
| phase の語彙(3値)と**正準順序** | `MIRROR_BOUNDARY_PHASES`(`:225`) | 生成器はこの配列から phase を引く。テスト側で語彙を再宣言しない |
| status の語彙(2値) | `MirrorBoundaryReceiptStatus`(`:234`) | 同上。生成器は `"pending" \| "completed"` を `fc.constantFrom` で引く |
| 直列化表現の正規化(順序付け・未定義 phase の脱落) | `serializeMirrorBoundaryReceipts`(`:278`) | **テスト側で正規化を再実装しない**。P-ST1 はキー順非依存の深い等価で判定する(business-rules.md BR-ST-2) |
| 逆写像の検証(5棄却規則) | `parseMirrorBoundaryReceipts`(`:239`) | **テスト側で棄却規則を再実装しない**(`cid:build-and-test:pbt-oracle-cancellation`、business-rules.md BR-ST-3) |

**スキーマ(直列化形)**: `Mirror Boundary Receipts` フィールドに格納される JSON テキスト。トップレベルはオブジェクト、キーは `MIRROR_BOUNDARY_PHASES` の部分集合、値は 2 語彙のいずれか。空集合は `"{}"`(実測: `serializeMirrorBoundaryReceipts({})` = `"{}"`)。フィールド不在・空白のみは空集合と同義に読まれる(`:242`)。

### 層 B: state ファイルのテキストフィールド(所有 = `packages/framework/core/tools/amadeus-lib.ts`)

対象は「エンティティ」というより **1行のテキスト表現**である。スキーマは正規表現として実装に埋まっており、独立した型宣言を持たない。

| 要素 | 実装上の定義 | 実文 |
| --- | --- | --- |
| フィールド行の形 | `setField` の正規表現(`:5241-5244`) | `` `^(- \\*\\*${escapeRegex(field)}\\*\\*:)[ \\t]*.*$` ``(`m` フラグ) |
| 読み出しの形 | `getField` の正規表現(`:5184-5187`)と `:5189` | `  return match ? match[1].trim() : null;` |
| フィールド実在の判定 | `fieldExists`(`:5263`)→ `fieldLineRegex`(`:5255`) | `  return fieldLineRegex(field).test(content);` |
| フィールド名のエスケープ | `escapeRegex`(`amadeus-lib.ts:7692`) | `  return str.replace(/[.*+?^${}()\|[\]\\]/g, "\\$&");` |

`fieldExists` は `setFieldStrict` と共有される **正準の「フィールドが存在する」定義** である。`:5251-5253` のコメント実文:

```
// fieldLineRegex: the canonical `- **Field**:` line-head matcher. Shared by
// setFieldStrict and fieldExists so the two cannot drift on what "the field
// exists" means (both must agree with what setField actually mutates).
```

本 unit の P-ST3 / P-ST4 の受理ドメイン判定はこの述語をそのまま使い、**テスト側で「フィールドが在る」の定義を再実装しない**(business-rules.md BR-ST-9)。

**値ドメインの実測的制約**(business-logic-model.md §5 が実測で確定):書ける値と読み戻せる値は一致しない。行終端子4種(LF / CR / U+2028 / U+2029)と `String.prototype.replace` の置換パターン(`$&` / `` $` `` / `$'` / `$<n>` / `$$`)は round-trip を破る。これは**実装意味論の記述**であり、requirements.md A-2 が禁じる「`setField` の意味論変更」には当たらない。

## 2. 本 unit が導入する型(テスト側のみ)

配置は components.md U8 / component-methods.md「U8: arbitrary 群のシグネチャ」の指定どおり `tests/helpers/arbitraries/`(既存 `semver.ts` / `manifest.ts` の隣)。component-methods.md U8 が宣言したシグネチャを**逐語で採用し、追加・改名しない**。

### `tests/helpers/arbitraries/state-receipts.ts`

```ts
// component-methods.md U8 の宣言と逐語一致
export const receiptsArb: fc.Arbitrary<MirrorBoundaryReceipts>;   // P-ST1 用
export const nonConformingReceiptsTextArb: fc.Arbitrary<string>;  // P-ST2 用(5分岐へ対応)
```

| 生成器 | 生成対象 | 構成 | 制約(business-logic-model.md §3 表) |
| --- | --- | --- | --- |
| `receiptsArb` | 受理ドメイン内の `MirrorBoundaryReceipts` 値 | `MIRROR_BOUNDARY_PHASES` の部分集合(空集合を含む)を選び、各 phase に 2 語彙のいずれかを割り当てる。キーの挿入順は自由(正規化の効きを検査するため) | 型上表現できない値は作らない。ブランド型は存在しないため、値の直接構築で問題ない |
| `nonConformingReceiptsTextArb` | 棄却されるべき**生テキスト** | 5コンストラクタの `fc.oneof`:(1) 重複 phase キーを持つテキスト (2) JSON として壊れたテキスト (3) JSON 妥当だが非オブジェクト(`null` / 配列 / 数値 / 文字列 / 真偽値) (4) 未知 phase キー1個のオブジェクト (5) 既知 phase キー + 2 語彙外の status | 各コンストラクタは手前の分岐を踏まない。`null` / 空 / 空白のみを生成しない。キー名・status 値の生成アルファベットから `"` と `:` を除外し、分岐1(生テキスト走査)への逆流を構造的に断つ |

`nonConformingReceiptsTextArb` が **`unknown` 値ではなく生テキスト(`string`)を生成する**理由は、`parseMirrorBoundaryReceipts` の入力型が `string | null`(`:239-241`)であり、かつ分岐1が生テキストを直接走査する(`:245`)ためである。オブジェクト値からの `JSON.stringify` 経由では重複キーを表現できず、分岐1へ到達できない。

### `tests/helpers/arbitraries/state-field.ts`

```ts
// component-methods.md U8 の宣言と逐語一致
export const stateContentWithFieldArb: fc.Arbitrary<{ content: string; field: string }>;  // P-ST3 用
export const stateContentWithoutFieldArb: fc.Arbitrary<{ content: string; field: string }>; // P-ST4 用
export const fieldValueArb: fc.Arbitrary<string>;                 // 改行を含まない値
```

| 生成器 | 生成対象 | 構成 | 不変量 |
| --- | --- | --- | --- |
| `stateContentWithFieldArb` | `fieldExists(content, field) === true` を**構成的に**満たす対 | フィールド名候補(実 state ファイルの語彙に寄せた名前 + 正規表現メタ文字を含む名前)から1つ選び、`- **<field>**: <初期値>` 行を含む複数行の content を組み立てる。周囲に無関係な行(見出し・他フィールド)を混ぜる | `fc.pre` による事後フィルタを使わない(BR-ST-9)。生成後に `fieldExists` で自己検査してよいが、判定の**正本は `fieldExists`** |
| `stateContentWithoutFieldArb` | `fieldExists(content, field) === false` を満たす対 | 同様に content を組み立て、選んだ field 名の行を**含めない**。似た名前(前後に文字を足した名前)を混ぜて、部分一致で誤って存在判定されないことも同時に押さえる | 同上 |
| `fieldValueArb` | round-trip 可能な値 | 任意の Unicode 文字列から、行終端子4種と `$` を除外 | 空文字列・前後空白・タブ・非 ASCII を**含める**(除外を最小に保ち、プロパティの空洞化を避ける — business-logic-model.md R-2) |

**フィールド名の domain 注意**: `setField` / `getField` / `fieldExists` はいずれも `escapeRegex(field)` を通すため、フィールド名に正規表現メタ文字を含めてよい。ただし行終端子を含む名前は行頭アンカー `^...$` の前提を壊すため生成しない(値と同じ理由)。

## 3. 型の所在と cross-unit の照合

component-methods.md U8 は本 unit の生成器2ファイル(`state-receipts.ts` / `state-field.ts`)のほかに `election.ts`(`validElectionArb` / `invalidElectionFileArb` / `validElectionFileArb`)を宣言している。`election.ts` は unit `election-readpath` の所有であり、**本 unit は作成も参照もしない**。unit-of-work-dependency.md の batch 2 非交差宣言(「helpers 内は別ファイル」)が成立するのはこの分割による。

本 unit が参照する型はすべて `packages/framework/core/tools/amadeus-state.ts` / `amadeus-lib.ts` の **プロダクション正本**であり、他 unit の成果物が所有する型は1つもない。したがって cross-unit の型逐語照合(`cid:functional-design:cross-unit-type-verbatim-check`)の対象は、上記 §1 の実読引用そのものである(HEAD `c8702be09` で実読・引用済み)。

import 先は decisions.md ADR-1 のとおり core 正本に統一する:

```ts
import {
  MIRROR_BOUNDARY_PHASES,
  parseMirrorBoundaryReceipts,
  serializeMirrorBoundaryReceipts,
  type MirrorBoundaryReceipts,
} from "../../packages/framework/core/tools/amadeus-state.ts";
```

(`tests/unit/t265-engine-boundary.test.ts:13` 実文 `} from "../../packages/framework/core/tools/amadeus-state.ts";` と同じ相対深さ・同じ面。)

## 4. 検証・正規化の所有マップ(まとめ)

| 関心 | 正本 | 本 unit の役割 |
| --- | --- | --- |
| 受理する値の定義(層 A) | `parseMirrorBoundaryReceipts`(`amadeus-state.ts:239`) | プロパティで拘束するだけ。再実装しない |
| 正規化(層 A) | `serializeMirrorBoundaryReceipts`(`:278`) | 同上 |
| 「フィールドが存在する」の定義(層 B) | `fieldExists` / `fieldLineRegex`(`amadeus-lib.ts:5263` / `:5255`) | 受理ドメインの判定に使う。再実装しない |
| 値の trim 意味論(層 B) | `getField`(`:5189`) | 期待値の右辺に反映するだけ。変更提案しない(A-2) |
| 生成器の受理ドメイン | 本 unit(`tests/helpers/arbitraries/state-*.ts`) | **本 unit が唯一新規に所有する定義**。実装意味論の記述であり仕様ではない |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段2(state 2層の write⇔read 非対称の常時監視)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が本 unit の PBT を深掘り対象に含むため、AMADEUS_PBT_DEEP 階層の実装は services.md S2 の実行コマンド契約と整合させる。
