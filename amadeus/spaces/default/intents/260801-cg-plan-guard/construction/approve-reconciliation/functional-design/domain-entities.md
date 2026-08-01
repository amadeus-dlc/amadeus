# Domain Entities — U3 approve-reconciliation

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U3 変更面(`amadeus-orchestrate.ts` / `amadeus-state.ts` の approve 経路、audit 読みは `readAllAuditShards` 再利用)を、下記各型の**配置モジュール**の根拠とした(判定型は lib、収集の実体は orchestrate)。
- `unit-of-work-story-map.md` の U3 ストーリー「approve で必ず表面化する」を、`SwarmEvidenceVerdict` が `missing` に**不足 batch の全数**を載せる設計理由(表面化とは不足の名指しである)とした。
- `requirements.md` の FR-2(AC-2a / AC-2b / AC-2c)を各アームの意味へ 1 対 1 で写し、AC-4a(approve 側)のテスト seam を本書で確定する。
- `components.md` の C4a / C4b の公開面指定(C4a = export、C4b = module-private)を、下記の export 方針にそのまま適用した。
- `component-methods.md` の C4a 型定義ブロック(`SwarmEvidence` / `SwarmEvidenceVerdict`)を **canonical として逐語照合**し、本書のアーム構成・フィールド名・リテラル値を一致させた(差分は `readonly` 化の形式差のみ — §上流型との逐語照合)。
- `services.md` の S2「証拠源の限定 — 突合に使えるのは audit の SWARM イベントだけ」を、`SwarmEvidence` が batch 番号の集合しか持たない(タイムスタンプ・ファイル情報を持たない)設計の制約とした。

## 型定義(functional-domain-modeling-ts スタイル)

class を使わず、判別 union と純関数のコンパニオンで構成する。すべて `readonly` で、構築後に変異しない。

### `SwarmEvidence`(`amadeus-lib.ts`)

```ts
export type SwarmEvidence = {
  readonly startedBatches: ReadonlySet<number>;   // SWARM_STARTED ∪ SWARM_DEGRADED
  readonly completedBatches: ReadonlySet<number>; // SWARM_COMPLETED
};
```

audit から抽出した実績の要約。生産者は `collectSwarmEvidence`(orchestrate)、消費者は `swarmEvidenceVerdict`(lib)であり、両者が共通で import できる位置は lib のみである(U1 の `BoltDagAbsence` が lib に置かれたのと同じ理由)。

**batch 番号の集合しか持たない**のが要点である。タイムスタンプ・unit 名・concurrency cap・converged/failed 件数は載せない。理由は 2 つある。

1. 判定に使わない情報を運ぶと、後から「時刻の近接で並行性を推定する」といった ADR-3 が却下した経路(Alternatives Rejected B)への誘引になる。
2. **unit 名は 3 イベントで共通に取れない**。実測した emitter の実引数は `SWARM_STARTED` が `"Unit names"`(複数形・カンマ連結、`.claude/tools/amadeus-swarm.ts:348`)、`SWARM_UNIT_CONVERGED` が `"Unit name"`(単数形、`:374`)、`SWARM_DEGRADED` は**unit 名フィールドを持たない**(`:359-365` は `"Batch number"` / `"Requested driver"` / `"Fallback driver"` の 3 つ)。3 種に共通するキーは `"Batch number"` だけであり、それだけを運ぶ。

`ReadonlySet<number>` とするのは、集合演算(`has`)しか行わず順序・重複に意味がないためである。同一 batch の `SWARM_STARTED` が複数行ある実測(`260717-swarm-dispatch-enum` の batch 2 = 3 行)を集合が自然に吸収する。

### `SwarmEvidenceVerdict`(`amadeus-lib.ts`)

```ts
export type SwarmEvidenceVerdict =
  | { readonly kind: "satisfied" }
  | {
      readonly kind: "missing";
      readonly batches: readonly {
        readonly number: number;
        readonly units: readonly string[];
      }[];
    };
```

`swarmEvidenceVerdict` の戻り。`missing` の `batches` は**不足している対象 batch の全数**であり、最初の 1 件ではない(BR-U3-4)。各要素は batch 番号(1-origin)と**宣言 batch 全体**の unit 名を持つ — 未 cover 分ではない。approve は全 unit covered 後にのみ到達するため、この時点で「未 cover 分」という概念は存在しない。

`units` を持たせる理由は 3 部メッセージの観測部に載せる値の唯一の出所にするためである(BR-U3-8 項 2)。メッセージ組み立て側で `batches` を引き直して数え直さない(`cid:requirements-analysis:ledger-count-mechanical-recalc`)。

`satisfied` にペイロードを持たせない。「何件の batch を検査したか」は誰も消費しないため、載せれば消費者のいないフィールドになる(construction.md Forbidden)。

### コンパニオン(構築と判定)

公開面は `component-methods.md` が定める 1 関数(`swarmEvidenceVerdict`)のままとし、コンパニオンは**新しい公開面を作らない** module-private ヘルパーとして置く。

| ヘルパー | モジュール | 役割 |
| --- | --- | --- |
| `wideBatchesOf(batches)` | lib(module-private) | `batches` から幅≥2 の `{number, units}` を作る唯一の入口。1-origin 変換(`index + 1`)を 1 箇所に閉じ、off-by-one を封じる |
| `batchNumberOf(block)` | orchestrate(module-private) | 1 audit ブロックから batch 番号を取る唯一の入口。`auditBlockField(block, "Batch number")` → 空文字の排除 → `Number` → `Number.isFinite` の順を固定する(BR-U3-5) |

`SwarmEvidence` の構築ヘルパー(`emptyEvidence()` 等)は置かない。生産点が `collectSwarmEvidence` 1 箇所に固定されており、リテラルで書くほうが読める。

### `collectSwarmEvidence`(`amadeus-orchestrate.ts`)

```ts
function collectSwarmEvidence(projectDir: string): SwarmEvidence;
```

module-private(消費者は approve ガード 1 箇所のみ)。`readAllAuditShards(projectDir)`(`.claude/tools/amadeus-lib.ts:4335`)→ `findAllEvents(audit, <event>)`(`:6361`)→ `batchNumberOf` の 3 段で 2 つの集合を作る。

`findAllEvents` は内部で `splitAuditRecords` を呼び JSONL 1 行 = 1 レコードへ分解し、`auditBlockField(block, "Event")` で種別照合したうえで時刻順にソートして返す。本 Unit は**その内側へ入らない** — 行分割も JSON 解析も自前で書かない。理由は audit が 2 世代のスキーマを同一 shard 内に混在させるためで、種別の所在(v1 は `event`、v2 は `attributes.Event` / `eventName`)とフィールドの所在(v1 は `fields`、v2 は `attributes`)の差は `journalRecordField`(`.claude/tools/amadeus-journal.ts:130-144`)が吸収する。自前解析は v2 レコードを無音で取りこぼす(実測: v2 レコードを含む shard が 4 ファイル実在)。

## U1 / U2 から import する型(再定義しない)

U3 は `SwarmEvidence` / `SwarmEvidenceVerdict` の canonical 側であり、下記 2 型については**参照側**である(`cid:functional-design:cross-unit-type-verbatim-check`)。canonical は各 Unit の `domain-entities.md` であり、逐語引用する。

U1(`construction/dag-integrity/functional-design/domain-entities.md`)より:

```ts
export type BoltDagAbsence = {
  readonly reason: "scope-skips-units" | "units-pending";
  readonly detail: string;
};
```

U3 は `BoltDagAbsence` を**消費しない**。approve 側の非対象判定は `readBoltDagBatches(pd)` の `null` で足りる(BR-U3-2 行 2)ためで、欠落理由の区別は発行側(U2)が必要とする情報である。将来 approve のメッセージで degrade の理由を名指す必要が出た場合に限り `readBoltDagAbsence` を読む — その時点で消費者が生まれる。

U2(`construction/issuance-guard/functional-design/domain-entities.md`)より:

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

U3 が消費するのは `GuardMessageParts` と `guardMessage`、および定数 `GUARD_OBSERVED_MARKER` / `GUARD_WEIGHT_MARKER` / `GUARD_EXIT_MARKER` / `PLAN_DRIFT_WEIGHT` / `PLAN_CORRECTION_EXIT` である。`AUTONOMY_LADDER_EXIT` は redirect 専用で approve 側は使わない(approve の出口は計画訂正の一本 — BR-U3-7)。**approve 専用の定数・組み立て器を新設しない**。

依存方向の含意: U3 は U2 の着地(`guardMessage` と定数の export)を前提とする。`unit-of-work.md` の DAG(`approve-reconciliation` は `depends_on: [issuance-guard]`)と一致する。

## エンティティのライフサイクルと関係

```
runtime-graph.json ──readBoltDagBatches──> string[][]（宣言 batch）
                                                │
audit/*.jsonl ──readAllAuditShards──> buffer    │
                       │                        │
                 findAllEvents ×3               │
                       │                        │
              collectSwarmEvidence              │
                       │                        │
                 SwarmEvidence ─────────────────┤
                                                │
                                     swarmEvidenceVerdict
                                                │
                                ┌───────────────┴───────────────┐
                            satisfied                        missing
                                │                               │
                       既存の approve 経路へ           error(guardMessage) + return
                       (sequence を組んで dispatch)     （state も audit も書かない）
```

テキスト版: runtime-graph 由来の宣言 batch と audit 由来の実績要約という 2 つの入力から `SwarmEvidenceVerdict` が 1 つ決まり、`satisfied` は従来の approve 経路へ素通りし、`missing` は 3 部メッセージの `error` directive を出して `return` する。

生存期間: `SwarmEvidence` / `SwarmEvidenceVerdict` はいずれも `handleReport` の 1 呼び出し内でのみ存在し、**永続化されない**。突合結果は audit・state・runtime-graph のどこにも書かれない(BR-U3-6 — 書けば次回の突合が自分の書いた行を読む自己参照検証になる)。`GuardMessageParts` から作られた文字列だけが directive の `message` フィールドとして stdout へ出る。

## テスト seam(t401 予約)

`cid:code-generation:bun-coverage-spawn-blindspot` を避けるため、判定は in-process import で駆動できる純関数に閉じる。

| seam | 公開面 | 層 | 駆動するテスト |
| --- | --- | --- | --- |
| `swarmEvidenceVerdict(batches, evidence)` | lib から export(`component-methods.md` C4a) | unit(純関数・実 FS なし) | 判定表の全網羅 — 全幅 1(AC-2c)、実績 0(AC-2a)、STARTED+COMPLETED(AC-2b)、DEGRADED+COMPLETED(AC-2b)、DEGRADED のみ(不足)、部分実績(BR-U3-4) |
| `guardMessage(parts)` + マーカー 3 定数 | lib から export(U2 が実装) | unit | AC-4a approve 側 — 3 部揃いで緑・1 部欠落で赤の両側、観測部に不足 batch 番号と unit 名が実在すること |
| `handleReport(...)` の in-process 呼び出し | 既存(`tests/unit/t211-swarm-batch-progress.test.ts:195` の `runReport` ヘルパーが前例) | integration(実 FS) | AC-2a の `error` 発行、AC-2c の非発動、既存 pin(t211 `:391-399` の l)が緑を保つこと |
| `collectSwarmEvidence(projectDir)` | module-private | integration | 直接は駆動せず `handleReport` 経由で覆う。v1 / v2 混在 shard と非数値 `"Batch number"` の fixture を置き、集合の中身を verdict 経由で観測する |
| corpus sweep(C7) | tests のみ | integration | live record 10+1 を読み取り専用で走査(BR-U3-15) |

実 FS を触るテストは integration 層へ置く(`cid:code-generation:fs-tests-integration-first`)。in-process 駆動(計測の軸)と unit / integration(配置の軸)は独立であり、integration に置いたまま lcov に載る。approve ガードの**呼び出し配線行**(`collectSwarmEvidence` の呼び出しと `emit` の行)は関数本体と別に DA を確認する(`cid:code-generation:lcov-wiring-line-checklist`)。

corpus sweep の期待値は本セッションで実測済みであり、テストの期待表はこの実測から起こす(`business-logic-model.md` §実 corpus での述語の挙動の表): `260722-election-core-promotion` = `missing [1,3]` / `260724-mirror-auto-modes` = `missing [2]` / `260717-test-pyramid-rebuild` = `missing [2]` / `260720-upstream-sync-230` = `missing [1]` / `260717-swarm-dispatch-enum` = `satisfied`。

## 上流型との逐語照合

`component-methods.md` の C4a ブロック(canonical)と本書の型を照合した結果:

- `SwarmEvidence` の 2 フィールド名(`startedBatches` / `completedBatches`)と型(`ReadonlySet<number>`)、コメントの意味(`SWARM_STARTED ∪ SWARM_DEGRADED` / `SWARM_COMPLETED`)— 一致。
- `SwarmEvidenceVerdict` の 2 アームと `kind` リテラル(`"satisfied"` / `"missing"`)、`missing` の `batches` 要素のフィールド名(`number` / `units`)— 一致。要素と `units` を `readonly` 化した点のみ形式差(canonical は `readonly { number: number; units: readonly string[] }[]`)。不変性の統一であり意味差はない。
- `swarmEvidenceVerdict(batches, evidence)` の引数順・型 — 一致。
- `collectSwarmEvidence(projectDir): SwarmEvidence` — 一致(module-private も一致)。
- `GuardMessageParts` とマーカー 3 定数 — U2 canonical と完全一致(再定義せず import)。
- `BoltDagAbsence` — U1 canonical を引用のみ。U3 は消費しない(§U1 / U2 から import する型)。

型の差分は形式差 1 件(`readonly` 化)のみで、意味の逸脱はない。設計上の逸脱は型ではなく**発動条件**に 1 件あり、`business-logic-model.md` §AD からの逸脱申告 D-1(skeleton-gate 除外の追加)として実装前の裁定事項に上げている。
