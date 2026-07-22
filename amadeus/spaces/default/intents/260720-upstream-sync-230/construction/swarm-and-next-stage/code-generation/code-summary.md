# Code Summary: swarm-and-next-stage (U03)

> 上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`reliability-design.md`、`scalability-design.md`、`security-design.md`、`requirements.md`、`unit-of-work.md`。

測定 ref: worktree `bolt-swarm-and-next-stage`、base HEAD `0abc480eb`(U06 着地)。行番号は本コミット時点の実測。

## FR-0 検証先行 verdict(反証可能)

| 項目 | verdict | 根拠(実測 file:line) | 実装差分 |
|---|---|---|---|
| **FR-1 item 3 swarm-batch-advance** | **EQUIVALENT** | (1) `amadeus-orchestrate.ts` `tryEmitSwarm`(:2063-2101)が全 batch を DAG 記録順に走査し、最初の未完了 batch の未完了 unit のみ `invoke-swarm` へ返す。(2) coverage ledger = current record の produces on disk(`unitCovered`)= current-run 収束根拠。(3) `amadeus-swarm.ts:730-736` が merge-back 失敗 unit を `status="failed"` へ降格し `SWARM_UNIT_CONVERGED` を出さない(#674) | **production 無変更**。3 guard を回帰固定(下記) |
| **FR-2 item 10 gate-next-stage-naming** | **PARTIAL → ADAPT** | resolver `nextInScopeStage`(`amadeus-lib.ts:5646`)は SKIP 除外・実在 successor / terminal `null` を返し engine `next` はこれで advance(orchestrate.ts:1994)。ただし run-stage(gate)directive に `next_stage` 非投影 → gate 表示 `[next stage]` に engine 由来の権威ソースなし | 不足=directive 非投影のみ ADAPT |

上流契約(`docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md:80,124`): item 3 = 「全 batch 昇り・current run converged・merge failure 非 converged」、item 10 = 「directive `next_stage` が実在 next in-scope stage を名指し・Approve option がそれを描画」。

### 公開 seam 名の扱い(FR-0 適用による明示判断 — 要レビュー確認)

`unit-of-work.md` / FD は公開 seam を `selectNextSwarmBatch` / `resolveNextInScopeStage` と命名するが、これは決定意味論の**契約語彙**であり FR-0 に従い既存実装へ写像した。**新規 wrapper 関数は作らなかった**:

- `resolveNextInScopeStage` 決定意味論 = 既存 `nextInScopeStage`(`amadeus-lib.ts:5646`)を再利用。item 10 の不足は resolver でなく projection のため。
- `selectNextSwarmBatch` 決定意味論 = 既存 `tryEmitSwarm` の batch 選択(orchestrate.ts:2063-2101)。item 3 は EQUIVALENT のため新規抽出せず。

根拠: 任務指示・FD の「FR-0 characterization branch」がともに「EQUIVALENT なら実装差分を作らず」「現行実装を別 abstraction へ置換すること自体を成果にしない」と明記。同名 wrapper 新設は EQUIVALENT 項目に実装差分を作り(item 3)、既存 resolver の第二定義を作る(item 10)ため、construction guardrail(canonical 1 定義)と team norm(absence-claim-grep-verify)にも抵触する。これは FR-0 の適用であり、レビュアーの独立判断のため明示フラグする。

## ADAPT 実装(item 10、最小 choke point)

### 正本(packages/framework/core/、3 ファイル)

- `tools/amadeus-directive.ts`:
  - `RunStageDirective` に optional `next_stage?: string | null`(:124 直前のコメント+フィールド)。
  - `RUN_STAGE_FIELDS` に `"next_stage"` 登録(:283 付近)。
  - `checkOptionalNullableString`(:515-525)を新設、`checkRunStageShared` から呼出(:451)。string|null を許容し他型を reject。
- `tools/amadeus-orchestrate.ts`:
  - `projectNextStage(directive, node, scope, stateContent)`(:1238-1246)を新設。`stateContent !== null && directive.gate === true` のとき `next_stage = nextInScopeStage(node.slug, scope, stateContent)?.slug ?? null`。`buildRunStageDirective` から1呼出(:1303)。
    - complexity: 当初インライン化で `buildRunStageDirective` が CCN 18(baseline 超過)→ helper 抽出で CCN を閾値内へ戻した(NEW_VIOLATION 解消、baseline 不変更)。
  - `emitPerUnitRunStage`: uncovered-unit の `gate = false` 抑止時に `delete directive.next_stage`(:2326)。per-unit iteration step は gate directive でないため。
- `amadeus-common/protocols/stage-protocol.md`: gate spec の `[next stage]` を run-stage directive の `next_stage` 由来に束ねる note を追記(:50 付近)。`null`=終端は「Complete the workflow」文言と規定。harness 中立契約のため全 harness が読む単一ソース。

### 生成物(正規 generator で再生成、手編集なし)

- `bun scripts/package.ts` → `dist/<6 harness>/` の directive/orchestrate/stage-protocol(18 ファイル)。
- `bun run promote:self` → project-local self-install(`.claude`/`.codex`/`.cursor`/`.opencode`)。

## テスト(新規・変更)

- **新規** `tests/integration/t250-swarm-and-next-stage.test.ts`(11 tests、in-process `handleNext` + core `validateDirective`):
  - item 10: gate directive が実在 next stage を名指し(== resolver)/ SKIP 除外 / terminal null(present-and-null)/ per-unit gate:false は next_stage なし / --single は next_stage なし / validator が string|null 受理・他型 reject。
  - item 3 EQUIVALENT: DAG 順の未完了 batch 選択 / current-record 収束のみで advance / 後続 batch 先取りなし。
  - **配置**: `fs-tests-integration-first`(E-MTR-CG)に従い integration 層。in-process 駆動(spawn 盲点回避=計測軸)は維持しつつ実 FS fixture は integration へ(初回 unit 配置で size-purity ratchet が medium を要求したため移設)。
  - merge-failure 降格(guard 3)は既存 `tests/e2e/t134-swarm-referee.test.ts` case 14(#674)を verdict 根拠として引用。
- **変更** `tests/unit/t113.test.ts`: dist 版 directive validator へ next_stage 3 ケース(string / null / 非string非null reject)を追加。

落ちる実証: item 10 の3 assertion(次stage名指し・SKIP除外・terminal null)は projection 実装前に RED(`next_stage: undefined`)、実装後 GREEN を実測。item 3 の3 assertion は実装前から GREEN = EQUIVALENT(production 無変更)を実証。

## 検証コマンドと実測 exit code

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint:check` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bun test t250 + t113 + t211 + t-test-size-drift`(4 files、`Ran 74 tests across 4 files`、path 実在機械確認済) | 0(74 pass / 0 fail) |

local lcov(patch 追加行 DA 実測、`bun test --coverage`): 正本追加行は全て被覆 — orchestrate `DA:1244=64 / 1245=87 / 1303=57 / 2326=30`、directive `DA:521-524`(error push :524=78 は core を in-process 駆動する t250 追加ケースで被覆)。patch 追加行未カバー 0。

## 既知の制約・スコープ外(U03 の範囲外)

- **既存の赤2件(pre-existing、本 Unit の変更由来ではない)** — `bash tests/run-tests.sh --ci` にて:
  1. `tests/unit/gen-coverage-registry.test.ts`「none->cli reclassification set」: `EXPECTED_NONE_TO_CLI` に U01/U06 の committed 済み `integration/t248-*`・`t249-*` が未登録で失敗。当該 test ファイルは本 Unit で未変更(`git status` 空)、t248/t249 は HEAD に committed 済み → HEAD 時点で既に赤。`integration-registry-regen` の統合時 reconciliation(U12/統合工程が所有)であり、共有 ledger のため U03 worktree からは触れない。
  2. `tests/integration/t-team-up-codex-resume.test.ts`「safety-wait launch failure cleans supervisors」: team-up session lifecycle テスト、`next_stage` 非参照・本 Unit 未変更、環境依存(supervisor 起動)の既存赤。
  いずれも自変更由来でないことを実測確認(`git status` で未変更、失敗 assertion が t250/next_stage を参照しない)。
- U02 recovery、U05 unit-major/scope-preview、既存 swarm owner の worker/merge 実行、U12 の全24項目 ledger 集約は本 Unit に含めない。
- `next_stage` の harness 描画 note は core `stage-protocol.md`(harness 中立・全 harness が読む単一ソース)に置き、per-harness `question-rendering.md` annex への重複記載はしない(canonical 1 定義)。
