# Domain Entities — U2 issuance-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U2 変更面(`amadeus-orchestrate.ts` = 発行側、`amadeus-lib.ts` = `guardMessage`+純判定器)を、下記各型の**配置モジュール**の根拠とした。
- `unit-of-work-story-map.md` の U2 ストーリー「正しい出口(計画訂正 or ラダー)へ誘導する」を、`PlanIntegrityVerdict` が `redirect` と `violation` を**別アーム**として持つ設計理由(出口が2種あるため)とした。
- `requirements.md` の FR-4(3部メッセージ契約)に対し、本書は3部を `GuardMessageParts` の3フィールドと固定マーカー3定数として確定する。AC-4a のテスト seam も本書で確定する。
- `components.md` の C1 / C2 / C3 の公開面指定(C1 = module-private、C2 / C3 = export)を、下記の export 方針にそのまま適用した。
- `component-methods.md` の C1 / C2 / C3 型定義ブロックを **canonical として逐語照合**し、フィールド名・リテラル値を一致させた(差分は `SwarmDecline` の1アーム追加のみ — §上流型との逐語照合)。
- `services.md` の S1「新 directive kind を作らない」を、`SwarmEmitOutcome` が directive を表現せず**発行済みか否か**だけを表す設計(型が directive 語彙を持たない)の制約とした。

## 型定義(functional-domain-modeling-ts スタイル)

class を使わず、判別 union と純関数のコンパニオンで構成する。すべて `readonly` で、構築後に変異しない。

### `SwarmDecline`(`amadeus-lib.ts`)

```ts
export type SwarmDecline =
  | { readonly kind: "not-swarm-stage" }
  | { readonly kind: "skeleton-gate" }
  | { readonly kind: "autonomy-unset-pre-skeleton" }
  | { readonly kind: "autonomy-unset" }
  | { readonly kind: "no-dag" }
  | { readonly kind: "all-covered" };
```

> **申告付き是正(E-CPG-U2ABS 裁定、2026-08-02、2-0 GoA 2x2)**: 当初設計の `no-dag` アームは `absence: BoltDagAbsence | null` を carry したが、実装時に**どのコードも読まない**ことが確定した(no-dag → ok が無条件、U3 は非消費を明言 — approve-reconciliation/domain-entities.md:88)。construction.md Forbidden(未消費フィールド禁止)により field と `readBoltDagAbsence` のガード経路呼び出しを除去。留保転記: (1) U1 の `readBoltDagAbsence` は本除去後も U1 自身の成果物(AC-3c、t399 で pin)として存続し、消費者は U3 FD の将来条項どおり必要時に生まれる — orphan seam との誤読をしないこと。(2) 除去後は `readBoltDagAbsence`(orchestrate)と `graph.bolt_dag_absence`(runtime が書く)の production consumer がゼロになり、U1 FD dag-integrity/business-rules.md の consumer (i)(ii) が両方未成立で残る — この残余は U1 側 follow-up として build-and-test で再確認する(無音で消さない)。

`tryEmitSwarm` が swarm 発行に至らなかった理由。判定器の入力であり、`amadeus-lib.ts` に置く(生産者は orchestrate、消費者も orchestrate だが、判定器 `planIntegrityVerdict` が lib にあるため型も lib に置く — U1 の `BoltDagAbsence` が lib に置かれたのと同じ理由)。

`autonomy-unset-pre-skeleton` は AD canonical への**追加アーム**である(§上流型との逐語照合)。skeleton 完了前の未設定は「ラダーがまだ発火していない正当な初期状態」であり、完了後の未設定(= ラダー回答待ち)とは下流の扱いが完全に異なるため、値の検査(`skeletonComplete: boolean`)ではなくアームで分ける。

`no-dag` の `absence` が `null` を取りうるのは、runtime-graph 自体が読めず欠落理由すら取得できない場合を表現するためで、U1 の生産側(`computeBoltDagOutcome`)には `null` アームは存在しない。

### `PlanIntegrityVerdict`(`amadeus-lib.ts`)

```ts
export type PlanIntegrityVerdict =
  | { readonly kind: "ok" }
  | { readonly kind: "redirect"; readonly declaredWidth: number; readonly units: readonly string[] }
  | { readonly kind: "violation"; readonly declaredWidth: number; readonly units: readonly string[] };
```

`planIntegrityVerdict` の戻り。`redirect` と `violation` は形状が同一だが**出口が異なる**(前者は autonomy ラダー、後者は計画訂正)ため別アームとする。1アームに `exit` フィールドで同居させると、発行側の分岐が値の検査へ退化し、出口の取り違えが型で防げなくなる。

`declaredWidth` は `units.length` と常に一致する冗長フィールドではなく、**観測部の文言に載せる数値の唯一の出所**である(発行側で数え直さない — `cid:requirements-analysis:ledger-count-mechanical-recalc`)。構築時に `units` から機械的に導出する。

`units` は**宣言 batch 全体**の unit 名であり、未 cover 分ではない(`business-logic-model.md` §判定の入力)。

### `SwarmEmitOutcome`(`amadeus-orchestrate.ts`)

```ts
type SwarmEmitOutcome =
  | { readonly kind: "emitted" }
  | {
      readonly kind: "declined";
      readonly decline: SwarmDecline;
      readonly pendingBatch: { readonly number: number; readonly units: readonly string[] } | null;
    };
```

`tryEmitSwarm` の戻り(既存 `boolean` からの置換)。`emitted` は `invoke-swarm` または batch ゲート `ask` を**既に発行済み**であることだけを表し、どちらを発行したかは持たない — 呼び出し元がその区別で分岐しないためである(持たせると消費者のいないフィールドになる。construction.md Forbidden)。

module-private とする(消費者は `emitSwarmOrPerUnit` 1箇所のみ)。

### `GuardMessageParts` と canonical 定数(`amadeus-lib.ts`)

```ts
export type GuardMessageParts = {
  readonly observation: string;
  readonly weight: string;
  readonly exit: string;
};

export const GUARD_OBSERVED_MARKER = "Observed: ";
export const GUARD_WEIGHT_MARKER = "Why this matters: ";
export const GUARD_EXIT_MARKER = "Approved exit: ";
export const PLAN_DRIFT_WEIGHT = "...";        // 1定数1行(実文言は実装時に確定)
export const PLAN_CORRECTION_EXIT = "...";     // 1定数1行
export const AUTONOMY_LADDER_EXIT = "...";     // 1定数1行
```

3部の identity はマーカー3定数が担う。`GuardMessageParts` は3フィールド必須で、`undefined` を許す任意フィールドにしない — 任意にすると「部の欠落」が型で表現可能になり、AC-4a の検査がランタイムだけの保証に落ちる(parse-don't-validate の適用)。

各定数は**1定数1行**で書く(`cid:code-generation:bun-multiline-arg-da0` — 多行の文字列連結は継続行の DA:0 を作り codecov patch を偽赤にする)。文言は engine の既存ユーザー可視文字列と同じく英語で書く。

### U1 から import する型(再定義しない)

`construction/dag-integrity/functional-design/domain-entities.md` の canonical を逐語引用する。U2 は**参照側**である(`cid:functional-design:cross-unit-type-verbatim-check`)。

```ts
export type BoltDagAbsence = {
  readonly reason: "scope-skips-units" | "units-pending";
  readonly detail: string;
};
```

```ts
type BoltDagOutcome =
  | { readonly kind: "dag"; readonly dag: BoltDag }
  | { readonly kind: "absent"; readonly absence: BoltDagAbsence }
  | { readonly kind: "invalid"; readonly reason: "absent" | "malformed" | "cyclic"; readonly detail: string };
```

~~U2 が消費するのは `BoltDagAbsence` のみである。~~ **申告付き是正(E-CPG-U2ABS)**: 実装の結果、U2 は `BoltDagAbsence` を消費しない(no-dag → ok が無条件のため判定にも文言にも不要)。`BoltDagOutcome` が U1 の `compile` 経路で module-private である点は不変。`readBoltDagAbsence` は U1 の成果物として存続し、消費者は必要時に生む(U3 FD の将来条項)。

## コンパニオン(構築と判定)

公開面は `component-methods.md` が定める3関数(`planIntegrityVerdict` / `guardMessage` と U1 の `readBoltDagAbsence`)のままとし、コンパニオンは**新しい公開面を作らない** module-private ヘルパーとして置く。

| ヘルパー | モジュール | 役割 |
| --- | --- | --- |
| `redirectVerdict(units)` / `violationVerdict(units)` | lib(module-private) | `declaredWidth` を `units.length` から導出して verdict を構築する唯一の入口。呼び出し側が幅を手で渡す経路を作らない |
| `declaredBatchOf(batches, batchNumber)` | orchestrate(module-private) | `firstUncoveredBatch` の `batchNumber`(1-origin)から**宣言 batch 全体**を引く。off-by-one を1箇所に閉じる |

`SwarmDecline` の各アームには構築ヘルパーを置かない — 生産点が `tryEmitSwarm` 内の6箇所に固定されており、リテラルで書くほうが患部との対応が読める。

## エンティティのライフサイクルと関係

```
amadeus-state.md ──readAutonomyMode──────┐
                 ──skeletonGateCompleted─┤
runtime-graph.json ──readBoltDagBatches──┼──> tryEmitSwarm ──> SwarmEmitOutcome
                   ──readBoltDagAbsence──┘                          │
                                                    ┌───────────────┴───────────────┐
                                                 emitted                        declined
                                                    │                               │
                                          invoke-swarm / ask            planIntegrityVerdict
                                                                                    │
                                                        ┌───────────────┬───────────┴───────┐
                                                       ok            redirect           violation
                                                        │               │                   │
                                                  emitForSlug    ask(guardMessage)   error(guardMessage)
```

テキスト版: state と runtime-graph の読みから `SwarmEmitOutcome` が1つ決まり、`declined` の場合のみ純判定器が `PlanIntegrityVerdict` を返し、3値それぞれが既存の directive 1種へ写る。

生存期間: `SwarmDecline` / `PlanIntegrityVerdict` / `SwarmEmitOutcome` はいずれも `handleNext` の1呼び出し内でのみ存在し、**永続化されない**。ガードは state・audit・runtime-graph に何も書かない(BR-U2-11)。`GuardMessageParts` から作られた文字列だけが directive のフィールドとして stdout へ出る。

## テスト seam(t400 予約)

`cid:code-generation:bun-coverage-spawn-blindspot` を避けるため、判定と文言は in-process import で駆動できる純関数に閉じる。

| seam | 公開面 | 層 | 駆動するテスト |
| --- | --- | --- | --- |
| `planIntegrityVerdict(decline, pendingBatch)` | lib から export(`component-methods.md` C2) | unit(純関数・実 FS なし) | 判定表 9 行の全網羅(BR-U2-2)、未知理由の `violation` 既定(BR-U2-3) |
| `guardMessage(parts)` + マーカー3定数 | lib から export(C3) | unit | AC-4a(部欠落で Red・3部揃いで緑の両側)、観測部の数字実在 |
| `handleNext(...)` の in-process 呼び出し | 既存(`tests/unit/t186-foreach-per-unit-iteration.test.ts` / `tests/integration/t251-swarm-and-next-stage.test.ts` に前例) | integration(実 FS) | AC-1b の `ask` 発行、AC-1c の非発動6件が `run-stage` を保つこと |
| `tryEmitSwarm` / `emitSwarmOrPerUnit` | module-private | — | 直接は駆動しない(`handleNext` 経由で覆う)。呼び出し配線行の DA は push 前 lcov で個別確認する(`cid:code-generation:lcov-wiring-line-checklist`) |

実 FS を触るテストは integration 層へ置く(`cid:code-generation:fs-tests-integration-first`)。in-process 駆動(計測の軸)と unit/integration(配置の軸)は独立であり、integration に置いたまま lcov に載る。

## 上流型との逐語照合

`component-methods.md` の C1 / C2 / C3 ブロック(canonical)と本書の型を照合した結果:

- `PlanIntegrityVerdict` の3アームとフィールド名(`kind` / `declaredWidth` / `units`)— 一致。
- `GuardMessageParts` の3フィールド名(`observation` / `weight` / `exit`)と定数3本(`PLAN_CORRECTION_EXIT` / `PLAN_DRIFT_WEIGHT` / `AUTONOMY_LADDER_EXIT`)— 一致。マーカー3定数は AD が「3部の区切りは固定文字列(各部の先頭マーカー)」と規定したものの具体化であり、名前は本書で確定した。
- `SwarmEmitOutcome` の2アームとフィールド名(`kind` / `decline` / `pendingBatch`)— 一致。`pendingBatch` の要素を `readonly` 化した点のみ形式差(AD は `{ number: number; units: string[] }`)。不変性の統一であり意味差はない。
- `SwarmDecline` — **1アーム追加**(`autonomy-unset-pre-skeleton`)。AD canonical は5アームで、本書は6アーム。追加理由と代替案は `business-logic-model.md` §AD からの逸脱申告 D-1 に記載し、実装前の裁定事項として conductor へ申告する(設計側で黙って実装しない)。
- `BoltDagAbsence` — U1 canonical と完全一致(再定義せず import)。

差分は上記1件のみ。U2 は `BoltDagAbsence` の参照側、`SwarmDecline` / `PlanIntegrityVerdict` / `GuardMessageParts` の canonical 側である。
