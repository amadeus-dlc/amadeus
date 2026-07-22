# Code Generation Plan: swarm-and-next-stage (U03)

> 上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`reliability-design.md`、`scalability-design.md`、`security-design.md`、`requirements.md`(FR-0 / FR-1 item 3 / FR-2 item 10)、`unit-of-work.md`(U03)。

## 目的

承認済み v2.2.0→v2.3.0 sync plan のうち C2 runtime correctness の batch/next 面 2 項目を、**FR-0 検証先行**で処理する。

- **FR-1 item 3 (swarm-batch-advance):** 全 Bolt DAG batch の未完了分を DAG 順で選び、current run の converged だけを参照し、merge failure を converged に記録しない。
- **FR-2 item 10 (gate-next-stage-naming):** gate directive が実際の次の in-scope stage を名指し、SKIP stage 名を出さず、終端を明示する。

## 入力縮退とスコープ追跡

User Stories は engine 正本で SKIP 済み。captured intent「Implement the approved upstream AI-DLC v2.2.0-to-v2.3.0 sync plan … 24 ADOPT/ADAPT items」の U03 部分へ直接縮退する。captured intent 外の scope は追加しない。U02 recovery、U05 iteration/preview、既存 swarm owner の worker/merge 実行、U12 の全体 ledger 集約は本 Unit に持ち込まない。

## FR-0 検証先行(実装差分の可否をここで確定)

各項目の現行挙動を characterization test で固定し、反証可能な verdict を出してから実装差分の要否を決める。EQUIVALENT なら実装差分 0、非同等の不足のみ ADAPT。現行実装を別 abstraction へ置き換えること自体は成果にしない。

| 項目 | 現行機構(実測 file:line) | FR-0 verdict | 帰結 |
|---|---|---|---|
| swarm-batch-advance | `amadeus-orchestrate.ts` `tryEmitSwarm`(:2052-2101)が全 batch を DAG 順走査し、最初の未完了 batch の未完了 unit のみを `invoke-swarm` へ返す。coverage ledger = current record の produces on disk(`unitCovered`)。`amadeus-swarm.ts:730-736` が merge-back 失敗 unit を `status="failed"` へ降格し `SWARM_UNIT_CONVERGED` を出さない(#674) | **EQUIVALENT** | production 変更なし。3 guard を束ねる targeted regression を U03 成果として固定(既存 t211 / t134 case14 を verdict 根拠に引用+U03 で明示回帰化) |
| gate-next-stage-naming | resolver `nextInScopeStage`(`amadeus-lib.ts:5646`)は SKIP を除外し実在 in-scope successor / terminal `null` を返す。engine `next` はこれで advance(orchestrate.ts:1983)。ただし run-stage(gate)directive に `next_stage` 非投影(gate 表示 `[next stage]` に engine 由来の権威ソースがない) | **PARTIAL** | 不足 = directive 非投影。ADAPT: 既存 `nextInScopeStage` を使って gate directive に `next_stage: string | null` を投影し、harness gate 描画を directive 由来へ束ねる |

### 公開 seam 名の扱い(FD 契約語彙 → 既存実装の対応)

`unit-of-work.md` / FD は公開 seam を `selectNextSwarmBatch` / `resolveNextInScopeStage` と命名する。これは決定意味論の契約語彙であり、**FR-0 により既存実装へ写像する**:

- `resolveNextInScopeStage` の決定意味論 = 既存 `nextInScopeStage`(`amadeus-lib.ts:5646`)。item 10 の PARTIAL 不足は resolver ではなく projection なので、resolver を新設・改名せず既存を再利用する。
- `selectNextSwarmBatch` の決定意味論 = 既存 `tryEmitSwarm` の batch 選択(orchestrate.ts:2063-2101)。item 3 は EQUIVALENT なので新規 pure 関数抽出はしない(「実装差分を作らず」「別 abstraction への置換を成果にしない」に直接抵触するため)。

重複定義の新設は construction guardrail(canonical 1 定義)と team norm(absence-claim-grep-verify / 第二定義禁止)にも抵触する。本判断は FR-0 の適用であり、最終テキストで明示フラグする。

## 公開境界(production 変更面)

item 10 の ADAPT のみが production を触る。最小 choke point 変更:

- `packages/framework/core/tools/amadeus-directive.ts`: `RunStageDirective` に optional `next_stage?: string | null` を追加、`RUN_STAGE_FIELDS` に登録、nullable-string validator を追加。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: `buildRunStageDirective` で `stateContent !== null && gate === true` のとき `next_stage = nextInScopeStage(node.slug, scope, stateContent)?.slug ?? null`。`emitPerUnitRunStage` の uncovered-unit gate 抑止時に `next_stage` を除去(gate:false は gate directive ではない)。
- harness gate 描画: `stage-protocol.md`(core)と `question-rendering.md`(claude/codex/kiro/kiro-ide 各 annex)で `[next stage]` を `directive.next_stage` 由来に束ね、`null`=終端の文言を規定。

item 3 は production 無変更(EQUIVALENT)。

## Test strategy applicability

active test strategy は `Comprehensive`。U03 は既存 CLI 内部の pure decision seam と gate directive projection だけを変更し、利用者 journey / UI / 外部 service / network / database を追加しない。独立 E2E file は非該当と判断。代替として unit file で in-process `handleNext` / directive 検査 + `amadeus-swarm.ts` finalize の merge-failure 降格を、integration file で実 CLI subprocess による gate-name↔次 directive 一致(acceptance)を駆動する。新規 test configuration は追加しない。

## 手順

| Step | 状態 | 作業 | Captured intent への対応 |
|---|---|---|---|
| 1 | [x] | requirements FR-0/1-item3/2-item10、FD/NFR design、既存 `tryEmitSwarm` / `nextInScopeStage` / swarm finalize を照合し公開境界を確定。 | approved sync plan の U03 範囲を確定。 |
| 2 | [x] | item 3 characterization を RED→GREEN で固定(multi-batch DAG 順 advance、current-run coverage 限定、merge-failure 非 converged)。EQUIVALENT verdict と production 無変更を実測。 | swarm-batch-advance を反証可能 verdict へ落とす。 |
| 3 | [x] | item 10 characterization を RED 固定(現行 gate directive に next_stage 非投影)。PARTIAL verdict を実測。 | gate-next-stage-naming の不足を反証可能 verdict へ落とす。 |
| 4 | [x] | directive 型+validator に `next_stage?: string \| null` を追加(落ちる実証: 未登録 key reject / 型不正 reject)。 | item 10 の contract 面を実装。 |
| 5 | [x] | `buildRunStageDirective` で gate directive に next_stage を投影(SKIP 除外・terminal null・既存 resolver 再利用)。`emitPerUnitRunStage` の gate 抑止で除去。 | item 10 の engine ADAPT を最小 choke point で実装。 |
| 6 | [x] | harness gate 描画(stage-protocol + 4 annex)を directive.next_stage 由来へ束ねる。 | 「Approve option renders it」の契約完成。 |
| 7 | [x] | 正本変更につき `bun scripts/package.ts` + `bun run promote:self`。dist 6 面 / self-install の drift 0 を確認。 | v2.3.0 sync 成果を全 harness へ正規投影。 |
| 8 | [x] | 対象 test(path 実在機械確認+`Ran ... across M files` 照合)、typecheck、lint:check、dist:check、promote:self:check、complexity-gate、coverage-registry check を GREEN。local lcov patch 追加行未カバー0。 | 品質制約を満たす。 |
| 9 | [x] | code-summary(FR-0 verdict、変更ファイル・測定 ref、検証 exit code、既知制約)を記録し worktree コミット。 | U03 を engine 正本へ完了として返す。 |

## 禁止事項

- EQUIVALENT 項目(item 3)への production 変更 / 既存実装の別 abstraction 置換 / 新規 pure 関数抽出。
- `nextInScopeStage` の重複 resolver 新設・改名。
- 要求外の後方互換レイヤー・fallback 分岐・移行シム。
- `dist/<harness>/` や別 Unit 成果物の手編集(正本編集→正規 generator で再生成)。
- SKIP stage 名 / 架空 slug を next_stage に出す実装。

## 完了条件

- FR-0 verdict: item 3 = EQUIVALENT(production 無変更・3 guard 回帰固定)、item 10 = PARTIAL→ADAPT(next_stage 投影)。
- gate directive の next_stage が SKIP 除外・実在 in-scope successor・terminal null であり、gate 表示名が次 engine directive の stage と一致。
- per-unit gate:false / --single / init に next_stage を出さない。
- typecheck / lint / dist:check / promote:self:check / complexity / coverage-registry / 対象 test が GREEN、patch 追加行未カバー0。
