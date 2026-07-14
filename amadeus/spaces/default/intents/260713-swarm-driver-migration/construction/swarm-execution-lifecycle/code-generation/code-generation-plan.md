# Swarm Execution Lifecycle コード生成計画

## 対象と完了条件

本計画は U-02 `swarm-execution-lifecycle` を **1 Unit = 1 Bolt = 1 PR** で実装する。PR 内を追加の Unit、Bolt、子 PR へ分割しない。レビュー順序だけを後述の Step 1〜8 で明示し、各 Step は同じ PR の連続した実装単位とする。

U-02 は U-01 の公開契約を消費し、selection plan、prepared worktree、native/floor/legacy の実行結果、normalized evidence、既存 referee の再検証と merge、crash resume を一つの stateful lifecycle に束縛する。完了条件は次のとおりである。

- U-01 の `DriverAdapter`、`DriverRegistration`、`ProbeResult`、`LaunchSpec`、selector result をそのまま利用し、driver 値、selection 表、fallback reason、legacy 表、registration schema を再実装しない。
- `resolve`、`run`、`resume`、`record-floor`、`record-legacy`、`record-finalize`、`status` を versioned JSON CLI として提供する。
- behavior probe は materialized checkpoint 後に attempt ごと・候補ごと最大1回だけ行い、明示 driver の probe failure では worker、worktree、floor を開始しない。
- native 自己申告だけでは成功せず、verified execution、referee re-verify、AIDLC merge、code merge、cleanup、Unit audit、driver checkpoint materialization の AND でのみ batch を成功にする。
- audit-first transition、atomic checkpoint、lease/fencing、identity-first/one-time-arm、request/result exact binding により、crash 後の false success、成功 event の二重発行、stale writer mutation を0件にする。
- production registry は Claude/Codex/Kiro の3 moduleを静的 import し、4 native driver を exhaustive に対応付ける。U-02 時点では各 provider moduleを型付き `unavailable` slotとして fail-closed にし、実 adapter は U-03〜U-05へ残す。
- Comprehensive test strategy に従い、unit、property、integration、E2E、failure injection、performance/security seam を用意し、U-02 の FR と USR を少なくとも1件の test へ追跡する。

## 境界と非目標

- C-01 driver lifecycle と C-11 referee は互いを直接 import / invoke しない。conductor が `record-finalize(request) → referee finalize → record-finalize(result)` の versioned JSON を媒介する。
- provider 固有の CLI command、raw event parser、mode/model/trust probe、wave 分割、live proof は U-03〜U-05 の責務である。U-02 は placeholder slot と fake adapter test だけを持つ。
- referee の convergence 判定、lying-conductor guard、Bolt state/audit/runtime merge、worktree/Git merge mechanics は既存 primitive を拡張して再利用し、coordinator 内へ複製しない。
- harness `SKILL.md` の切替、利用者向け共有文書、全配布物の最終同期、0.2.0 削除 Issue は U-03〜U-06 へ残す。
- daemon、database、queue、network service、cloud resource、dynamic plugin discovery、Windows 対応、新しい runtime package は追加しない。

## 予定する変更面

### 正本コード

| 種別 | 予定ファイル | 目的 |
|---|---|---|
| 新規・pure domain | `packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts` | branded ID/digest、closed checkpoint/transition、evidence verdict、finalize request/result contract、canonical parse/build |
| 新規・stateful store | `packages/framework/core/tools/amadeus-swarm-driver-store.ts` | audit-first checkpoint、lease/heartbeat/fencing、begin/transition reconciliation、redacted driver audit |
| 新規・process port | `packages/framework/core/tools/amadeus-swarm-driver-supervisor.ts` | macOS/Linux process identity、identity-first wrapper、one-time arm、exact group terminate/wait |
| 新規・composition root | `packages/framework/core/tools/amadeus-swarm-driver-runtime.ts` | selector/registry/store/verifier/supervisor の組立て、`createCoordinator({ registry })`、production registry assembly |
| 新規・公開 CLI | `packages/framework/core/tools/amadeus-swarm-driver.ts` | `resolve` / `run` / `resume` / `record-*` / `status` の versioned JSON 入出力 |
| 新規・provider slot | `packages/framework/core/tools/amadeus-swarm-driver-adapters/{claude,codex,kiro}.ts` | U-01 registration contractを満たす静的 fail-closed placeholder。各 provider Unit の単一変更点 |
| 新規・C-11 deep module | `packages/framework/core/tools/amadeus-swarm-referee-finalize.ts` | immutable request record、single-writer claim、fenced progress/result、partial merge reconciliation、v1 envelope |
| 既存 referee | `packages/framework/core/tools/amadeus-swarm.ts` | `prepare` / `check` の意味を維持し、finalize を versioned binding と deep moduleへ接続 |
| 既存 primitive | `packages/framework/core/tools/amadeus-bolt.ts` | operation ID と claim guard を受け、既存 AIDLC merge substep を idempotent に再調停 |
| 既存 primitive | `packages/framework/core/tools/amadeus-worktree.ts` | bound target/strategy/source head、claim guard、strategy別 code-merge outcome と cleanup resume |
| 既存共通基盤 | `packages/framework/core/tools/amadeus-audit.ts` | driver event 5種の taxonomy / allowlist と相関 field、既存 swarm event の finalize invocation 相関 |
| 既存共通基盤 | `packages/framework/core/tools/amadeus-lib.ts` | 必要な confined path / canonical file helperだけを既存 lock・atomic write seamへ追加。lifecycle policyは置かない |
| 監査契約 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md` | 新しい driver event の schema・emitter ownership を正本へ追加 |

ファイル分割は上記を上限の目安とし、単一用途の薄い wrapper は増やさない。pure lifecycle、stateful store、process supervisor、runtime composition、referee finalize という failure domain に沿った deep module だけを作る。

### Test と生成対象

| 種別 | 予定ファイル | 主な検証 |
|---|---|---|
| Unit | `tests/unit/t227-swarm-driver-lifecycle.test.ts` | closed state/edge、schema、digest、invalid combination、request/result binding |
| Unit / failure injection | `tests/unit/t228-swarm-driver-store.test.ts` | audit-first、write failure、dedupe、lease/fencing、begin/transition resume |
| Property / security | `tests/unit/t229-swarm-driver-evidence.pbt.test.ts` | event order、Unit-child全単射、unknown/secret field、canonical digest、計算量 counter |
| Integration | `tests/integration/t230-swarm-driver-supervisor.test.ts` | identity/arm/crash、PID reuse、exact group、macOS/Linux liveness seam |
| Integration | `tests/integration/t231-swarm-driver-runtime.test.ts` | fake registry、probe once、hard error side effect 0、floor/legacy、production placeholder |
| E2E / failure injection | `tests/e2e/t232-swarm-driver-lifecycle.test.ts` | 2 Unit以上の fake lifecycle、prepare/check/finalize、lying conductor、crash/retry、merge outcome |
| Architecture | `tests/integration/t233-swarm-driver-boundary.test.ts` | C-01/C-11 direct import/invoke 0、static registry、dynamic discovery/runtime dependency 0 |
| 既存回帰 | `tests/e2e/t134-swarm-referee.test.ts`、`tests/integration/t135-invoke-swarm.test.ts`、`tests/unit/t207-swarm-guards.test.ts` | 現行 prepare/check/finalize、protected spec、batch tally、guard の後方互換 |
| Taxonomy / coverage | `tests/unit/t28-audit-event-sync.test.ts`、`tests/unit/t111.test.ts`、`tests/unit/gen-coverage-registry.test.ts`、`tests/.coverage-registry.json`、`tests/.coverage-ratchet.json` | event allowlist、test discovery、coverage universe / ratchet |
| 生成物 | `dist/{claude,codex,kiro,kiro-ide}/` と Claude/Codex self-install 対象 | 正本から機械生成し、生成先を直接編集しない |

## Test strategy

Active Test Strategy は **Comprehensive** である。各 logical component は happy path、最低2つの error/edge case、closed state/schema の invalid case を含む 10〜15 test case を目安にする。test pyramid は unit/property を主、process・store・CLI boundary を integration、2 Unit以上の full lifecycle を E2E とする。

- Unit: checkpoint/transition/failure code、canonical digest、manifest/result/evidence bijection、finalize binding、redaction を exhaustive table で検証する。
- Integration: actual temp Git repository と fake adapter/process port を用い、audit/checkpoint、identity/arm、CLI stdin/stdout/exit、referee request/result transport を検証する。
- E2E: fake adapterを `createCoordinator({ registry })` へ注入し、既存 `prepare` / `check` / `finalize`、protected spec、lying-conductor guard、AIDLC/code merge の双方へ通す。provider live proofの代替にはしない。
- Failure injection: すべての audit→write、identity→arm、request→claim→primitive→result 境界、2 process race、stale fencing、partial merge、finalize 後 record 前 crash を対象にする。
- Performance/security: probe count、audit lock内 external wait 0、`O(n log n)` / `O(n+e)` operation count、secret canary、path traversal、arm replay、PID reuse、unknown field を回帰 gate にする。
- Platform: deterministic suite は macOS と GitHub Actions Linux を必須とする。Windows は対象外で、platform fixtureを未検証成功へ読み替えない。

### Test configuration

新しい test runner/config は追加しない。`tsconfig.tests.json` は `tests/**/*.ts` を includeし、`tests/run-tests.ts` は tier と `covers:` metadataから既存 discovery を行うため、Step 7で新規 test が既存設定に自動検出されることを確認する。必要な変更は coverage registry / ratchet と metadata の同期だけに限定する。

## 実装手順

- [x] **Step 1: baseline、受入matrix、既存 primitive の拡張 seam を固定する。** U-01の4正本を先にimport contractとして読み、`amadeus-swarm.ts`、`amadeus-bolt.ts`、`amadeus-worktree.ts`、audit/lock/atomic helperの現行挙動をfixtureで固定する。FR-05/06/15/18〜22、USR-01〜10、BR-01〜44、U02-PERF/REL/SEC/SCALEを新規testへ割り当て、既存挙動を変える箇所は versioned envelope、operation guard、protected-spec baselineだけに限定する。Verify: 現行 `t134`、`t135`、`t207` が変更前greenで、未割当FR/USRが0件。

- [x] **Step 2: pure lifecycle contract と fake-first testを実装する。** `amadeus-swarm-driver-lifecycle.ts` と `t227` / `t229` を test-first で追加し、probe前 `probing`、selected以後だけの context、closed transition、immutable Unit state、normalized evidence、finalize request/result exact binding、unknown/secret field拒否を固定する。U-01のdriver/registration/selector型を再exportまたはimportして使い、新しいdriver literalやselection policyを作らない。Verify: lifecycle unit/property test、typecheck、fixed-seed反復がgreen。Trace: Slice 1・2・5、USR-01〜06/09、FR-05/06/15/18/19/21/22。

- [x] **Step 3: audit-first store、lease/fencing、armed supervisor と resume を実装する。** `amadeus-swarm-driver-store.ts`、`amadeus-swarm-driver-supervisor.ts` と `t228` / `t230` を追加する。`withAuditLock`内は再読/CAS/audit append/atomic replaceだけにし、process waitを外へ出す。begin orphan、transition reapply、event dedupe、30秒lease/5秒heartbeat、owner非生存確認、identity-before-arm、exact group回収、新attemptでのre-probeをfailure injectionで閉じる。Verify: 各crash点でunarmed child・重複event/operation・stale mutationが0件、macOS/Linux liveness seamがgreen。Trace: Slice 4、USR-10、FR-18〜22、NFR-02〜05。

- [x] **Step 4: production registry、runtime composition、公開 CLI を実装する。** 3つのprovider placeholder、`amadeus-swarm-driver-runtime.ts`、`amadeus-swarm-driver.ts` と `t231` を追加する。`createCoordinator({ registry })` はtest injectionを許す一方、production pathは3 moduleのstatic importと4 driver exhaustive mappingだけを使う。resolve/run/record-floor/record-legacy/record-finalize/status/resumeをversioned JSONで実装し、probe-once、explicit hard error side effect 0、`auto`のpre-dispatch floor、legacy独立mode、redacted event相関を検証する。Verify: fake registry lifecycle、placeholder explicit failure、floor/legacy record、CLI exit/stdout/stderr testがgreen。Trace: Slice 1〜4、USR-01〜09、FR-05/06/18/19/22。

- [x] **Step 5: referee finalize を request-bound single-writer lifecycleへ拡張する。** `amadeus-swarm-referee-finalize.ts` を追加し、`amadeus-swarm.ts`、`amadeus-bolt.ts`、`amadeus-worktree.ts`を最小変更する。prepare/checkの既存意味を維持し、prepared共通base blobを protected-spec baselineとして固定する。finalizeはrequest create-if-absent、claim CAS、armed primitive、slug順 re-verify/merge、AIDLC/code/cleanup/Unit-audit progress、strategy別postconditionをversion 1 envelopeへ閉じる。C-01をimportせず、conductor transportだけが両CLIを結ぶ。Verify: `t134`回帰と`t232`でlying conductor、protected-spec改変、同時finalize、各partial merge、同一invocation retryの追加副作用0を確認する。Trace: Slice 1・4・5、USR-01〜05/10、FR-15/18/20/21/22。

- [x] **Step 6: audit taxonomy、terminal projection、全 failure mapping を閉じる。** `amadeus-audit.ts` と audit-format正本へ `SWARM_DRIVER_ATTEMPTED`、`SWARM_DRIVER_SELECTED`、`SWARM_DRIVER_TRANSITION`、`SWARM_DRIVER_RECONCILED`、`SWARM_NATIVE_EVIDENCE` のversioned allowlistを追加し、既存 swarm eventへfinalize invocation相関を付ける。`record-finalize(result)`は全expected UnitのAIDLC/code/cleanup/audit、request/result digest一致時だけ`succeeded`をmaterializeする。unknown referee codeやschema違反を推測しない。Verify: taxonomy sync、secret canary、execution IDからselection/probe/evidence/fallback/finalizeまで追跡欠落0、failure code table 100%。Trace: Slice 3〜5、USR-01〜10、FR-18〜22、NFR-02〜05。

- [x] **Step 7: Comprehensive test構成とcoverage台帳を同期する。** `t227`〜`t233`へ正しい `covers:` / tier / size metadataを付け、`tsconfig.tests.json`と既存runnerによる自動発見を確認する。`tests/gen-coverage-registry.ts`でregistry/ratchetを再生成し、追加行coverageと既存quality thresholdを満たす。testをskipやplatform N/Aでpassにしない。Verify: registry `--check`、test discovery、typecheck、lint、coverage ratchetがgreen。Trace: FR-22、NFR-11。

- [x] **Step 8: 1 PRの最終収束と正本からの投影を行う。** U-02差分だけであること、U-01契約の重複実装がないこと、provider実装/harness docsを先取りしていないこと、C-01/C-11 direct dependencyが0件であることをarchitecture testとdiff reviewで確認する。`bun run dist` と `bun run promote:self` で生成対象を正本から同期し、関連test、`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bun tests/run-tests.ts --ci`、`git diff --check`を通す。失敗が設計変更を要求する場合は同じU-02 PR内で勝手にscopeを広げず停止して報告する。Trace: USR-01〜10、FR-05/06/15/18〜22、NFR-02〜05/11。

## Story-to-step traceability

| Scenario | U-02で閉じる受入結果 | Plan Step | 主なtest |
|---|---|---|---|
| USR-01 | coordinated selection planをexecution/attempt、prepared Unit、evidence、refereeへ相関する | 2、4〜6 | `t227`、`t231`、`t232` |
| USR-02 | independent selection planを同じ共通lifecycleへ通す | 2、4〜6 | `t227`、`t231`、`t232` |
| USR-03 | unknown topology/reasonを変更せずcheckpoint/auditへ保持する | 2、4、6 | `t227`、`t231`、taxonomy test |
| USR-04 | 明示native planをprobe/evidence/refereeの共通境界へ通し、能力不足を開始前に拒否する | 2、4〜6 | `t231` hard-error fixture、`t232` |
| USR-05 | driverが返すwaveを再分割せず、全Unit全単射とreferee収束を検証する | 2、4、5 | `t229` generated set、`t232` |
| USR-06 | harness mismatchではattempt/worker/worktreeを0件にする | 1、2、4 | `t231` no-call fixture |
| USR-07 | `auto`だけのdispatch前floor fallbackをloud auditとfloor resultへ相関する | 4、6 | `t231` floor integration、taxonomy test |
| USR-08 | legacy planをnative aliasにせず、解決試行ごとにwarning/auditを記録する | 4、6 | `t231` legacy全行 integration |
| USR-09 | 新旧env競合をattempt ID採番前に拒否し、side effectを0件にする | 1、2、4 | `t231` no-side-effect fixture |
| USR-10 | 同じexecutionの新attemptでprobeから再開し、referee確定済みUnitだけを再利用する | 3、5、6 | `t228` crash/fencing、`t232` resume E2E |

## Review gate

PART 2へ進む前に、本計画のStep順、変更面、Test strategy、Story-to-step traceabilityについてユーザー承認を得る。architecture reviewerは実装完了後に独立レビューを行う。承認前はapplication code、test、config、`code-summary.md`を作成・変更しない。

## Closed PTY / capture追補（中間スタックPR）

U-03開始前の独立レビューで、U-02が所有すべきclosed transport／capture契約が不足していることが判明した。この追補は、provider固有実装を始める前に次の共通seamを固定する中間スタックPRとして扱う。U-02完了は主張しない。

- `stdio-json | pty-interactive`、`fixed-provider-path | event-bound-provider-path | hook-only`をclosed unionとして追加する。
- resource preparation、materialized receipt、capture identity、process identity、one-time armをaudit-first checkpointへ相関する。
- event-bound captureはbinding eventを1件だけ採用し、checkpoint保存後にobserverへexact pathを適用する。継続streamのEOFを待たない。
- PTY controlは相関済みsignalをちょうど1件要求し、process terminalのcontrol receipt、capture terminal、native run、process identityを相互照合する。
- execution／launch／transport／capture／永続化relative pathのunknown fieldと不正variantを拒否する。
- transition適用時にも完成checkpointをclosed parserへ通し、後続read時だけ不整合が判明する状態を作らない。

後続のU-02スタックPRでは、production generic Resource／Capture／Process supervisorと、親process異常終了後に残るactive `prepared`／`dispatched` attemptのexact group回収・resumeを実装する。この2点がgreenになるまでU-02は未完了である。
