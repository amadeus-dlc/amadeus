# Frontend Components — unit `state-pbt` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**。

## N/A — 本 unit は UI を持たない

unit-of-work.md は本 unit を「AD U3(state 2層の round-trip + fail-closed)+ U8 の state 系 arbitrary。**プロダクション改修なしの純追加**」と定義し、components.md U3 / U8 も所在を `tests/unit/` と `tests/helpers/arbitraries/` に限定している。component-methods.md「U3」が設計するのは4つの純関数に対するプロパティ(P-ST1〜P-ST4)、「U8」が設計するのは fast-check の生成器シグネチャのみであり、いずれも画面・入力フォーム・レンダリング面を一切持たない。requirements.md の FR-2a〜2c / FR-4a〜4c にも利用者向けの視覚要素の要求はなく、decisions.md の ADR-1〜4 のうち本 unit に効く ADR-1 は import 面(`packages/framework/core/tools/` の正本を読む)の裁定にとどまる。unit-of-work-dependency.md が宣言する本 unit の書込面も「tests/unit+helpers」だけであり、UI 資産の置き場そのものがスコープに含まれない。したがってフロントエンドコンポーネントは **N/A** であり、本書はエンジンの produces 実在検査を満たすための薄い書として、UI の代わりに利用者(= 開発者と CI)が観測する出力契約を記す。

## 代替の出力契約(テストランナーの verdict と失敗時の情報)

本 unit の「利用者インタフェース」は、テストランナーの標準出力と終了コードである。

| 局面 | 観測される出力 | exit code |
| --- | --- | --- |
| PR CI(既定 numRuns 100・固定 `PBT_SEED`) | bun test の集計行(`Ran <N> tests across <M> files. [<t>ms]`)。新規2ファイル分のテストが計上される | 0 |
| プロパティが反例を発見 | fast-check がジョブログへ **seed / replay パス / 縮小反例** を出力する(PBT 規約第2項、canonical = `tests/unit/t204-audit-escape.pbt.test.ts:16-28`)。どのプロパティ(P-ST1〜P-ST4)かはテスト名で識別できる | 非 0 |
| 深掘り実行(`AMADEUS_PBT_DEEP=1`、後続 Bolt `pbt-deep-ci` が起動) | 同上。numRuns が 50,000 へ上がるため実行時間が延びるが、出力の形は変わらない | 同上 |
| 分岐到達の確認(実装時のみ) | lcov 上の `amadeus-state.ts:248 / :257 / :261 / :266 / :270` の DA が非 0(business-rules.md BR-ST-6) | — |

テスト名の付け方は、失敗時にどのプロパティが破れたかを出力だけで判別できるようにするための契約である:

- `P-ST1 round-trip: parse(serialize(receipts)) equals the receipts`
- `P-ST2 fail-closed: a non-conforming receipts text always throws`
- `P-ST3 round-trip: getField(setField(content, field, value)) equals value.trim()`
- `P-ST4 characterisation: setField on an absent field returns the content unchanged`

(接頭辞に `P-STn` を置くのは、business-logic-model.md §4 のプロパティ定義と失敗ログを1対1で対応させるためであり、`cid:requirements-analysis:verbatim-quote-with-cite` と同じ「照合を1手で可能にする」意図に沿う。)

## UI を持たないことの帰結(念のための除外)

- 画面・スタイル・アクセシビリティ・レスポンシブ要件は発生しない。
- 本 unit は CLI サブコマンドも新設しない(CLI 契約を持つのは別 unit `cast-guard` = services.md S1 側であり、本 unit の書込面には含まれない)。
- したがってユーザー可視契約の変更はゼロであり、requirements.md A-2(`setField` の現行挙動維持)を含め、外部から観測できる振る舞いは本 unit の着地前後で不変である。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段2(state 2層の write⇔read 非対称の常時監視)に対応する。
