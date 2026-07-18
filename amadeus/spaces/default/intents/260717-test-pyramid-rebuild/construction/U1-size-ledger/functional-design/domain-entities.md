上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

# ドメインエンティティ — U1 サイズ分類台帳(SizeLedger)

本書は U1 が扱うドメイン型を functional-domain-modeling-ts スタイル(class-free、type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン Result — project.md「Code Style」DECIDED 2026-07-08)で定義する。**既存 `tests/lib/test-size.ts`(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)の型を再利用し、新規に発明しない**(component-methods.md:7)。実装は本 intent Out — 以下は設計上の型契約。

## 再利用する既存ドメイン型(新規発明しない)

以下は `tests/lib/test-size.ts` に既存する現物であり、本ユニットは import して再利用する(component-methods.md:7、components.md:7)。

| 型 | 定義 | 再利用の仕方 |
| --- | --- | --- |
| `TestSize` | `test-size.ts:23`(verbatim: `export type TestSize = "small" \| "medium" \| "large";`)判別ユニオン | `measured` / `declared` の値型。新規 size 型を作らない |
| `SizeClassification` | `test-size.ts:42-45`(`{ size: TestSize; signals: readonly string[] }`) | `classifyTestSize` の戻り。`measured` / `signals` の材料 |
| `SizeAnnotation` | `test-size.ts:64-70`(`{ declared: TestSize \| null; invalidValue?: string }`) | `parseSizeAnnotation` の戻り。`declared` の材料 |
| `SIZE_ORDER` | `test-size.ts:28`(`Record<TestSize, number> = { small: 0, medium: 1, large: 2 }`) | 序数比較(集計・後続 U2 tier 判定で参照)。再定義しない |

`Tier` 型は既存コード上は文字列(`scripts/metrics-snapshot.ts:100` の split 結果)であり、本ユニットの台帳型でも **開いた集合** として持つ(下記 D1)。tests/ を全域再帰列挙する以上、tier は既知4 named tier に閉じず harness/lib 等の補助 tier を含む(E-TPR-NR1)。これは既存前提(ディレクトリ第1階層、A-2)の型付けであって新アノテーション契約ではない(E-TPR-AD Q3=A)。

## D1: Tier(開いた集合)/ NamedTier(規約対象)

```
// tier は tests/ 直下サブディレクトリ由来の開いた集合(判別ユニオンの網羅前提は撤回、E-TPR-NR1)
type NamedTier = "unit" | "integration" | "e2e" | "smoke"   // size ピラミッド規約(U2)の対象
type Tier = NamedTier | (string & {})   // + harness/lib 等の補助 tier(開いた型)
```

- 全域再帰実測でテスト tier は 4 named tier + harness/lib(各1件)を含む(unit-of-work.md:35-42)。`Tier` は開いた集合とし、既知 named tier のリテラル補完を残しつつ任意のサブディレクトリ名(補助 tier)を許容する(parse-don't-validate は規約対象の `NamedTier` に対してのみ網羅成立、component-methods.md:58-71)。
- tier×size 規約(U2)の対象は `NamedTier` のみで、**harness/lib 等の補助 tier は規約対象外**(台帳に可視化のみ、E-TPR-NR1)。
- 値の由来はディレクトリ第1階層の導出(R3、business-rules.md)。台帳は tier を **導出結果の転記** として持ち、独自の tier 判定規則を持たない。

## D2: LedgerRow(1テストファイル = 1行)

```
type LedgerRow = {
  readonly file: string               // repo 相対パス
  readonly tier: Tier                 // ディレクトリ第1階層の導出(R3)
  readonly measured: TestSize         // classifyTestSize(source).size の転記のみ
  readonly declared: TestSize | null  // parseSizeAnnotation(source).declared の転記
  readonly signals: readonly string[] // classifyTestSize(source).signals の転記(重複しうる)
}
```

- 出典 component-methods.md:25-31。`measured` / `declared` / `signals` は **すべて既存純関数出力の転記**(numbers-from-command-output-only、AC-1b)であり、台帳側の独自判定を含まない(ADR-04)。
- `readonly` で不変。`signals` は `readonly string[]`(1ファイルが複数 signal を持ちうる、`test-size.ts:53`)。
- **文書のふりをしたフィールドを持たない**: 各フィールドは消費者を持つ — `measured`/`signals`/`tier`/`file` はコレクタ・移設選定 C4・#683 整合 C5(components.md:29-33)、**`declared` は既存 declared-vs-measured ドリフトゲート**(`test-size.ts:16-21`)がその消費者(construction.md「Code Completeness」)。フィールドごとに実消費者が異なるため列挙を分けて明記する。

## D3: SizeLedger(First-Class Collection)

```
type SizeLedger = {
  readonly observedRef: string   // measurement-ref: observed HEAD SHA を必須保持
  readonly rows: readonly LedgerRow[]
  readonly matrix: Readonly<Record<`${Tier}_${TestSize}`, number>>  // test_pyramid コレクタ互換キー(Tier 開放によりキーは string 空間 — harness/lib 行も可視化)
}
```

- 出典 component-methods.md:39-43。`matrix` のキーはテンプレートリテラル型 `${Tier}_${TestSize}`(既存コレクタ `scripts/metrics-snapshot.ts:102` の `${tier}_${size}` と exact 一致、R5)。`Tier` が開いた型のためキー空間は `${string}_${TestSize}` に開き、harness/lib 等の補助 tier 行も同一キー形式で可視化される。
- **First-Class Collection**: 行コレクションと tier×size 集計を1つのドメイン型に閉じ、集計ルール(件数カウント)が消費側に散らばらないようにする(construction.md「First-Class Collection」、既存 `buildTestSizeReport` `test-size.ts:175-183` の summary math を型内に持つ設計と同型)。
- `observedRef` は measurement-ref を **型の必須フィールド** として運ぶ(measurement-ref-in-artifacts、component-methods.md:40)。ref 無しの台帳を表現不能にする。

## コンパニオン(スマートコンストラクタ / コレクション演算)

functional-domain-modeling-ts の役割分担(project.md functional-design:c11): ドメイン型は振る舞いを持ち、コンパニオンは parse/build/集計を持つ。本ユニットの build 関数(設計 IF、実装 Out):

```
buildLedgerRow(input: { file: string; tier: Tier; source: string }): LedgerRow
  // measured/declared/signals はすべて既存純関数(classifyTestSize / parseSizeAnnotation)出力の転記
  // 純関数。ソース読取は呼び出し側が所有(test-size.ts:81-82 の pure 設計踏襲)

buildSizeLedger(rows: readonly LedgerRow[], observedRef: string): SizeLedger
  // 行配列を tier×size マトリクスへ集計(First-Class Collection)
  // 出力は file 昇順ソートで決定的(既存 buildTestSizeReport test-size.ts:176 と同型)
```

- 出典 component-methods.md:33-48。両関数は純関数で FS を触らない(副作用は呼び出し側所有)。
- **判別ユニオン + スマートコンストラクタで不変条件を型に運ぶ**(既存 `WallClockDrift` `test-size.ts:101-121` の踏襲)。U1 では規約対象の `NamedTier` の網羅性(`Tier` 全体は開いた集合)と `SizeLedger.observedRef` 必須がその適用面。

## ブランド型の適用判断(過剰包装しない)

`ddd-when-to-wrap-primitives`(ラッパー型は正しさを変えるときだけ包む、construction.md)に従う:

- `NamedTier`(規約対象4 tier)は判別ユニオンで包む(size 上限規約の網羅 = 正しさを変える)。`Tier` 全体は開いた集合として補助 tier(harness/lib 等)を許容する。
- `TestSize` は既存判別ユニオンを再利用(包み直さない)。
- `file`(repo 相対パス string)・`observedRef`(SHA string)は体裁のための微小ブランド型を **作らない** — 取り違え防止・不変条件の追加価値が薄く、既存コード(`test-size.ts` の `file: string`)と整合させる。過剰包装は project.md「体裁のための微小型の乱造はしない」に反する。

## 実装スコープ境界(Out 明記)

- 本書はドメイン型の **設計** まで。型・コンパニオン関数の実コードは code-generation / 別 intent(実装スコープ境界の根拠は components.md:37-39・unit-of-work.md:66-69。FR-7 は実移設・ゲート実装等の Out を定める上位規定)。
- 動的計測型(`MeasuredTestRecord` / `WallClockDrift`、`test-size.ts:106-134`、#699)への拡張は Out(unit-of-work.md:69)。本ユニットは Phase A 静的分類の台帳型に閉じる。
- 既存型(`TestSize` / `SizeClassification` / `SizeAnnotation` / `SIZE_ORDER`)は不変で再利用(非破壊、新規発明しない)。
