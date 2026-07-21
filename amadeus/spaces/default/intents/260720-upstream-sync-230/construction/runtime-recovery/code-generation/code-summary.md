# Code Generation Summary: runtime-recovery

## 結論

runtime graph の Bolt DAG cache を canonical dependency artifact からread-sideで回復し、gate revision証拠の欠落を既存approve transaction内で補完する実装を完了した。DAGのconsumerは単一recovery resultを共有し、gate revisionは5 blockを1 transactionとしてatomic commitする。新event、schema、store、service、runtime dependency、threshold、semantic allowlistは追加していない。

## 実装内容

| 要求 | 実装結果 |
|---|---|
| canonical DAG recovery | `recoverBoltDag`がcanonical artifactを正本とし、cacheのmissing / empty / malformed / staleをread-sideで回復する。canonical不存在だけはsingle iterationへ降格し、unreadable / malformed / cycleはloud failureにする。runtime graphは書き換えない。 |
| consumer convergence | `amadeus-orchestrate.ts`のper-unit selection、coverage、swarmが同じ回復済みbatchを使用する。回復時のdiagnosticは1回だけ出力する。 |
| gate revision evidence | `recoverGateRevision`がTimestamp、同Timestamp内buffer position、organic gateまたはstage-start fallback、最初のhuman pivot、declared produceをclosed predicateとして判定する。reject、autonomous、無効証拠は回復しない。 |
| atomic approval | `amadeus-state.ts`が`GATE_REJECTED → STAGE_REVISING → STAGE_AWAITING_APPROVAL → GATE_APPROVED → STAGE_COMPLETED`を同一transaction idで事前生成・検証してatomic appendする。最初の3 blockだけをrecoveredとして記録し、stateは最終形だけを書き込む。 |
| retry convergence | audit transaction済みでstate未反映のretryは既存5 blockを再利用し、audit追加0、Revision Count 1、最終stateへ収束する。 |

### Authored source and tests

- `packages/framework/core/tools/amadeus-lib.ts`: pure seam `recoverBoltDag`、`recoverGateRevision`と判別可能result型。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: canonical artifact read、single recovery result、diagnostic、loud failure。
- `packages/framework/core/tools/amadeus-state.ts`: evidence取得、5-block transaction、atomic audit commit、state retry。
- `tests/unit/t247-runtime-recovery.test.ts`: DAG matrix、chronology、predicate negative matrix。
- `tests/integration/t247-runtime-recovery.test.ts`: subprocessとin-process production path、cache heal、canonical failure、atomicity、audit/state failure、retry、scope failure、workflow finalization。
- 既存DAG fixture 4件、audit drift meta-test、coverage registry / ratchetを新しい正本境界へ同期した。

package 6面とself-install 4面は`bun run dist`と`bun run promote:self`だけで再生成し、手編集していない。

## RED → GREEN

- unit REDで正準2 seam不在を固定し、source/cache 8分類とrevision chronologyを実装後に8/8 GREEN化した。
- integration REDでstale cache、malformed canonical、5-block atomicity、state-write retryを固定した。
- coverage blind spot是正ではproduction handlerを直接駆動するin-processケースを追加し、private wiring、failure、retry、final-stage分岐までLCOVへ載せた。product APIは追加していない。
- 最終t247 + audit drift回帰は40/40 PASS、102 expects。関連9 filesは119/119 PASS、1298 expects。

## 最終検証

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint:check` | exit 0。既存warning 210件 / info 16件のみ。 |
| complexity gate | PASS。new violation 0、regression 0。 |
| `bun run dist:check` | PASS。package 6面 drift 0。 |
| `bun run promote:self:check` | PASS。self-install 4面 drift 0。 |
| coverage registry | freshness PASS。function 120/256、total 265/485へ正規更新。 |
| final full CI | `tests/logs/2026-07-21T18-30-58Z`、399 files / 5645 assertions / 1 fail。runtime-recovery failure 0。 |
| final local coverage | `tests/logs/2026-07-21T18-37-20Z`、399 files / 5645 assertions / 1 fail。runtime-recovery failure 0。 |
| project coverage gate | current 72.4260%、baseline 40.9395%、+31.4865pp、PASS。 |
| exact runtime patch gate | diff 32139 bytes / SHA-256 `f6d8604c096b9d0696178cc11f327229e707cdc437bb912849033645d0b1e829`、336 measured / 336 covered / allowlisted 0 / uncovered 0、PASS。 |
| Code Generation sensors | authored source 3件とt247 unit/integrationのlinter・type-checkを各5件、計10/10 `SENSOR_PASSED`。answer-evidenceは`*-questions.md`出力専用で本stageのTS出力には非該当。 |

full CIとcoverageの唯一の赤はrecorded M16 `t199-generated-prefix-contract`である。本Unitでは対象12 path、allowlist、self-exclusion、recordを変更していない。

## Sensor fire IDs

| Output | linter | type-check |
|---|---|---|
| `amadeus-lib.ts` | `52ce63c5` | `a565ed78` |
| `amadeus-orchestrate.ts` | `3c1b32f1` | `0a14efb7` |
| `amadeus-state.ts` | `8af1761a` | `ed90d378` |
| unit t247 | `a06b0b1a` | `3dd64403` |
| integration t247 | `d7978e66` | `f78a8db9` |

## 証跡hash

| 対象 | SHA-256 |
|---|---|
| `amadeus-lib.ts` | `0b9ee4d7bf972ced297d10d60e881f65c3806fab61a9f010d38cf110c1d422d0` |
| `amadeus-orchestrate.ts` | `0aa33fd0c02fecbb12a334fc94a65b17fb451a5510753de0fdd253acd1cda9e0` |
| `amadeus-state.ts` | `339c93f14605a5b66a07f442768637404ff16d989eaffb7a98ee955da75645ce` |
| unit t247 | `57ebadf1be3f6619d8e6de2040daf483e41ad3df50196c86dfce7b782ad8ecdb` |
| integration t247 | `99a36204c0a6b11cbbe9250a3d0451135da86d688e6f72fe772e1aa842a50de3` |
| coverage registry | `4164d42792b936565a4c2a00759902f55be500051dbabd9bb0b4f6f52e80e7e6` |
| coverage ratchet | `b0180e232963129720611608583fefe385e3bc02ac5d2d6a3ccd7dd82fb54d3a` |
| coverage allowlist | `c4cc13ba7d08ac92a5e08f818f6aeacd261f7b5005cbfd62adf2e6bb207690bb` |
| 8-path aggregate | `e06c2351a622c15669f96cfbcb884af8ec67ce39c65efe9ab91c9fd4cce8833a` |
| full CI summary / failures | `26d223d7c87bc70abe2cca97ff7a1008b8df924cc37fa03917fae97e613cbe40` / `7ee4c8f81e8e9180203c487f3b0e0fee1bd027ed67822a2755b7edf79a8798a1` |
| coverage summary / failures | `ea094da9b4d0116f728458e678ccecdd553a84a4a1c2185d68d85dfaab552ac6` / `a4ec56013f0c70af4f5b94666efa6bbace31820821f80043e370d59930f70668` |
| `coverage/lcov.info` | `7d0db06fbe887d82be070657a1c6fe1531edb06f58e4ca99ccec1120e3445fa7` |

## Review handoff

source、test、projection、full / coverage、patch gate、sensorをfreezeした。独立先行reviewと別identity Formal reviewを次に実施する。READY後に§13とengine report / nextへ進む。PR statusは`NOT_CREATED`、mergeは実行していない。
