# Component Methods — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md

- `requirements.md` の AC-1a/1b/1c、AC-2a/2b/2c、AC-3a/3a2/3b/3c、AC-4a を各メソッドの戻り値仕様とエラー方針へ1対1で写した(各シグネチャの直下に対応 AC を明記)。
- `architecture.md` 現在節の患部 file:line(`tryEmitSwarm:2919-` / `computeBoltDag:300-313` / SWARM emitter `amadeus-swarm.ts:325-327`)を、置換対象シグネチャと入力の由来として引いた。
- `component-inventory.md` 現在節の「既存3モジュール内の関数追加+audit の読み手追加」を、下記メソッドの配置(lib=純関数 / orchestrate=読み手 / runtime=compile 経路)の制約として用いた。

## 純判定層(`amadeus-lib.ts`)

### C2 `planIntegrityVerdict`

```ts
export type SwarmDecline =
  | { readonly kind: "not-swarm-stage" }
  | { readonly kind: "skeleton-gate" }
  | { readonly kind: "autonomy-unset" }
  | { readonly kind: "no-dag"; readonly absence: BoltDagAbsence | null }
  | { readonly kind: "all-covered" };

export type PlanIntegrityVerdict =
  | { readonly kind: "ok" }
  | { readonly kind: "redirect"; readonly declaredWidth: number; readonly units: readonly string[] }
  | { readonly kind: "violation"; readonly declaredWidth: number; readonly units: readonly string[] };

export function planIntegrityVerdict(
  decline: SwarmDecline,
  pendingBatch: { readonly number: number; readonly units: readonly string[] } | null,
): PlanIntegrityVerdict;
```

- 入力: `decline`(C1 が `tryEmitSwarm` から受けた辞退理由)、`pendingBatch`(最初の未 cover batch とその宣言 unit 群。`null` = 宣言 DAG 無し)。
- 判定: `pendingBatch === null` または `units.length < 2` → `ok`(AC-2c / AC-1c の正当直列)。`decline.kind === "skeleton-gate"` → `ok`(AC-1c、skeleton は常に人間ゲート)。`decline.kind === "no-dag"` かつ `absence.reason === "scope-skips-units"` → `ok`(AC-1c / AC-3b の degrade 除外)。`decline.kind === "autonomy-unset"` かつ幅≥2 → `redirect`(AC-1b)。それ以外で幅≥2 → `violation`(AC-1a)。
- エラー: 投げない。全入力が値の全域関数。

### C3 `guardMessage`(FR-4 の canonical 定義)

```ts
export type GuardMessageParts = {
  readonly observation: string;  // (1) 観測事実 — 数字(宣言幅・batch 番号・unit 名)を必ず含む
  readonly weight: string;       // (2) 重み — 実測根拠(#1892 の 18 intent 中4件)への参照
  readonly exit: string;         // (3) 公認の出口 — 計画訂正 → compile → 再実行
};
export function guardMessage(parts: GuardMessageParts): string;
export const PLAN_CORRECTION_EXIT: string;   // 出口文の canonical 1定義
export const PLAN_DRIFT_WEIGHT: string;      // 重み文の canonical 1定義
export const AUTONOMY_LADDER_EXIT: string;   // redirect 専用の出口(set-autonomy)
```

- FR-1 / FR-2 / FR-3 の全ガード文言はこの1関数を通す。3部の**区切りは固定文字列**(各部の先頭マーカー)とし、AC-4a の機械検査はそのマーカー3個の実在で行う(部を1つ落とすと Red)。
- `PLAN_CORRECTION_EXIT` は `unit-of-work-dependency.md` / `bolt-plan` への edge+理由追記 → `bun <harness>/tools/amadeus-runtime.ts compile` → 再実行、を1文で持つ。既存 `degradeUnitResolutionError`(`amadeus-orchestrate.ts:3064-3090`)が同趣旨の recompile 文を持つが、そちらは degrade 経路専用のため統合せず、本 intent の3ガードのみを canonical 化する(既存文言の書き換えはスコープ外)。
- `AUTONOMY_LADDER_EXIT` は既存 `AUTONOMY_LADDER_QUESTION`(`amadeus-orchestrate.ts:1583-1586`)の `set-autonomy --mode autonomous|gated` 部分を出口として再利用する — 新しいコマンド語彙を発明しない。

### C4a `swarmEvidenceVerdict`

```ts
export type SwarmEvidence = {
  readonly startedBatches: ReadonlySet<number>;   // SWARM_STARTED ∪ SWARM_DEGRADED
  readonly completedBatches: ReadonlySet<number>; // SWARM_COMPLETED
};
export type SwarmEvidenceVerdict =
  | { readonly kind: "satisfied" }
  | { readonly kind: "missing"; readonly batches: readonly { number: number; units: readonly string[] }[] };

export function swarmEvidenceVerdict(
  batches: readonly (readonly string[])[],
  evidence: SwarmEvidence,
): SwarmEvidenceVerdict;
```

- 判定対象は**宣言幅≥2 の batch のみ**(幅1 batch は正当直列 — AC-2c)。
- 各対象 batch `n`(1-origin)について `startedBatches.has(n) && completedBatches.has(n)` を要求する。`SWARM_DEGRADED` は `prepare` で `SWARM_STARTED` と同時に出る driver 降格の記録であり、形態の降格ではないため started 側に合流させる(AC-2b)。
- 部分実績(宣言3 batch のうち2つだけ実績あり)は `missing` に残りを列挙する — approve は全 unit covered 後にしか到達しないため、実績が要る batch は approve 時点で全て完了しているはずだからである。
- エラー: 投げない。

## I/O 収集層

### C1 `emitSwarmOrPerUnit`(`amadeus-orchestrate.ts`)

```ts
type SwarmEmitOutcome =
  | { readonly kind: "emitted" }                       // invoke-swarm または batch ゲート ask を発行済み
  | { readonly kind: "declined"; readonly decline: SwarmDecline;
      readonly pendingBatch: { number: number; units: string[] } | null };

function tryEmitSwarm(...): SwarmEmitOutcome;           // 既存 boolean からの置換
function emitSwarmOrPerUnit(slug, scope, stateContent, projectDir, recordPrefix, codekbCtx, projectType): void;
```

- `emitSwarmOrPerUnit` は `:2782` と `:2808` の2箇所の `if (!tryEmitSwarm(...)) emitForSlug(...)` を置換する唯一の分岐点。
- `declined` を受けたら `planIntegrityVerdict` を呼び、`ok` → 従来どおり `emitForSlug`、`redirect` → `emit(askDirective(guardMessage({..., exit: AUTONOMY_LADDER_EXIT})))`、`violation` → `emit(errorDirective(guardMessage({...})))`。
- `pendingBatch` は既存 `firstUncoveredBatch`(`:2843-`)の戻りをそのまま運ぶ — 新しい走査を足さない(NFR-3)。ただし `pendingBatch.units` は「未 cover 分」であり幅判定には**宣言 batch 全体**が要るため、`tryEmitSwarm` は宣言 batch(`batches[n-1]`)も併せて返す。
- `redirect` を `ask` として出すのは既存ラダー ask(`:3238`)と同じ directive 種別に揃えるためで、t135 の "2b" が pin する `kind === "ask"` かつ `set-autonomy` を含む契約を維持する。

### C4b `collectSwarmEvidence`(`amadeus-orchestrate.ts`)

```ts
function collectSwarmEvidence(projectDir: string): SwarmEvidence;
```

- `readAllAuditShards(projectDir)`(`amadeus-lib.ts:4335`)で全シャードを1バッファに取り、`findAllEvents(audit, "SWARM_STARTED")` ほか3種を呼び、各ブロックから `auditBlockField(block, "Batch number")`(`:4213`)を数値化して集合にする。
- 数値化できない値(手編集・旧様式)は**集合に入れない** — 実績なしとして扱う fail-closed 側へ倒す。
- 呼び出しは approve 経路1回のみ。`next` 経路では呼ばない(NFR-3)。

### FR-2 のガード設置点(`handleReport`)

`handleReport` の per-unit カバレッジガード(`:4461-4487`)の**直後**に置く。条件は次の全てが成立するとき:

- `isGated`(初期化フェーズ以外)かつ `stageCheckbox.state !== "completed"`(冪等な再報告を巻き込まない — 既存ガードと同じ scoping)
- `node.for_each === SWARM_FOR_EACH && node.mode === SWARM_MODE`(= code-generation)
- `readBoltDagBatches(pd)` が非 null(既存関数の再利用。malformed は既存どおり throw = NFR-2 の非弱体化)
- `swarmEvidenceVerdict(batches, collectSwarmEvidence(pd)).kind === "missing"`

成立時は `emit(errorDirective(guardMessage({...})))` して `return`(遷移をコミットしない)。

## compile 経路(`amadeus-runtime.ts`)

### C5 `computeBoltDagOutcome`

```ts
export type BoltDagAbsence = {
  readonly reason: "scope-skips-units" | "units-pending";
  readonly detail: string;
};
type BoltDagOutcome =
  | { readonly kind: "dag"; readonly dag: BoltDag }
  | { readonly kind: "absent"; readonly absence: BoltDagAbsence }
  | { readonly kind: "invalid"; readonly reason: "absent" | "malformed" | "cyclic"; readonly detail: string };

function computeBoltDagOutcome(projectDir: string, stateContent: string | null): BoltDagOutcome;
```

- units-generation のチェックボックス状態は `parseCheckboxes(stateContent)`(runtime.ts が既に import 済み、`:38`)で読む。`[x]`(completed)= 実行済み。`[S]`(skipped)= degrade。`[ ]` = 未着手。
- 判定表:

| units-generation | ファイル | parse | 戻り |
| --- | --- | --- | --- |
| `[S]` skipped | 不在 | — | `absent`(`scope-skips-units`) |
| `[ ]` pending | 不在 | — | `absent`(`units-pending`) |
| `[x]` completed | 不在 | — | `invalid`(`absent`) → AC-3a |
| `[x]` completed | 実在 | 失敗 | `invalid`(`malformed`/`cyclic`) → AC-3a2 |
| 任意 | 実在 | 成功 | `dag` |
| `[S]`/`[ ]` | 実在 | 失敗 | `invalid`(同上) — 書いた以上は様式適合を要求する(寛容側へ倒さない) |

- `compile`(`:789` の `if (boltDag)`)は `dag` → `graph.bolt_dag` を append、`absent` → `graph.bolt_dag_absence` を append、`invalid` → **throw**(compile が非ゼロ終了する)。hook(`amadeus-runtime-compile.ts:205-217`)は非ゼロ時に stderr を `recordHookDrop` へ記録するため、そこで初めて loud になる(現行の exit 0+stderr 飲み込みが閉じる)。
- 既存 `recoverBoltDag`(`amadeus-lib.ts:8030`)の throw 経路は無改変(NFR-2)。

### C6 `bolt_dag_absence` の消費

```ts
function readBoltDagAbsence(projectDir: string): BoltDagAbsence | null;   // orchestrate 側の読み手
```

- `readBoltDagBatches` が `null` を返したとき C1 がこれを読み、`SwarmDecline` の `no-dag` に載せる。`scope-skips-units` なら `planIntegrityVerdict` は `ok`(AC-1c)、`units-pending` かつ幅宣言が読めない場合も `ok`(判定材料が無い状態で発動しない)。
- AC-3c の「下流が dag 欠落を判別できる」ことは、この読み手の戻り値を assert するテストで固定する。
