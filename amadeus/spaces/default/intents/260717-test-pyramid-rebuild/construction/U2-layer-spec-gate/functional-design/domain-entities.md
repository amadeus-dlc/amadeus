上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

本ユニット U2 のユーザー価値は「層責務の規約を確立する — どの tier がどの size まで許容かを定め、逸脱を tier-aware に検出する設計を持つ」(unit-of-work-story-map.md の U2 段)。

# ドメインエンティティ — U2 層責務仕様 + tier-aware ドリフトゲート

本書は U2 が扱うドメイン型を functional-domain-modeling-ts スタイル(class-free、type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン Result — project.md「Code Style」DECIDED 2026-07-08)で定義する。**既存 `tests/lib/test-size.ts`(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)の型を再利用し、新規に発明しない**(component-methods.md:7、components.md C3)。実装は本 intent Out — 以下は設計上の型契約。現行 HEAD `ca7cbe1ab23b597f471f16cd70f9f31fd5382904`(`git rev-parse HEAD` 実測)。

## 再利用する既存ドメイン型(新規発明しない)

以下は `tests/lib/test-size.ts` に既存する現物であり、本ユニットは import して再利用する(component-methods.md「型注釈は既存 test-size.ts の型を再利用」):

| 型 | 定義 | 再利用の仕方 |
| --- | --- | --- |
| `TestSize` | `test-size.ts:23`(verbatim: `export type TestSize = "small" \| "medium" \| "large";`)判別ユニオン | `allowed` / `measured` の値型。新規 size 型を作らない |
| `SIZE_ORDER` | `test-size.ts:28`(verbatim: `export const SIZE_ORDER: Record<TestSize, number> = { small: 0, medium: 1, large: 2 };`) | 序数比較の唯一定義点。tier 上限判定で参照、再定義しない |
| `WallClockDrift` | `test-size.ts:106-108`(`{kind:"none"} \| {kind:"wall-clock";declared;measured}`) | `TierSizeViolation` の「不変条件を型で運ぶ」設計手本(同型) |
| `Tier` / `NamedTier`(C1/U1 で定義) | `Tier` = `NamedTier \| (string & {})` の開いた集合、`NamedTier` = `unit \| integration \| e2e \| smoke`(domain-entities.md D1、U1) | 規約対象の `NamedTier` は閉じた判別ユニオンを再利用、`Tier` 全体は harness/lib 等の補助 tier を含む開いた型(既存前提=ディレクトリ第1階層、A-2 の型付け) |

`Tier` は既存コード上は文字列(`scripts/metrics-snapshot.ts:100` の split 結果)であり、U1 の台帳型でも **開いた集合** として持つ(U1 domain-entities.md D1)。tests/ 全域再帰に整合し harness/lib 等の補助 tier を含む(E-TPR-NR1)。U2 はこれを再利用し、規約(size 上限)の網羅対象は `NamedTier` に限定する。新アノテーション契約を足さない(E-TPR-AD Q3=A、component-methods.md C3 tier 表現節)。

## D1: TierSizeViolation(判別ユニオン)

C3 の中核ドメイン型。tier 上限超過を判別ユニオンで表現する(component-methods.md C3、既存 `WallClockDrift`(`test-size.ts:106-108`)と同型):

```
type TierSizeViolation =
  | { readonly kind: "none" }
  | { readonly kind: "over-limit";
      readonly tier: NamedTier;     // 違反した行の tier(規約対象は NamedTier のみ)
      readonly allowed: TestSize;   // allowedMaxSize(tier) の上限
      readonly measured: TestSize } // classifyTestSize 由来の measured(C1)
```

- **不変条件を型で運ぶ**: `over-limit` は `SIZE_ORDER[measured] > SIZE_ORDER[allowed]` が成り立つときだけ構成される。スマートコンストラクタ `detectTierSizeViolation`(D3)経由でのみ生成し、「上限超過でないのに over-limit」を **表現不能** にする(既存 `WallClockDrift` / `detectWallClockDrift` `test-size.ts:113-121` と同型、components.md C3)。
- **各フィールドの実消費者**(装飾フィールド禁止、construction.md「文書のふりをしたフィールド禁止」):

| フィールド | 実消費者 | 用途 |
| --- | --- | --- |
| `kind` | `buildTierDriftReport`(D4)/ 呼び出し側分岐 | violation 有無の判別・網羅チェック |
| `tier` | `buildTierDriftReport` violations 集計 / 是正レポート(移設 intent) | どの tier の配置違反かを移設 intent(U3 選定台帳)へ渡す |
| `allowed` | 是正レポート・エラーメッセージ(移設 intent) | 「許容上限 X に対し measured Y」を人間可読で示す |
| `measured` | 是正レポート / U3 選定台帳の母集団 | 実際の size。tier 是正 or seam 化(FR-4)の選定材料 |

`allowed` / `measured` は移設 intent(FR-4 選定台帳、exit code メッセージ)が消費する。本 intent 内でも business-logic-model.md「RE 台帳適用結果」で `over-limit` 抽出に使う。装飾ではなく消費者を持つ。

## D2: Tier(開いた集合)/ NamedTier(規約対象、再利用)

```
type NamedTier = "unit" | "integration" | "e2e" | "smoke"   // size 上限規約の対象
type Tier = NamedTier | (string & {})   // + harness/lib 等の補助 tier(開いた型)
```

- 全域再帰実測でテスト tier は 4 named tier + harness/lib(各1件)を含む(unit-of-work.md:35-42、U1 実測)。`Tier` は開いた集合とし、任意のサブディレクトリ名(補助 tier)を許容する(E-TPR-NR1)。判別ユニオンの網羅は規約対象の `NamedTier` に対してのみ成立させる(parse-don't-validate、component-methods.md C2)。
- `allowedMaxSize(tier)` は入力ドメインを `NamedTier` とし網羅チェック(exhaustive)で写像(component-methods.md C2)。新しい named tier 追加時はコンパイルエラーで検知される。**harness/lib 等の補助 tier は規約対象外**で `allowedMaxSize` の入力ドメイン外(ゲート判定に含めない、台帳に可視化のみ)。

## D3: allowedMaxSize(規約写像 — 型ではなく純関数だがドメインルールの中核)

`NamedTier → TestSize`(上限)の写像。ドメイン規約の唯一定義点(business-rules.md R1)。入力ドメインは規約対象の `NamedTier` に限定し、harness/lib 等の補助 tier は対象外(E-TPR-NR1):

```
allowedMaxSize(tier: NamedTier): TestSize
  // unit -> "small" / integration -> "medium" / e2e -> "large" / smoke -> "medium"
```

- 独自 size 判定ではなく **規約テーブルの引き当て**(size 判定は `classifyTestSize` に閉じる、ADR-04)。smoke = medium は E-TPR-AD Q2=B(留保 e1: large は tier 是正対象)。

## D4: TierDriftReport(台帳全体の集計、First-Class Collection)

```
type TierDriftReport = {
  readonly violations: readonly Extract<TierSizeViolation, { kind: "over-limit" }>[]
  readonly summary: { readonly total: number; readonly violationCount: number }
}
```

- `buildTierDriftReport(ledger: SizeLedger): TierDriftReport`(component-methods.md C3)。台帳行のうち **`NamedTier`(規約対象4 tier)の行のみ** に `detectTierSizeViolation` を適用し `over-limit` のみ抽出。harness/lib 等の補助 tier 行はゲート集計から除外(E-TPR-NR1)。
- 集計ロジックをレポート型内に閉じる First-Class Collection(既存 `buildTestSizeReport` `test-size.ts:175-183` と同型 — summary math を型内に持つ)。
- **各フィールドの実消費者**: `violations` = 移設 intent の是正母集団(FR-4)/ business-logic-model.md 適用結果(RE 実測 163件)。`summary.total` / `summary.violationCount` = ガイドライン進捗の可視化(比率目標 R4 と対)・移設 intent のゲート exit(Out)。`Extract` で `none` を型レベル排除し、violations 配列に `none` が混入不能。

## スマートコンストラクタによる不変条件の保証(WallClockDrift 同型)

`TierSizeViolation` の `over-limit` は `detectTierSizeViolation`(business-rules.md R2、component-methods.md C3)を **唯一の構成経路** とする。裸のオブジェクトリテラルで `over-limit` を作らせない設計により、`SIZE_ORDER[measured] > SIZE_ORDER[allowed]` が偽の `over-limit`(= 規約内なのに violation)を **表現不能** にする。これは既存 `detectWallClockDrift`(`test-size.ts:113-121`)が「floor が declared 以下なら none」を保証するのと同型の不変条件搬送(parse-don't-validate、components.md C3)。

## 実装スコープ境界(Out 明記)

- 上記型・スマートコンストラクタの **実コード実装・CI 配線・落ちる実証・exit code 契約は移設 intent**(FR-3 AC-3b、unit-of-work.md:113)。本書は型契約の設計まで。
- 既存 `TestSize` / `SIZE_ORDER` / `WallClockDrift` / `Tier` は **再利用のみ**(変更しない、ADR-04/05)。新規 size 型・序数を発明しない。
- `FailReason` enum の materialize(fail-closed の 5値、`coverage-project-gate.ts:64-77` 同型テンプレート)は移設 intent(本 intent は方針参照のみ、business-logic-model.md fail-closed 節)。adapter/登録スロットの先行着地はしない(N3)。
