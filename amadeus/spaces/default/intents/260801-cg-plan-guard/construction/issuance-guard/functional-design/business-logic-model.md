# Business Logic Model — U2 issuance-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U2 定義(対象 FR-1+FR-4、変更面 `amadeus-orchestrate.ts` の `tryEmitSwarm`+呼び出し元2箇所の seam 統合、`amadeus-lib.ts` の `guardMessage`+純判定器)を、本書の処理境界(I/O は orchestrate・判定と文言は lib)の分割根拠とした。
- `unit-of-work-story-map.md` の U2 ストーリー「並行計画を conductor がタスク化し忘れても、engine が3部メッセージで正しい出口(計画訂正 or ラダー)へ誘導する」を、`violation`(error)と `redirect`(ask)を**別の出口**として分ける設計理由とした。
- `requirements.md` の FR-1(両方向)・FR-4(3部)・AC-1a/1b/1c・AC-4a(発行側分)を、下記の判定表と発行分岐へ 1:1 で写した。FR-1 の但し書き「逆方向の主発動点は FR-2 の実績突合である旨を設計に明記」は §逆方向の委譲範囲で果たす。
- `components.md` の C1(発行分岐 seam・判定を持たない)/ C2(純判定器)/ C3(文言の唯一の組み立て器)の責務境界を、本書の3層(収集 → 判定 → 発行)の層順としてそのまま採用した。
- `component-methods.md` の C1 `emitSwarmOrPerUnit` / C2 `planIntegrityVerdict` / C3 `guardMessage` のシグネチャを canonical として逐語照合し、本書のフローの入出力を一致させた(差分は §AD からの逸脱申告に 1 件のみ記載)。
- `services.md` の S1 契約(`next` は読み取り専用・ガードは状態を書かない・新 directive kind を作らない)を、発行分岐が `invoke-swarm` / `ask` / `error` / `run-stage` の既存4種に閉じる制約とした。

## 判定の入力

判定器 `planIntegrityVerdict`(C2、`amadeus-lib.ts`)は次の2値だけを受ける全域関数であり、ディスクにも audit にも触れない。

| 入力 | 由来(収集は C1 が行う) | 意味 |
| --- | --- | --- |
| `decline: SwarmDecline` | `tryEmitSwarm` が `emitted` を返せなかった理由 | なぜ swarm 発行に至らなかったか |
| `pendingBatch: { number, units } \| null` | `firstUncoveredBatch`(`.claude/tools/amadeus-orchestrate.ts:2843`)の戻り+**宣言 batch 全体**(`batches[number - 1]`) | いま直列で処理しようとしている batch の**宣言された**幅 |

`pendingBatch.units` は**宣言 batch の全 unit**とする。`firstUncoveredBatch` の戻り `units` は未 cover 分のみ(`:2857` の `batch.filter(...)`)であり、幅2の batch で1 unit だけ残っている状態では幅1に見えてしまうため、幅の判定材料としては使えない(`component-methods.md` C1 の「宣言 batch(`batches[n-1]`)も併せて返す」に一致)。

`bolt_dag` の欠落理由は U1 の `BoltDagAbsence`(`construction/dag-integrity/functional-design/domain-entities.md` の canonical 定義)を `no-dag` アームに載せて運ぶ。U2 はこの型を**参照側**として import するだけで再定義しない(`cid:functional-design:cross-unit-type-verbatim-check`)。

## 3値判定のフロー

```
tryEmitSwarm(slug, scope, stateContent, projectDir, recordPrefix, codekbCtx)
        │
        ├─ 条件成立 ─────────────> emitted            (invoke-swarm / batch ゲート ask を発行済み)
        │
        └─ 辞退 ──> declined{ decline, pendingBatch }
                         │
                         v
              planIntegrityVerdict(decline, pendingBatch)
                         │
        ┌────────────────┼────────────────────────┐
        v                v                        v
       ok            redirect                 violation
        │                │                        │
  emitForSlug     ask(guardMessage(         error(guardMessage(
  (従来どおり)      exit=AUTONOMY_          exit=PLAN_CORRECTION_
                    LADDER_EXIT))            EXIT))
```

テキスト版: `tryEmitSwarm` は「発行済み」か「辞退(理由+対象 batch 付き)」の2値を返し、辞退の場合のみ純判定器が `ok` / `redirect` / `violation` の3値を返す。`ok` は現行と同一の per-unit フォールバック、`redirect` は autonomy ラダーへの `ask`、`violation` は停止する `error` である。判定器は発行を行わず、発行側は判定を行わない。

### 判定規則(擬似コード)

```ts
// amadeus-lib.ts — 純関数。throw しない。
export function planIntegrityVerdict(
  decline: SwarmDecline,
  pendingBatch: { readonly number: number; readonly units: readonly string[] } | null,
): PlanIntegrityVerdict {
  if (pendingBatch === null || pendingBatch.units.length < 2) return { kind: "ok" };
  const width = pendingBatch.units.length;
  const units = pendingBatch.units;
  switch (decline.kind) {
    case "not-swarm-stage":
    case "skeleton-gate":
    case "all-covered":
    case "autonomy-unset-pre-skeleton":
      return { kind: "ok" };
    case "no-dag":
      return { kind: "ok" };
    case "autonomy-unset":
      return { kind: "redirect", declaredWidth: width, units };
    default:
      return { kind: "violation", declaredWidth: width, units };
  }
}
```

`default` を `violation` にすることが本設計の fail-closed の要である。将来 `tryEmitSwarm` に辞退理由が増えたとき、C2 に分岐を足し忘れた実装は**既定で停止側へ倒れる**(黙って直列降格しない)。`decline.kind` の網羅を型で強制する `never` チェックは置かない — 置くと未知理由がコンパイル時に潰され、ランタイムの fail-closed が消えるためである。

## 辞退理由のカテゴリ写像(ADR-1 の7 return-false サイト)

`decisions.md` ADR-1 が列挙した実装上の `return false;` 7箇所を `SwarmDecline` の5アームへ写す。実測は `.claude/tools/amadeus-orchestrate.ts` を直読(observed HEAD)。

| # | 患部行 | verbatim 断片 | `SwarmDecline` | verdict |
| --- | --- | --- | --- | --- |
| 1 | `:2928` | `if (!node) return false;` | `not-swarm-stage` | `ok` |
| 2 | `:2929` | `if (node.phase !== "construction") return false;` | `not-swarm-stage` | `ok` |
| 3 | `:2930` | `if (node.for_each !== SWARM_FOR_EACH \|\| node.mode !== SWARM_MODE) return false;` | `not-swarm-stage` | `ok` |
| 4 | `:2933` | `if (isSkeletonGateStage(node, scope)) return false;` | `skeleton-gate` | `ok`(AC-1c) |
| 5 | `:2935` | `if (autonomy === null) return false;` | `autonomy-unset` / `autonomy-unset-pre-skeleton` | `redirect` / `ok` |
| 6 | `:2937` | `if (!batches \|\| batches.length === 0) return false;` | `no-dag` | `ok`(AC-1c / AC-3b) |
| 7 | `:2939` | `if (pick === null) return false;` | `all-covered` | `ok` |
| — | `:2942-2944` | `owedGate !== null` → `emit(askDirective(owedGate)); return true;` | (辞退でない) | `emitted` |

1〜3 は「そもそも swarm 対象ステージでない」1カテゴリへ合流させる(ADR-1 §12a iteration 1 Minor の是正内容と一致)。5 のみが 2 アームへ分岐する — 根拠は §skeleton 未完了の分離。

## 制御フローの改訂点(`tryEmitSwarm` 内)

現行は `autonomy === null`(`:2935`)で即 `return false` するため、**辞退時点で宣言幅が読まれていない**。判定に幅が要るので、辞退の払い出し前に batch を解決する順序へ変える。

改訂後の順序:

1. `nodeForSlug` / phase / for_each+mode → `not-swarm-stage` を返す(batch を読まない — 非 swarm ステージで DAG を読むのは無駄な I/O)。
2. `isSkeletonGateStage` → `skeleton-gate` を返す(同上、読まない)。
3. `readBoltDagBatches(projectDir)` を読む。`null` / 空 → `no-dag`(欠落理由は `readBoltDagAbsence` = U1 の読み手で補う)。
4. `firstUncoveredBatch(...)` → `null` なら `all-covered`。非 `null` なら `pendingBatch = { number: pick.batchNumber, units: batches[pick.batchNumber - 1] }` を確定する。
5. `readAutonomyMode(stateContent)` が `null` → `skeletonGateCompleted(stateContent, scope)`(`:1571-1576`)で 2 アームに分ける。
6. autonomy 有り → 従来どおり `owedBatchGate` → `invoke-swarm` または batch ゲート ask(`emitted`)。

この並べ替えで新しいディスク読みは発生しない(NFR-3): 3・4 はいずれも autonomy 有りの経路で既に行っていた読みを、辞退経路でも通るよう前倒ししただけである。ただし**到達可能性は変わる** — §AD からの逸脱申告 D-2 に影響を記す。

## skeleton 未完了の分離(実測に基づく分岐)

`autonomy === null` は 2 つの異なる状況を1つの条件に潰している。

- **skeleton 完了後**: ラダーの回答が必要な状態。engine は既に `emitPerUnitRunStage`(`:3236-3238`)で `if (skeletonGateCompleted(stateContent, scope) && readAutonomyMode(stateContent) === null) { emit(askDirective(AUTONOMY_LADDER_QUESTION)); return; }` として `ask` を出している(#1612)。
- **skeleton 未完了**: 「ラダーがまだ発火していない正当な初期状態」であり、同コメント(`:3234-3235`)が `Only AFTER the skeleton — an unset grant before it is the legitimate initial state and keeps today's behaviour.` と明示する。

したがって U2 の `redirect` は**前者にのみ**発動させる。後者へ発動させると、`tests/integration/t251-swarm-and-next-stage.test.ts` の test d(`:219-235`)が赤くなる — 同テストは `perUnitCodegenState()`(`:295` `- [-] functional-design — EXECUTE` = skeleton 未完了)+ `seedMultiBatchDag(proj, [["alpha", "beta"]])`(幅2)+ autonomy 未設定 で `run-stage` かつ `gate:false` を pin しており、これは**正当な per-unit 反復**である。

`redirect` は既存ラダー ask の**置き換えではなく上流での前倒し**である。両者は条件が排他になる:

| 状況 | 発火点 | directive |
| --- | --- | --- |
| skeleton 完了 × autonomy 未設定 × 宣言幅≥2 | C1(本 Unit) | `ask`(3部・観測数字あり) |
| skeleton 完了 × autonomy 未設定 × 宣言幅1 または DAG 無し | 既存 `:3237` | `ask`(既存 `AUTONOMY_LADDER_QUESTION`) |
| skeleton 未完了 × autonomy 未設定 | 既存の per-unit 反復 | `run-stage`(`gate:false`) |

既存 `:3237` の文言・行は**無改変**とする(ADR-4「既存2文言の書き換えはスコープ外」)。`AUTONOMY_LADDER_EXIT` はその文中の `set-autonomy --mode autonomous|gated` 語彙を再利用するだけで、新しいコマンド語彙を発明しない。

## 3部メッセージの組み立て(FR-4 発行側分)

`guardMessage`(C3、`amadeus-lib.ts`)が唯一の組み立て器で、U2 の 2 つの出口(`redirect` / `violation`)は共にこれを通る。

```ts
export const GUARD_OBSERVED_MARKER = "Observed: ";
export const GUARD_WEIGHT_MARKER = "Why this matters: ";
export const GUARD_EXIT_MARKER = "Approved exit: ";

export function guardMessage(parts: GuardMessageParts): string {
  return `${GUARD_OBSERVED_MARKER}${parts.observation}\n\n${GUARD_WEIGHT_MARKER}${parts.weight}\n\n${GUARD_EXIT_MARKER}${parts.exit}`;
}
```

- マーカーは公開定数とし、AC-4a の機械検査はこの3定数の実在で行う(1部でも落とすと Red)。テスト側でリテラルを再定義せず定数を import する — リテラル複製は検査を「コピーが3部あるか」の検査へ退化させる(ADR-4 Alternatives Rejected A と同型)。
- 各定数は**1定数1行**で書く(`cid:code-generation:bun-multiline-arg-da0` — 多行連結は継続行の DA:0 を作る)。
- 文言は engine の既存ユーザー可視文字列に揃えて英語で書く(`AUTONOMY_LADDER_QUESTION` / `degradeUnitResolutionError` と同一言語面)。

観測部(1)に入れる数字は `declaredWidth`・batch 番号・unit 名の3つ。※申告付き是正(実装時、conductor 執行裁定): canonical `PlanIntegrityVerdict` に batch 番号フィールドは存在しない(domain-entities の型が正)ため、batch 番号は lib 内の合成入口 `planGuardMessage(verdict, batchNumber)` が引数で受ける — 呼び出し側が prose を組む BR-U2-5 違反は生じない。`declaredWidth`・unit 名は従来どおり verdict ペイロードから取る。

| verdict | observation | weight | exit |
| --- | --- | --- | --- |
| `redirect` | batch N が幅 W の並行実行を宣言している(unit 名列挙)/ Construction Autonomy Mode は未設定 | `PLAN_DRIFT_WEIGHT` | `AUTONOMY_LADDER_EXIT` |
| `violation` | batch N が幅 W の並行実行を宣言しているが per-unit 直列で発行しようとしている(unit 名列挙) | `PLAN_DRIFT_WEIGHT` | `PLAN_CORRECTION_EXIT` |

## 逆方向(直列計画 → 並列実行)の委譲範囲

`requirements.md` FR-1 は逆方向も要求しつつ「逆方向の主発動点は FR-2 の実績突合である旨を設計に明記」と指示している。発行側で検出できる範囲を実測から確定する。

- `invoke-swarm` の `units` は `firstUncoveredBatch` が `batches` から選ぶ(`:2857-2862`)。**batch 構成は常に bolt_dag 由来**であり、engine が依存 edge を跨いだ batch を組むことはない。したがって「engine が発行した並列」が計画に違反することは構造上起こらない。
- 実際の逆方向違反は「conductor が engine を迂回して手で fan-out する」形でのみ起きる。これは `next` の出力に現れないため**発行側では原理的に観測できない**。
- よって U2 は逆方向に対して発行側の検査を持たず、検出は U3(FR-2、approve 時の SWARM 実績突合)へ全面委譲する。この委譲は「未実装」ではなく観測可能性に基づく境界であり、U2 の完成条件から逆方向の AC は外れる(`unit-of-work.md` U2 検収 = AC-1a / AC-1b / AC-1c / AC-4a 発行側分、逆方向 AC は U3 側)。

## AD からの逸脱申告(実装前の停止事項)

`cid:requirements-analysis:implementation-deviation-election` / `cid:code-generation:cg-invariant-conflict-explicit-revision` に従い、`component-methods.md`(AD canonical)との差分を申告する。設計側で黙って実装しない。

**D-1(型の拡張)** — AD C2 の `SwarmDecline` は `autonomy-unset` を単一アームで定義するが、上記実測(`:3234-3235` の設計コメント+t251 test d の pin)により、skeleton 未完了の unset を同一アームで扱うと AC-1c(誤発動禁止)に違反する。本書は `autonomy-unset-pre-skeleton` アームを1つ追加する。代替案は `autonomy-unset` に `skeletonComplete: boolean` を持たせる形だが、判別 union の分岐を値の検査へ退化させるため採らない(U1 `BoltDagOutcome` が 3 アームを選んだのと同じ理由)。この差分は U3 の消費面には影響しない(U3 は `SwarmEvidence` 系のみを見る)。

**D-2(到達可能性の変化)** — §制御フローの改訂点のとおり `readBoltDagBatches` が autonomy 未設定の経路でも呼ばれるようになる。同関数は malformed 時に throw する(`:1489-1491` `if (recovery.kind === "malformed") { throw new Error(...) }`)ため、従来は無音フォールバックだった「autonomy 未設定 × malformed DAG」が例外になる。方向としては fail-closed の強化(NFR-2 に反しない)だが**挙動変更である**ため、実装前に「autonomy 未設定 かつ 不正な `unit-of-work-dependency.md` / `runtime-graph.json` を持つ既存テスト」を全数 grep 棚卸しし、赤化するものを plan で宣言する(`cid:requirements-analysis:enumeration-reverify-at-implementation`)。U1 着地後は compile 側が malformed を loud にするため、compile を通したワークスペースではこの状態自体が到達不能になる。

**D-3(要件側の留保の保存)** — `decisions.md` §上流へ差し戻す点は「AC-1a が求める `error` directive は現行の到達可能経路を持たない」と記録している。本書はこの留保を解消せず保存する: `violation` は列挙外理由に対する全域的な fail-closed 既定として実装し、AC-1a の Red をどう構成するか(列挙外理由の人工注入で足りるか、要件側を改めるか)は requirements 所有者の判断事項として据え置く。設計側で新しい違反トリガを発明しない。

## テスト seam(t400 予約)

| seam | 層 | 駆動対象 |
| --- | --- | --- |
| `planIntegrityVerdict(decline, pendingBatch)` | unit(純関数・実 FS なし) | 判定表の全行(5 アーム × 幅0/1/≥2) |
| `guardMessage(parts)` + マーカー3定数 | unit | AC-4a(部欠落で Red)・観測部の数字実在 |
| `handleNext` の in-process 呼び出し | integration(実 FS) | AC-1b の `ask` 発行、AC-1c の非発動(`run-stage` 維持) |

`handleNext` を in-process で駆動する既存前例は `tests/unit/t186-foreach-per-unit-iteration.test.ts` と `tests/integration/t251-swarm-and-next-stage.test.ts` にあり、CLI spawn(`tests/integration/t135-invoke-swarm.test.ts`)は bun coverage に載らない(`cid:code-generation:bun-coverage-spawn-blindspot`)。新規テストは in-process 側を主とし、実 FS を触るものは integration へ置く(`cid:code-generation:fs-tests-integration-first`)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T10:29:05Z
- **Iteration:** 1
- **Scope decision:** none

Major 1件: BR-U2-9 pin 棚卸しの test h 誤帰属(t251:189 → 実体 t211:358)。他は裁定忠実・型 verbatim・AC 全数・機構スポットチェック全て確認。

### Findings

- Major: BR-U2-9 の test h 引用が t251:189 へ誤帰属 — 実体は tests/unit/t211-swarm-batch-progress.test.ts:358。→ conductor がフルパス形で是正済み。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T10:31:23Z
- **Iteration:** 2
- **Scope decision:** none

Major(test h 誤帰属)は t211:358 フルパス形で閉包、他行・他成果物の無退行を確認。指摘 0 件。

### Findings

- None
