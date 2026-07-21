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
- `amadeus/spaces/default/intents/260720-upstream-sync-230/construction/routing-and-autonomy-guards/code-generation/code-summary.md`: t199自己言及を避ける表現へ修正。

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
- t199では本intentが導入したupstream provenance 12 pathだけをexact content allowlistへ追加し、自己言及1件は旧prefixを再掲しない表現へ修正した。包括除外やcoverage allowlistは追加していない。
- patch coverageの未計測分岐は、unreadable audit shard、unreadable Unit dependency、malformed stage metadata / Feedback、cycle、壊れた永続batchを本物のin-process approve経路で固定した。内部validatorをexportせず、新しいruntime挙動seamは追加していない。
- 独立pre-reviewで指摘されたstage-wide Unit集合、canonical read error、Windows / cross-worktree path、duplicate edge、永続batch全数検証と一意な完全window再利用、recovered Feedback、atomic failure時のbytes不変、最終test証跡の古さを修正し、全品質工程を最終コードで再実行した。

## RED → GREEN

- unit REDで正準2 seam不在を固定し、source/cache 8分類とrevision chronologyを実装後に8/8 GREEN化した。
- integration REDでstale cache、malformed canonical、5-block atomicity、state-write retryを固定した。
- coverage blind spot是正ではproduction handlerを直接駆動し、読取失敗によるrecovery抑止と専用validation errorを非空証拠で検証した。product APIは追加していない。
- Comprehensive test strategyは既存`bun:test`、`tests/run-tests.ts`、`package.json`の`test:ci` / `coverage:ci`、coverage registry / ratchet / allowlistをそのまま使用した。新規test configuration fileは追加していない。
- 最終focused回帰はt186、t199、t247 unit / integrationの4 filesで58/58 PASS、277 expects。t247 unit / integrationは40/40 PASS、184 expects。

## 最終検証

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint:check` | exit 0。既存warning 210件 / info 16件のみ。 |
| complexity gate | PASS。new violation 0、regression 0。 |
| `bun run dist:check` | PASS。package 6面 drift 0。 |
| `bun run promote:self:check` | PASS。self-install 4面 drift 0。 |
| final full CI | `tests/logs/2026-07-21T22-50-30Z`、399 files / 5667 assertions / failure 0、PASS。 |
| final coverage CI | 399 files / 5667 assertions / failure 0、`coverage/lcov.info`生成、PASS。 |
| project coverage gate | current 72.7416%、baseline 40.9395%、+31.8021pp、PASS。 |
| intent patch coverage gate | 1190 measured / 1190 covered / allowlisted 0 / uncovered 0、100%、PASS。 |
| U02 8-path evidence diff | base `b99ef748cd876a096ef1f1133cb26ecb1fd4ee53`、92071 bytes / SHA-256 `685bb8ee05f64714e27aea0cbd1ec796e19e6ec7e6cd9610fd4af3cee5fdb4ec`。 |
| Code Generation sensors | closeout authored TS 7件のlinter・type-check 14/14が`SENSOR_PASSED`。answer-evidenceはquestions成果物なしのため非該当。 |

AWS credential失効によりlive SDK/substrate由来テストはharness規定どおりskipされた。full CI / coverage CIとも`tests/integration/t-codex-hooks-migration.test.ts`の宣言medium・実測largeというadvisoryなwall-clock driftが1件あり、test resultはPASSである。

## Sensor fire IDs

| Closeout output | linter | type-check |
|---|---|---|
| `amadeus-lib.ts` | `c8db7cc0` | `e7fe2d10` |
| `amadeus-orchestrate.ts` | `2c7866b9` | `a6135202` |
| `amadeus-state.ts` | `806ba687` | `275907fd` |
| unit t186 | `6ac3fd78` | `126322ee` |
| integration t199 | `9221aaf0` | `cf8f5c98` |
| unit t247 | `edb745b5` | `15bc8c60` |
| integration t247 | `d9ac4a88` | `23d5b24a` |

## 証跡hash

| 対象 | SHA-256 |
|---|---|
| `amadeus-lib.ts` | `b69d18e4ab11babd256255b0dc7b5da18d1249b245772a5df4f6c8a05ad8e83e` |
| `amadeus-orchestrate.ts` | `d109ce696d82f0cd4b7458cdb01c2d18cc0cf55ea79ae6e1ca05e261aa7aacf7` |
| `amadeus-state.ts` | `4c6c40c864d275d12190c42c355bd58aaa971d0750fa0d4520f3ed53502c2497` |
| unit t247 | `f81ac62ac13672f11b9b476cfba020f0246c6acdb71d827b01fa70485ef04314` |
| integration t247 | `936a7ed1e5c2669ad4ece0ae0810a6551101433d46178ed9858d907ac396aa01` |
| coverage registry | `4164d42792b936565a4c2a00759902f55be500051dbabd9bb0b4f6f52e80e7e6` |
| coverage ratchet | `b0180e232963129720611608583fefe385e3bc02ac5d2d6a3ccd7dd82fb54d3a` |
| coverage allowlist | `c4cc13ba7d08ac92a5e08f818f6aeacd261f7b5005cbfd62adf2e6bb207690bb` |
| 8-path diff aggregate | `685bb8ee05f64714e27aea0cbd1ec796e19e6ec7e6cd9610fd4af3cee5fdb4ec` |
| `coverage/lcov.info` | `ef07a6e774163fdb31b27f96f9f0b537dfeba851c31541edf8a2afed9dee8b2e` |

## 独立レビュー

- e3最終再レビュー: `READY`、GoA `PASS`、Critical / Major / minor 0。永続batch全数検証と一意な完全window再利用を`CLOSED`判定した。
- e4最終再レビュー: `VERIFIED` / `READY`、GoA `PASS`、Critical / Major / minor 0。同findingを`CLOSED`判定し、新規findingなしとした。

## Review handoff

source、test、projection、full / coverage、patch gate、sensorをfreezeした。e3/e4が共通して指摘した「壊れたwindow後の正常batchをstate-write retryで再利用できない」Majorは、一意な連続5-block window検証と合成回帰で修正し、両者が`CLOSED` / `READY`と再確認した。U02にはdurable Formal I1が存在しないため、正規Formal I1を補完し、さらに別identity・新規invocationでFormal I2を実施する。追加scope候補として、coverage用validator exportと「公開2 seam」表現の整合整理を後続issue候補へ回し、本Unitではruntime面を変更しない。READY後に§13とengine report / nextへ進む。PR statusは`NOT_CREATED`、mergeは実行していない。
