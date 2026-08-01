# Domain Entities — U1 dag-integrity

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U1 変更面(`amadeus-lib.ts` に「欠落理由型」を置く)を、下記 `BoltDagAbsence` の**配置モジュール**の根拠とした(U2 が同型を消費するため lib 側に置く)。
- `unit-of-work-story-map.md` の U1 ストーリー(「消えたら理由つきで止まる」)を、`BoltDagOutcome` が `absent` と `invalid` を**別アーム**として持つ設計理由(「理由つき」と「止まる」の 2 面)とした。
- `requirements.md` の FR-3(c)「runtime-graph に欠落理由の判別情報を残す(方式は design)」に対し、本書は方式を「`RuntimeGraph` の任意フィールド `bolt_dag_absence`」として確定する。AC-3c のテスト seam も本書で確定する。
- `components.md` の C5 / C6 の公開面指定(C5 = module-private、C6 = runtime-graph.json の任意フィールド)を、下記の export 方針にそのまま適用した。
- `component-methods.md` の C5 型定義ブロック(`BoltDagAbsence` / `BoltDagOutcome`)を **canonical として逐語照合**し、本書のアーム構成・フィールド名・リテラル値を一致させた(差分なし)。
- `services.md` の S3「本 intent で任意フィールドが 1 つ増える」を、`RuntimeGraph` インターフェース変更の上限(増やすのは 1 フィールドのみ)とした。

## 型定義(functional-domain-modeling-ts スタイル)

class を使わず、判別 union と型ガードのコンパニオンで構成する。すべて `readonly` で、構築後に変異しない。

### `BoltDagAbsence`(`amadeus-lib.ts`)

```ts
export type BoltDagAbsence = {
  readonly reason: "scope-skips-units" | "units-pending";
  readonly detail: string;
};
```

正常な欠落の理由。`reason` は 2 値のみ(business-rules.md BR-U1-3)。`detail` は人間向けの 1 文で、機械判定には使わない(判定は `reason` のみを見る)。

`amadeus-lib.ts` に置く理由: 生産者は runtime、消費者は orchestrate(U2 の `SwarmDecline` の `no-dag` アームが `BoltDagAbsence | null` を持つ — `component-methods.md` C2)であり、両者が共通で import できる位置は lib のみである。runtime に置くと orchestrate → runtime の新規依存が生じる。

### `BoltDagOutcome`(`amadeus-runtime.ts`)

```ts
type BoltDagOutcome =
  | { readonly kind: "dag"; readonly dag: BoltDag }
  | { readonly kind: "absent"; readonly absence: BoltDagAbsence }
  | { readonly kind: "invalid"; readonly reason: "absent" | "malformed" | "cyclic"; readonly detail: string };
```

`computeBoltDagOutcome` の戻り。`compile` からのみ使われるため module-private(export しない)。`invalid` の `reason` 語彙は `BoltDagParse`(`.claude/tools/amadeus-lib.ts:7767`)と同一で、`parseBoltDag` の戻りをそのまま横流しできる。

`BoltDag` は既存の `.claude/tools/amadeus-runtime.ts:117` `interface BoltDag {` を無改変で使う(`units` + `batches`)。

3 アームである理由: `absent`(正常な欠落・graph に理由を残す・exit 0)と `invalid`(不正・graph を書かない・非ゼロ終了)は**下流の扱いが完全に異なる**ため、1 つの「欠落」アームに `reason` で同居させると分岐が値の検査に退化する(判別 union の意味が消える)。

### `RuntimeGraph` の拡張(`amadeus-runtime.ts:122`–`:128`)

```ts
interface RuntimeGraph {
  workflow_id: string;
  scope: string;
  started_at: string;
  stages: RuntimeStage[];
  bolt_dag?: BoltDag;
  bolt_dag_absence?: BoltDagAbsence;   // 追加(bolt_dag と排他)
}
```

`bolt_dag` と `bolt_dag_absence` は**排他**である。両方が存在する graph は不正であり、テストで排他性を固定する。`dag` のときのキー順・内容は現行とバイト同一(BR-U1-8)。

## エンティティのライフサイクルと関係

```
amadeus-state.md ──parseCheckboxes──> units-generation の CheckboxState
                                              │
unit-of-work-dependency.md ──parseBoltDag──> BoltDagParse
                                              │
                                    computeBoltDagOutcome
                                              │
                          ┌───────────────────┼───────────────────┐
                        dag                absent              invalid
                          │                   │                   │
                 graph.bolt_dag    graph.bolt_dag_absence      throw(非ゼロ)
                          │                   │
                    (U2: readBoltDagBatches)  (U2: readBoltDagAbsence)
```

テキスト版: state のチェックボックスと artifact の parse 結果という 2 つの入力から `BoltDagOutcome` が 1 つ決まり、`dag` は `bolt_dag` へ、`absent` は `bolt_dag_absence` へ書かれ、`invalid` は graph を書かずに throw する。下流(U2)は前二者を別々の読み手で読む。

生存期間: `BoltDagOutcome` は `compile` の 1 呼び出し内でのみ存在する。永続化されるのは `bolt_dag` / `bolt_dag_absence` の 2 フィールドだけであり、これらは次回 `compile` で全面的に書き直される(累積しない)。

## テスト seam

`cid:code-generation:bun-coverage-spawn-blindspot` を避けるため、判定は in-process import で駆動できる形にする。

| seam | 公開面 | 駆動するテスト |
| --- | --- | --- |
| `computeBoltDagOutcome(projectDir, stateContent)` | runtime から export(テスト seam。`compile` の既存 export 前例に倣う — `.claude/tools/amadeus-runtime.ts:320` `export function compile(...)` は「CLI 統合テストは dist を spawn するため bun coverage に載らない」という同じ理由で export されている) | 判定表 6 行の全網羅(unit 層・実 FS 不要な範囲は純関数として) |
| `readBoltDagAbsence(projectDir)` | orchestrate 側(U2 が使う読み手。本 Unit で実装し AC-3c を固定する) | 欠落理由の下流判別 |
| `compile` の exit code | 既存 CLI(spawn) | AC-3a / AC-3a2 の Red 観測(exit code は in-process では観測できない) |

`computeBoltDagOutcome` は実 FS(`existsSync` / `readFileSync`)に触れるため、それを駆動するテストは integration 層へ置く(`cid:code-generation:fs-tests-integration-first`)。in-process 駆動(coverage 計測の軸)と unit/integration(配置の軸)は独立であり、integration 層に置いたまま in-process import で lcov に載せる。

`amadeus-lib.ts` 側の `BoltDagAbsence` は型のみで実行時コードを持たないため、型注釈行が lcov の DA:0 を作らないよう module スコープの `export type` 1 箇所に閉じる(`cid:code-generation:multiline-type-cast-da0` の予防)。

## 上流型との逐語照合

`component-methods.md` の C5 ブロック(canonical)と本書の型を照合した結果:

- `BoltDagAbsence` の `reason` リテラル 2 値・`detail: string` — 一致。
- `BoltDagOutcome` の 3 アームとフィールド名(`kind` / `dag` / `absence` / `reason` / `detail`)— 一致。
- U2 側の `SwarmDecline` の `no-dag` アームが持つ `absence: BoltDagAbsence | null` — 本書の `BoltDagAbsence` をそのまま受けられる(`null` は「graph 自体が読めない」場合を U2 が表現するためのもので、U1 の生産側には `null` アームは存在しない)。

差分なし。U1 が `BoltDagAbsence` の canonical 定義を持ち、U2 は参照側である(`cid:functional-design:cross-unit-type-verbatim-check`)。
