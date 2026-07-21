# Code Generation Summary: runtime-recovery

## 結論

runtime graph の Bolt DAG cache を canonical dependency artifact からread-sideで回復し、gate revision証拠の欠落を既存approve transaction内で補完する実装とfull CI closureを完了した。DAGのconsumerは単一recovery resultを共有し、gate revisionは5 blockを1 transactionとしてatomic commitする。新event、schema、store、service、runtime dependency、coverage threshold / allowlistは追加していない。

User Stories stageはengine正本で`SKIP`されたため、本実装のstory traceabilityはcaptured intent「Implement the approved upstream AI-DLC v2.2.0-to-v2.3.0 sync plan (docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md): 24 ADOPT/ADAPT items incl. the 2.3.0 plugin mechanism; run ideation only, then park」へ直接縮退した。本Unitはcaptured intentだけからscopeし、approved sync planをengineが分解したU02 runtime-recovery以外へ広げていない。

## 実装内容

| 要求 | 実装結果 |
|---|---|
| canonical DAG recovery | `recoverBoltDag`がcanonical artifactを正本とし、cacheのmissing / empty / malformed / staleをread-sideで回復する。canonical不存在だけはsingle iterationへ降格し、unreadable / malformed / duplicate edge / cycleはloud failureにする。runtime graphは書き換えない。 |
| consumer convergence | `amadeus-orchestrate.ts`のper-unit selection、coverage、swarmが同じ回復済みbatchを使用する。回復時のdiagnosticは1回だけ出力する。 |
| gate revision evidence | adapterがcross-shard Timestamp collisionをfilename非依存でfail-closedにし、衝突がない場合だけ`recoverGateRevision`がTimestamp、同一shard内buffer position、organic gateまたはstage-start fallback、最初のhuman pivot、declared produceをclosed predicateとして判定する。reject、autonomous、無効証拠は回復しない。 |
| atomic approval | `amadeus-state.ts`が`GATE_REJECTED → STAGE_REVISING → STAGE_AWAITING_APPROVAL → GATE_APPROVED → STAGE_COMPLETED`を同一transaction idで事前生成・検証してatomic appendする。最初の3 blockだけをrecoveredとして記録し、stateは最終形だけを書き込む。 |
| retry convergence | audit transaction済みでstate未反映のretryは、同一transaction id内の連続5-block windowについて順序、timestamp、stage、transaction、Recovered、Feedback、Revision Count、Detailsを再検証する。壊れたwindow後に再生成された一意な完全windowはaudit追加0で再利用し、完全windowが複数ならfail-closedにする。後発organic anchorも完了証拠として信頼しない。 |
| review hardening | canonical dependencyはENOENTだけを不存在扱いにし、その他のread failureをloud failureにする。duplicate edgeを拒否し、stage-wide per-Unit gateは全canonical Unitのdeclared produceを認識する。Windows absolute pathとworktreeを跨ぐ同一record suffixを正規化し、prefix collisionを拒否する。recovered reject / revisingには決定的Feedbackを付与・検証する。atomic audit commit failureではaudit / stateの呼出前bytesを維持する。 |

## Files created / modified

### Authored source

- `packages/framework/core/tools/amadeus-lib.ts`: pure seam `recoverBoltDag`、`recoverGateRevision`と判別可能result型。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: canonical artifact read、single recovery result、diagnostic、loud failure。
- `packages/framework/core/tools/amadeus-state.ts`: evidence取得、cross-shard Timestamp collision拒否、内部batch validator、5-block transaction、atomic audit commit、state retry。

`validateRecoveredApprovalBatch`は非exportの内部helperであり、production `handleApprove` pathから検証する。追加したruntime公開面は`recoverBoltDag`と`recoverGateRevision`の2件だけである。

### Authored tests

- `tests/unit/t247-runtime-recovery.test.ts`: DAG matrix、duplicate edge / cycle、chronology、predicate negative matrix、Windows / cross-worktree path照合。
- `tests/integration/t247-runtime-recovery.test.ts`: subprocessとin-process production path、cache heal、canonical failure、atomicity、audit/state failure、完全batch retry、永続batch tamper後の再生成・state-write retry、複数完全window拒否、scope failure、unreadable shard / dependency、malformed batch、workflow finalization。

### Existing test / evidence collateral

- `tests/integration/t135-invoke-swarm.test.ts`: canonical dependency artifactをDAG fixtureへ追加。
- `tests/integration/t212-optional-produces.test.ts`: canonical dependency artifactをDAG fixtureへ追加。
- `tests/unit/t186-foreach-per-unit-iteration.test.ts`: canonical dependency artifactとState Version 7必須fieldをfixtureへ追加。
- `tests/unit/t211-swarm-batch-progress.test.ts`: canonical dependency artifactをDAG fixtureへ追加。
- `tests/integration/t52-drift-meta-validation.test.ts`: recovery由来の複数`GATE_APPROVED` emitterを扱うaudit drift mutationへ更新。
- `tests/integration/t199-generated-prefix-contract.test.ts`:本intentの正確なprovenance pathだけを既存exact-content allowlistへ追加。
- `tests/unit/gen-coverage-registry.test.ts`: t247 integration testをcoverage registry fixtureへ追加。
- `tests/.coverage-registry.json`: `recoverBoltDag` / `recoverGateRevision`の正規coverage registrationを追加。
- `tests/.coverage-ratchet.json`:正規generator出力のcovered function countを更新。
- `tests/.coverage-patch-allowlist.json`:既存defensive catch entryの物理行移動だけを正規generator出力へ同期し、U02 allowlistは0件のまま維持。

### Formal I1 remediation artifacts

- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/functional-design/business-logic-model.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/functional-design/business-rules.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/functional-design/domain-entities.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-design/performance-design.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-design/security-design.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-design/scalability-design.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-design/nfr-design-questions.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-requirements/performance-requirements.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-requirements/scalability-requirements.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-requirements/tech-stack-decisions.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/nfr-requirements/nfr-requirements-questions.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/runtime-recovery/code-generation/code-summary.md`

### Generated package projections

- `dist/claude/.claude/tools/amadeus-lib.ts`
- `dist/claude/.claude/tools/amadeus-orchestrate.ts`
- `dist/claude/.claude/tools/amadeus-state.ts`
- `dist/codex/.codex/tools/amadeus-lib.ts`
- `dist/codex/.codex/tools/amadeus-orchestrate.ts`
- `dist/codex/.codex/tools/amadeus-state.ts`
- `dist/cursor/.cursor/tools/amadeus-lib.ts`
- `dist/cursor/.cursor/tools/amadeus-orchestrate.ts`
- `dist/cursor/.cursor/tools/amadeus-state.ts`
- `dist/kiro/.kiro/tools/amadeus-lib.ts`
- `dist/kiro/.kiro/tools/amadeus-orchestrate.ts`
- `dist/kiro/.kiro/tools/amadeus-state.ts`
- `dist/kiro-ide/.kiro/tools/amadeus-lib.ts`
- `dist/kiro-ide/.kiro/tools/amadeus-orchestrate.ts`
- `dist/kiro-ide/.kiro/tools/amadeus-state.ts`
- `dist/opencode/.opencode/tools/amadeus-lib.ts`
- `dist/opencode/.opencode/tools/amadeus-orchestrate.ts`
- `dist/opencode/.opencode/tools/amadeus-state.ts`

### Generated self-install projections

- `.claude/tools/amadeus-lib.ts`
- `.claude/tools/amadeus-orchestrate.ts`
- `.claude/tools/amadeus-state.ts`
- `.codex/tools/amadeus-lib.ts`
- `.codex/tools/amadeus-orchestrate.ts`
- `.codex/tools/amadeus-state.ts`
- `.cursor/tools/amadeus-lib.ts`
- `.cursor/tools/amadeus-orchestrate.ts`
- `.cursor/tools/amadeus-state.ts`
- `.opencode/tools/amadeus-lib.ts`
- `.opencode/tools/amadeus-orchestrate.ts`
- `.opencode/tools/amadeus-state.ts`

package 6面とself-install 4面は`bun run dist`と`bun run promote:self`だけで再生成し、手編集していない。

### Full CI closure

- harness非依存の修復diagnosticを`harnessDir()`へ接続し、`.kiro` projectionをt247で固定した。
- State Version 7の必須fieldを欠いていたt186 fixtureだけを補正し、productionのstrict validationは弱めていない。
- t199では本intentが導入したupstream provenance 12 pathだけをexact content allowlistへ追加した。包括除外やcoverage allowlistは追加せず、freeze済みの別Unit artifactは変更しない。
- patch coverageの未計測分岐は、unreadable audit shard、unreadable Unit dependency、malformed stage metadata / Feedback、cycle、壊れた永続batchを本物のin-process approve経路で固定した。内部validatorをexportせず、新しいruntime挙動seamは追加していない。
- 独立pre-reviewで指摘されたstage-wide Unit集合、canonical read error、Windows / cross-worktree path、duplicate edge、永続batch全数検証と一意な完全window再利用、recovered Feedback、atomic failure時のbytes不変、最終test証跡の古さを修正し、全品質工程を最終コードで再実行した。

## RED → GREEN

- unit REDで正準2 seam不在を固定し、source/cache 8分類とrevision chronologyを実装後に8/8 GREEN化した。
- integration REDでstale cache、malformed canonical、5-block atomicity、state-write retryを固定した。
- coverage blind spot是正ではproduction handlerを直接駆動し、読取失敗によるrecovery抑止と専用validation errorを非空証拠で検証した。product APIは追加していない。
- Comprehensive test strategyは既存`bun:test`、`tests/run-tests.ts`、`package.json`の`test:ci` / `coverage:ci`、coverage registry / ratchet / allowlistをそのまま使用した。新規test configuration fileは追加していない。
- U02は利用者journey、UI、外部service、network、databaseを追加しない既存CLI内部Unitであるため、独立E2E test fileを非該当とした。代替としてt247 integrationがhermetic workspace上で実CLI subprocess、production `handleNext` / `handleApprove`、audit/state filesystem boundary、failure injectionをend-to-endに駆動する。
- 最終focused回帰はt186、t199、t247 unit / integrationの4 filesで63/63 PASS、281 expects。t247 unit / integrationは40/40 PASS、184 expects。

## 最終検証

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint:check` | exit 0。既存warning 210件 / info 16件のみ。 |
| complexity gate | PASS。new violation 0、regression 0。 |
| `bun run dist:check` | PASS。package 6面 drift 0。 |
| `bun run promote:self:check` | PASS。self-install 4面 drift 0。 |
| final full CI | `tests/logs/2026-07-21T23-34-05Z`、402 files / 5748 assertions / failure 0、parallelism 4、PASS。 |
| final coverage CI | `tests/logs/2026-07-21T23-37-59Z`、402 files / 5748 assertions / failure 0、parallelism 4、`coverage/lcov.info`生成、PASS。 |
| project coverage gate | current 73.7525%、baseline 40.9395%、+32.8130pp、PASS。 |
| intent patch coverage gate | rebased U02 base `060428d0722b92e6fca899e2212762eb66017f9a`、1258 measured / 1258 covered / allowlisted 0 / uncovered 0、100%、PASS。 |
| U02 8-path evidence diff | base `060428d0722b92e6fca899e2212762eb66017f9a`、91210 bytes / SHA-256 `1dab7d9b909987ca949682d40b00b794c25e605778ec2afa88c43dbdbc25ce6a`。 |
| Code Generation sensors | closeout authored TS 7件のlinter・type-check 14/14が`SENSOR_PASSED`。answer-evidenceはquestions成果物なしのため非該当。 |

AWS credential失効によりlive SDK/substrate由来テストはharness規定どおりskipされた。full CI / coverage CIとも`tests/integration/t-codex-hooks-migration.test.ts`の宣言medium・実測largeというadvisoryなwall-clock driftが1件あり、test resultはPASSである。

## Sensor fire IDs

| Closeout output | linter | type-check |
|---|---|---|
| `amadeus-lib.ts` | `de39fd13` | `368e21d5` |
| `amadeus-orchestrate.ts` | `0c7fd0ff` | `c73e904f` |
| `amadeus-state.ts` | `5999e557` | `df73c847` |
| unit t186 | `9b64386b` | `d185ddc4` |
| integration t199 | `3c35f77f` | `8730f721` |
| unit t247 | `538f4104` | `2d6eaad7` |
| integration t247 | `64cc50c1` | `22ac1790` |

## 証跡hash

| 対象 | SHA-256 |
|---|---|
| `amadeus-lib.ts` | `b69d18e4ab11babd256255b0dc7b5da18d1249b245772a5df4f6c8a05ad8e83e` |
| `amadeus-orchestrate.ts` | `d109ce696d82f0cd4b7458cdb01c2d18cc0cf55ea79ae6e1ca05e261aa7aacf7` |
| `amadeus-state.ts` | `fd7715fc0444f316236a25fdc5b78932701433126a97e21899ef413c59976646` |
| unit t247 | `f81ac62ac13672f11b9b476cfba020f0246c6acdb71d827b01fa70485ef04314` |
| integration t247 | `b61e9b55d3587815d6ca1b66d61b2380bcf05ab75580dea1b625bda107ef4184` |
| coverage registry | `4164d42792b936565a4c2a00759902f55be500051dbabd9bb0b4f6f52e80e7e6` |
| coverage ratchet | `b0180e232963129720611608583fefe385e3bc02ac5d2d6a3ccd7dd82fb54d3a` |
| coverage allowlist | `c4cc13ba7d08ac92a5e08f818f6aeacd261f7b5005cbfd62adf2e6bb207690bb` |
| 8-path diff aggregate | `1dab7d9b909987ca949682d40b00b794c25e605778ec2afa88c43dbdbc25ce6a` |
| `coverage/lcov.info` | `3a9231794967b242b1d10f5b63bb95dbd90b19671be9beeaca0879e6ba24ef31` |

## 独立レビュー

- e3最終再レビュー: `READY`、GoA `PASS`、Critical / Major / minor 0。永続batch全数検証と一意な完全window再利用を`CLOSED`判定した。
- e4最終再レビュー: `VERIFIED` / `READY`、GoA `PASS`、Critical / Major / minor 0。同findingを`CLOSED`判定し、新規findingなしとした。

## Issue candidates

- `tests/integration/t-codex-hooks-migration.test.ts`はfull CIで36.08499秒、coverage CIで34.531854秒となり、宣言`medium`に対して実測`large`のwall-clock driftを継続した。両runはPASSでありU02の機能・coverageを阻害しないため、本Unitでは修正せず後続issue候補とする。

## Review handoff

source、test、projection、full / coverage、patch gateをfreezeした。e3/e4が共通して指摘した「壊れたwindow後の正常batchをstate-write retryで再利用できない」Majorは、一意な連続5-block window検証と合成回帰で修正し、両者が`CLOSED` / `READY`と再確認した。durable Formal I1は`NOT-READY`だったが、captured-intent traceability、test configuration、公開2 seam、変更path列挙、cross-shard collision fail-closedの4 findingをすべて是正した。

別identity・新規invocation `a1eacf34-c233-448a-b668-6bba8301983a` のFormal I2はiteration 2で`NOT-READY`となり、review上限に到達した。指摘後、独立E2E fileの非該当判断とintegration production-path代替をplan / summaryへ明記し、routing-and-autonomy-guards summaryはU02着手前のbytesへ復元した。復元後のt199は8/8 PASS、47 expectsである。Formal verdictは改変せずdurable `NOT-READY`のまま保持し、2026-07-22の人間判断「是正済み状態を承認して続行」に従って進行した。§13はmemory entry 0、candidate 0、open question 0で完了し、永続化するlearningはなかった。PR statusは`NOT_CREATED`、mergeは実行していない。
