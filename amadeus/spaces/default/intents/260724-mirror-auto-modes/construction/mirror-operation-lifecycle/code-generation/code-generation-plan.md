# Code Generation Plan — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `functional-design/business-logic-model.md`、`functional-design/business-rules.md`、`functional-design/domain-entities.md`、`nfr-design/logical-components.md`、`nfr-design/performance-design.md`、`nfr-design/security-design.md`、`nfr-design/reliability-design.md`、`nfr-design/scalability-design.md`、`nfr-requirements/performance-requirements.md`、`nfr-requirements/security-requirements.md`、`nfr-requirements/scalability-requirements.md`、`nfr-requirements/reliability-requirements.md`、`nfr-requirements/tech-stack-decisions.md`、`units-generation/unit-of-work.md`、`delivery-planning/bolt-plan.md`、`requirements-analysis/requirements.md`

## 目的

`mirror-operation-lifecycle` Unit（Bolt1 最終・walking-skeleton の統合コア）が所有する **C6 Mirror Operation Executor**、**C7 Mirror Lifecycle Coordinator**（boundary driver ＋ completion driver ＋ reconciliation selector）、**C8 Presentation**（status／Issue content／prompt renderer）を、既存 TypeScript／ESM／Bun 構成へ実装する。既存の C0〜C5（`amadeus-mirror-types.ts`／`-config.ts`／`-policy.ts`／`-gateway.ts`／`-runner.ts`／`-capability.ts`／`-state-codec.ts`／`-state-reducer.ts`／`-state-store.ts`／`-provenance.ts`／`-repair.ts`）を **compose** し、再実装しない（TS-OL-02）。

あわせて **Issue #1454 を解消する**: `amadeus-orchestrate.ts` の暫定ブリッジ（`decideMirrorBoundary` の boolean マップ ＋ `emitMirrorBoundaryIfNeeded` 内の分岐）を真の三モード（`off`=完全抑止・`prompt`=event 単位確認・`auto`=bounded sync）へ置換し、`off`=ask 意味ギャップを消す。

## スコープ境界と設計逸脱の申告（実装前に leader/reviewer へ明示）

設計 `logical-components.md` は C7 を「engine が呼ぶ coordinator」と記すが、以下2点の既決制約により、**engine `next` の routing を driveMirrorBoundary へ置換しない**。これは無申告逸脱ではなく、上流既決制約からの明示的な範囲確定である。

1. `unit-of-work.md` Unit 4「配置・規模・制約」: **「engine routingを置換せず、Mirror failureでstage／phaseを恒久停止しない」**（正本の明文）。
2. **async gateway と sync `next` の非互換**: commit `1fa11c353` で Gateway の create/sync/close/readiness/find/view/edit/close は `Promise` 化された（`amadeus-mirror-types.ts:257-278`）。engine の `next`（`handleNext`→`emit`）は同期の directive emitter であり、async lifecycle を await できない。よって engine bridge は「conductor が別 CLI 起動で async lifecycle を回す」ための **directive を同期 emit** する層に留める。

したがって本 Unit の engine 側変更は **#1454 のブリッジ置換（三モード化・off 抑止）に限定**する（タスク指令「orchestrate.ts への変更が暫定ブリッジ置換の範囲を超える場合は停止・報告」に整合）。C6/C7/C8 の async runtime は、integration test（fake gateway ＋ real state store ＋ failure injection）で walking-skeleton Confidence Hypothesis を実測固定する。engine／manual CLI が driveMirrorBoundary を production 起動する完全配線は本 Unit のスコープ外（後続配線）とし、成果物・完了報告に明記する。

> レビュー観点への申告: driveMirrorBoundary/executor は integration test が production 同型に駆動する（fake は runner 差替のみ、`TS-OL-05`）。engine 未配線は上記1・2の既決制約に基づく確定であり、`decideMirrorAction` の三モード意味論は engine bridge の `decideMirrorBoundary` 三モード化として反映する。

## 現状と実装上の前提

- 正本は `packages/framework/core/tools/`。`dist/`・self-install 面は生成物で、正本編集後に `bun scripts/package.ts` ＋ `bun run promote:self` で同期（本 Unit では手編集しない）。`amadeus-orchestrate.ts` も dist 対象。
- C0〜C5 は commit `1d0f760b3`（state-provenance）時点でコミット済み・green（t257/t268-t278）。本 Unit は C0 を再定義せず import のみ。
- C6 が使う capability factory `createMirrorMutationPermit`（`amadeus-mirror-capability.ts`）は C6 専用（import direction test で固定）。permit は全 guard 通過後にのみ mint する。
- state 永続は `amadeus-mirror-state-store.ts` の `readMirrorState` / `mutateMirrorStateAtomic`（`MirrorStateStorePorts` 経由）。Mirror state block は `amadeus-state.md` 内の sentinel block（`amadeus-mirror-state-codec.ts`）に格納。
- runtime dependency 追加 0（TS-OL-01/03、Constraint 3）。active test strategy は Comprehensive。fake-clock/fake-gateway/fake-ports は test 側（TS-OL-05、production test mode を作らない）。

## 対象ファイル

| 種別 | ファイル | 予定 |
|---|---|---|
| App code (C6) | `packages/framework/core/tools/amadeus-mirror-executor.ts` | 新規。`executeMirrorOperation`（guard→prepare→readiness→attempted→remote→complete、create reconciliation、sync/close guard、post-remote failure mapping） |
| App code (C7) | `packages/framework/core/tools/amadeus-mirror-coordinator.ts` | 新規。`driveMirrorBoundary`、completion driver（bounded 3-op chain）、reconciliation selector、prompt/skip/approve、非阻害 boundary outcome envelope |
| App code (C8) | `packages/framework/core/tools/amadeus-mirror-presentation.ts` | 新規。`renderMirrorStatus`、`renderMirrorIssueContent`、`renderMirrorPrompt`（secret redaction、fixed field 順） |
| Engine bridge (#1454) | `packages/framework/core/tools/amadeus-orchestrate.ts` | **編集**。`decideMirrorBoundary` を boolean→三モード（`suppress`/`ask`/`auto-sync`）へ置換、`emitMirrorBoundaryIfNeeded` を `off`=suppress（emit 無し・pending 保持・fall through）へ。ブリッジ comment 除去 |
| Unit test (C6) | `tests/unit/t279-amadeus-mirror-executor.test.ts` | 新規。fake gateway ＋ fake ports で create/sync/close の guard・permit・順序・reconciliation decision |
| Unit test (C7) | `tests/unit/t280-amadeus-mirror-coordinator.test.ts` | 新規。mode routing（off/prompt/auto）、completion chain 3-op、prompt/skip/approve、reconciliation selector、workflowMayAdvance 常時 true |
| Unit test (C8) | `tests/unit/t281-amadeus-mirror-presentation.test.ts` | 新規。status field 順・provenance 表示、Issue content 固定 heading、secret sentinel、prompt 文言 |
| Integration (lifecycle) | `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts` | 新規。temp fs real state store ＋ fake gateway。**walking-skeleton Confidence Hypothesis**（create remote 成功→local write 失敗注入→再入で同 Issue 収束・新規 0 件）、off 抑止・auto chain・pre/remote/post failure injection、非阻害 |
| Test 更新 (t265) | `tests/unit/t265-engine-boundary.test.ts`、`tests/integration/t265-engine-boundary.integration.test.ts` | **編集**。`decideMirrorBoundary` 三モード signature、off=suppress ケース追加（申告付き fixture-propagation） |

`t279`〜`t282` は計画時点の次空き番号（現在最高 t278）。PART 2 完了時に runner の `Ran ... across M files` と照合する。並列採番衝突回避のため本 Unit 単独作業（swarm 無し）につき事前予約済み。

## 実装手順

### Step 1: C6 Executor を実装する（`amadeus-mirror-executor.ts`）

公開: `executeMirrorOperation(input): Promise<MirrorOperationOutcome>`。input = `{ context: MirrorExecutionContext; ports: MirrorStateStorePorts; localState: MirrorStateSnapshot }`。

- **create**（`business-logic-model.md` Create Execution 1-11）:
  1. `prepare`（create）transition を mutate（既 prepared は unchanged）→ 最新 snapshot 再読込で persisted create identity 取得。
  2. `createIdentityMatchesContext`（C4）で Intent UUID/dir/canonical repo 照合。不一致→`mark-safety-blocked`＋return safety-blocked（remote 0）。
  3. `renderMirrorMarker`（C4）で persisted identity から marker 描画。
  4. `gateway.readiness` 失敗→prepared 維持＋`set-warning`（not-started）＋return pending。
  5. `gateway.findIssuesByMarker` → 各候補を `verifyOwnership`（C4）で verified/mismatch 分類 → `classifyCandidates`（C4、localState=fresh-prepared|attempted-or-unknown|pending-no-effect）。
  6. `adopt`→ remote DTO と adopt provenance で `complete`（reconciliation=true）→ completed。
  7. `create-new`＋fresh→`claim-create-attempt` CAS。conflict→再読込1回・pending。winner のみ permit。
  8. pending+no-effect-confirmed+0→`retry-after-no-effect` CAS winner のみ permit。
  9. `safety-blocked`（zero-after-attempt/ambiguous/mismatch）→`mark-safety-blocked`＋return。
  10. permit（`createMirrorMutationPermit`）＋注入済み `issueContent` で `gateway.createIssue`。
  11. remote ok→`complete`（issueNumber・createdAt=now、provenance 保存）。remote failure→effect 別（not-started→prepared+warning/pending、no-effect-confirmed→`mark-pending`、outcome-unknown→`mark-pending`）。**remote 成功後の complete write 失敗→`mark-safety-blocked`（post-remote）＋attempted receipt 残置＋return safety-blocked**（次境界で reconcile）。
- **sync**（Sync Execution 1-8）: provenance＋issueNumber 存在検証→`gateway.viewIssue`→`verifyOwnership`→（completion final sync のみ landing check: registry complete＋state Completed は coordinator が渡す `landingVerified` flag で表現）→`prepare`/`mark-attempted`→注入 `issueContent.body` で `gateway.editIssue`→response 再検証→`complete`。attempted 再入で view body が `issueContent.body` 一致→edit 0 で complete、不一致→`claim-observed-retry` winner のみ再 PATCH。
- **close**（Close Execution guard 1-6）: provenance／marker／Intent／repo／Issue number／registry complete／state Completed／同 completion instance final sync succeeded を coordinator が渡す guard 入力で全通過→`gateway.closeIssue`→complete。attempted 再入で remote closed→PATCH 0 で complete、open→`claim-observed-retry` winner のみ再 close。
- 全 mutation は `MirrorAuditContext`（triggerEvent/operationEvent/operationId/reconciliation/classification）を渡す。CAS conflict は最新 state で1回だけ再評価しそれでも conflict なら pending（busy loop 0）。
- Trace: FR-3/4/5/6/10、REL-OL-01〜06、SEC 全 STRIDE、PERF-OL-02/03、business-rules Guard/Mutation Ordering/Retry Identity。

### Step 2: C8 Presentation を実装する（`amadeus-mirror-presentation.ts`）

- `renderMirrorIssueContent(input: { snapshot: MirrorSnapshot; marker: string }): MirrorIssueContent` — title/body/labels。body は Intent UUID・summary・phase・stage・status・updatedAt・marker を固定 heading 順（domain-entities MirrorIssueContent / business-logic-model Presentation）。GitHub 本文から生成しない。marker は末尾に非機密 comment として埋め込む。
- `renderMirrorStatus(ctx: MirrorStatusContext): string` — 出力順固定（resolved mode/source→Issue/repo→provenance unlinked|verified|unverified→pending/safety-blocked→warning classification/effect/occurredAt/retryable→次アクション）。O(N) snapshot、remote history 走査なし。
- `renderMirrorPrompt(input): string` — create/sync/close 対象・Intent・repo・Issue number・skip 効果を表示。色/emoji のみに意味依存しない。secret/token/raw diagnostics/URL query を出力しない（`redactSummary` helper で classification+短文のみ）。
- Trace: FR-8、SEC Information disclosure、SCAL status O(N)、NFR-1。

### Step 3: C7 Coordinator を実装する（`amadeus-mirror-coordinator.ts`）

- `driveMirrorBoundary(input): Promise<MirrorBoundaryOutcome>`（business-logic-model Boundary Evaluation 1-8）: C1 mode resolve→invalid は `set-global-warning`＋`continued`（suppressed）。C3 `readMirrorState`→invalid は `safety-blocked` warning 付き `continued`。C2 `decideMirrorAction` で単一 operation 決定。`off`→suppress→`continued`（mutation 0、warning/receipt 保持）。`prompt`→`set-expected-prompt`→`ask`。`execute`→C6。workflow completion のみ success 後 state 再読込で `nextCompletionOperation`（C2）による次 operation を最大3回直列（それ以外は1 operation で terminal）。
- **completion driver**（internal、logical-components CompletionDriver.select）: `{ snapshot, snapshotRevision, completionBoundary } -> { operation, expectedRevision } | terminal`。success 時のみ loop、最大3。
- **reconciliation selector**（internal、ReconciliationSelector.select）: 未完了 receipt があれば最古 eligible pending を先に選び originalEvent/operationId を C6 の `event`（retryOf）へ継承。current boundary event は `triggerEvent`。
- prompt approve: `approveMirrorPrompt`（C2）で永続 expected binding＋最新 state 検証→execute or suppress。skip: `skip-for-event`＋`consume-expected-prompt` を同 transaction 相当（reducer が受理）。
- 全 outcome を `continued(..., workflowMayAdvance=true)` へ包む（REL-OL-01）。Mirror failure から engine transition を止めない。
- Trace: FR-2/3/4/5/6/10、REL-OL-01〜06、business-rules Completion/Failure/Retry Identity/Prompt Rules。

### Step 4: Engine bridge を三モード化する（#1454、`amadeus-orchestrate.ts`）

- `MirrorBoundaryDecision` に `{ kind: "suppress" }` を追加。`decideMirrorBoundary(mode: MirrorMode, hasMirrorIssue: boolean)` へ signature 変更（boolean 廃止）: `off`→suppress、`prompt`→ask(includeCreate=!hasMirrorIssue)、`auto`→hasMirrorIssue?auto-sync:ask(includeCreate=true)。三モード意味論は C0 `MirrorMode` を唯一の源とし C2 `decideMirrorAction` の off=suppress と整合。
- `emitMirrorBoundaryIfNeeded`: malformed receipts→error（既存維持）。work（pending or 未完了 phase boundary）が無ければ false。work あれば config resolve→invalid→error。`resolved.config.autoMirror==="off"`→**return false（emit 無し・pending/receipt 保持・normal routing へ fall through）**。それ以外は `decideMirrorBoundary(mode,hasMirrorIssue)` で pending 分岐/auto-sync/ask を従来どおり emit。暫定 comment（:240-246）除去。
- Trace: Issue #1454 完了条件、FR-2.1/2.2、REL-OL-04。

### Step 5: Unit test（C6/C7/C8）を作成する

- `t279`（C6）: fake `MirrorGitHubGateway`＋fake `MirrorStateStorePorts`（in-memory snapshot）で create fresh→claim→createIssue、create attempted+1候補→adopt（remote 0 create）、attempted+0→zero-after-attempt block、2+→ambiguous block、identity mismatch→safety-blocked、readiness fail→pending、sync body 一致→edit 0 complete、close open→claim-observed-retry。permit forge 不可（gateway が reject throw）。独立 golden、`// covers:`＋`// size: small`。
- `t280`（C7）: off→suppress（mutation 0）、prompt→ask＋expected-prompt persist、auto+no issue→execute create、completion chain create→sync→close（success only）、skip→再質問無し、approve→execute、config invalid→global warning、state invalid→safety-blocked、全 outcome workflowMayAdvance=true。fake C1/C3/C6 注入 seam。`// size: small`。
- `t281`（C8）: status field 順・provenance 3値、Issue body 固定 heading、`;`/`$()`/backtick/newline を含む summary で secret sentinel 非出現、prompt skip 効果表示。`// size: small`。
- 期待値は被検実装を再利用せず独立 golden（pbt-oracle-cancellation）。

### Step 6: Integration test（lifecycle、failure injection）を作成する

- `t282`: temp fs に real `createMirrorStateStorePorts` ＋ fake gateway（createIssue で issue 記録、以降 findIssuesByMarker が同 issue を返す）。
  - **Confidence Hypothesis（DoD）**: auto create → remote 成功（issue #N）→ complete write を1回だけ失敗注入（ports wrap で writeDocumentAtomic を io-failure）→ outcome safety-blocked・receipt attempted。再入 driveMirrorBoundary → findIssuesByMarker が #N を返す → classifyCandidates(attempted-or-unknown,1) → adopt → complete → issueNumber=#N・**createIssue 呼び出し総数 1（新規 0 件）**を fake gateway history で assert。
  - off 全 boundary で mutation 0（gateway history 空）。auto completion で create→sync→close 順・各 remote mutation ≤1。sync 再入 body 一致で edit 0。pre-remote local write fail→remote 0。invalid config→suppressed＋global warning、resume 後も warning 残存。
  - `// covers:`＋fs 使用のため `// size: medium`（integration 配置、`fs-tests-integration-first`）。

### Step 7: t265 を三モード対応へ更新する（fixture-propagation、申告付き）

- unit `t265-engine-boundary.test.ts`: `decideMirrorBoundary` の6行 matrix を `["off",false,{suppress}]`/`["off",true,{suppress}]`/`["prompt",false,{ask,includeCreate:true}]`/`["prompt",true,{ask,includeCreate:false}]`/`["auto",false,{ask,includeCreate:true}]`/`["auto",true,{auto-sync}]` へ。receipts テストは不変。
- integration `t265-engine-boundary.integration.test.ts`: `seedBoundary` の config を三モード文字列で書けるよう拡張（既存 auto:boolean→"auto"/"prompt" 維持）。**off ケースを追加**: `off`＋mirror で `next` が mirror directive を出さず normal routing（run-stage 等）へ fall through・state 不変・pending 保持を assert。既存 prompt/auto 4象限ケースは挙動不変（回帰）。
- 申告: 置換により decideMirrorBoundary の入力が boolean→MirrorMode に変わるため既存2テストの期待を三モード正挙動へ更新する（無申告逸脱でない・#1454 の正当な contract 変更）。

### Step 8: 配布同期と検証

- [ ] `bun scripts/package.ts` ＋ `bun run promote:self`（orchestrate.ts 変更が全 harness dist/self-install へ伝播）。
- [ ] `bun run typecheck`（exit 0）／`bun run lint`（exit 0）。
- [ ] 対象テスト直接実行＋ファイル数照合、既存 mirror テスト（t257/t265/t268-t278）回帰無し。
- [ ] `bun run dist:check`／`bun run promote:self:check`（exit 0）。
- baseline red 分離: `#1455` loose-ref（t257:214/t258-integration:455/t259:96、mirror 非 import・決定的）は自変更外。coverage gate DROP/MISSING は fixture red herring。assertion 実文で確認。

## 検証劇場・Forbidden 回避

- failure injection は実際に分岐を踏む（post-remote write fail→safety-blocked、pre-remote→remote 0 を fake gateway history で実測）。落ちる実証を各 mapping で行う。
- 後方互換シム・boolean 互換分岐を追加しない（`decideMirrorBoundary` は boolean を完全廃止、Forbidden／FR-1.6）。
- 未使用の将来予約 field を追加しない（NFR-3）。C6/C7/C8 の型は policy/status/retry/close guard/test が実消費。
- surgical: orchestrate.ts は #1454 ブリッジ置換に限定、他 engine 挙動を変えない。

## Trace 総括

FR-2〜FR-8・FR-10、NFR-1〜5、REL-OL-01〜06、PERF-OL-01〜08、SEC STRIDE 全項、SCAL capacity、business-rules 全表、Issue #1454 完了条件（ブリッジ置換・除去・レビュー観点）を上記 Step へ割り当てた。
