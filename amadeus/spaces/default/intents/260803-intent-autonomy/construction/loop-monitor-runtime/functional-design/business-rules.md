# Business Rules — loop-monitor-runtime

## 上流入力と適用範囲

本規則は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`からU1 `loop-monitor-runtime`の不変条件を抽出する。#2095の汎用Loop Monitorだけを扱い、Quality Repair、autonomy grant、PR、runner / supervisorの規則を含めない。

## Manifest・compile規則

| ID | 規則 | 違反時 |
|---|---|---|
| LMR-C01 | `monitorId`はworkflow内で一意なstable IDでなければならない | `MALFORMED` / compile中止 |
| LMR-C02 | cycleは1件以上の既知workflow eventを持ち、重複してはならない | `UNKNOWN_EVENT`または`MALFORMED` |
| LMR-C03 | thresholdは有限の正整数でなければならない | `MALFORMED` |
| LMR-C04 | ignore eventは既知eventであり、cycle eventと交差してはならない | `CONFLICT` |
| LMR-C05 | routesは非空・一意で、各routeに`continue | latch` dispositionを持つ | `UNKNOWN_ROUTE` / `MALFORMED` |
| LMR-C06 | unknown field、unknown event、unknown route、duplicate contributionを黙って除去しない | compile全体をfail-closed |
| LMR-C07 | graph revisionはcanonical control contentから算出し、表示文やファイル順に依存しない | compile拒否 |
| LMR-C08 | M01は各prefix / event pairを`expected / reentry / natural-exit / ignore / invalid`へ全域分類したtransition tableを生成する | compile拒否 |
| LMR-C09 | evidence provider、Judge instruction、route ruleのID / digest / schema referenceは正規化済みcontribution内で解決可能でなければならない | compile全体をfail-closed |
| LMR-C10 | 各Monitorはexactly oneの`evidenceProviderId`と1つの`judgeInstructionId`を必須参照し、M01が同一contribution内で解決する | compile全体をfail-closed |

## Event identity・epoch規則

| ID | 規則 |
|---|---|
| LMR-E01 | Monitor eventはIntent UUID、Monitor ID、stage/Bolt instance、graph revision、delivery ID、event IDへ束縛する |
| LMR-E02 | 同一delivery IDは同一scopeで一度だけprojectionへ適用する |
| LMR-E03 | 別Intent、別graph revision、別stage instanceのhistoryを同じepochへ混入させない |
| LMR-E04 | audit行数、tool call、ファイル更新、表示文、編集回数は進捗eventでもreset根拠でもない |
| LMR-E05 | ignore eventはprefix、threshold、epoch、Judge状態を変えない |
| LMR-E06 | scratch checkpointは正本でなく、削除後もcanonical auditから同じprojectionを再構築できる |
| LMR-E07 | M06はparsed `EvidenceSnapshot`と`JudgeTraceContext`を`MonitorDelivery`へ含め、M02は外部lookupしない |
| LMR-E08 | dedupe keyはMonitor scope + upstream event identity、delivery IDはそのkey + payload fingerprintからcontent-addressedに決定し、直前deliveryをnullable predecessorで指す |
| LMR-E09 | causal chainはMonitor scopeに属し、epoch変更でresetせずchain headを引き継ぐ |
| LMR-E10 | 同じpredecessorへ異なるsuccessorが続くforkはclone順で直列化せず`CONFLICT`でparkする |
| LMR-E11 | predecessor未到着のdeliveryはfull immutable payloadごとbounded保留し、到着後にcausal orderで適用する |

## Cycle・threshold規則

| ID | 規則 |
|---|---|
| LMR-M01 | cycle末尾一致だけではJudgeを発火しない |
| LMR-M02 | 末尾一致後、同じcycle先頭への自然再進入を観測した時だけthreshold countを増やす |
| LMR-M03 | 末尾一致後にcompiled graph上のcycle外transitionへ進んだ場合は自然退出としてepochを閉じ、Judgeを発火しない |
| LMR-M04 | T-1ではJudge reservationを作らず、Tでexactly one reservationを作る |
| LMR-M05 | pending Judgeが存在する間は後続deliveryから新しいinvocationを作らない |
| LMR-M06 | overlap時は入力列の最長suffixであるcycle prefixを保持し、同一eventを二重計上しない |
| LMR-M07 | event deliveryの通常計算量は対象Monitor数とbounded prefix / recent delivery collectionに比例させる |

## Judge規則

| ID | 規則 |
|---|---|
| LMR-J01 | Judge request全体をcanonical auditへ予約・commitしてから外部adapterを呼ぶ |
| LMR-J02 | invocation IDはIntent、Monitor、epoch、trigger delivery、graph revision、evidence、constraintから決定する |
| LMR-J03 | allowed routesはmanifest routesの非空subsetでなければならない |
| LMR-J04 | resultのinvocation IDはpending reservationと一致し、selected routeはallowed routesに含まれなければならない |
| LMR-J05 | 同一invocationにcanonical completed resultがあれば外部呼出しを行わず再利用する |
| LMR-J06 | Amadeusはcanonical invocation / result / Eventのexactly-onceを保証し、providerの物理的exactly-onceは保証しない |
| LMR-J07 | crash後はprovider reconciliationが`no-effect-confirmed`の場合だけ同じIDで再dispatchできる |
| LMR-J08 | `effect-possible / unknown`では自動再dispatchせず、`AWAITING_HUMAN`へparkする |
| LMR-J09 | `judgeReplay=invoke-once`を広告するadapterは`completed`と`no-effect-confirmed`を真に識別できなければならない |
| LMR-J10 | M02はroute IDの品質意味論、autonomy mode、grant、WorkflowResultを判断しない |
| LMR-J11 | dispatchはJudge start commit receiptに束縛されたpermitなしに開始しない |
| LMR-J12 | `no-effect-confirmed`はprovider observation IDとattestationを必須とし、timeout / not-foundだけから推定しない |
| LMR-J13 | traceId / spanIdはreservation時に固定し、request、receipt、start / completed / latch eventで一致させる |

## Latch・resume規則

| ID | 規則 |
|---|---|
| LMR-R01 | latchはMonitor、epoch、evidence fingerprint、Judge invocation、selected route、resume conditionへ束縛する |
| LMR-R02 | 同一fingerprintの起動はJudge / LLM / repairを呼ばず同じparked resultを返す |
| LMR-R03 | latch解除候補はevidence fingerprint変化またはreal humanの明示retryに限定する |
| LMR-R04 | evidence changeはoldとnewが異なり、対象condition identityへ一致しなければならない |
| LMR-R05 | human retryはcanonical auditで検証できる`VerifiedHumanTurn`を要求する |
| LMR-R06 | `LOOP_LATCH_CLEARED`と`WORKFLOW_UNPARKED`は同一M07 transactionへ含める |
| LMR-R07 | transaction失敗時にlatchだけ、またはworkflow stateだけを変更しない |

## Audit・replay規則

- M07だけがcanonical eventをappendする。M01/M02/M06/M08は`AuditEventPlan`を返す。
- event identityの重複をtransaction commit前に拒否する。
- Judge start、dispatch/reconciliation、result observation、Judge completion、selected route、basis fingerprint、latch set/clearをreplay可能にする。
- 全shardをcanonical orderingし、同一event identityをexactly once reduceする。
- malformed、unknown、illegal stateのeventを成功としてskipしない。projectionを返せない場合はtyped diagnosticでfail-closedする。
- 同じtransaction IDの再送は同じcommit receiptまたはno-opを返す。
- M07はcanonical audit appendと同一transaction ID / WALで、full Monitor payloadとidentity lookupをper-clone耐久`MonitorReplayIndex` partitionへ書く。片方だけのcommitはvisibleにしない。
- M07は`monitor scope + upstreamEventIdentity`をdedupe keyとし、同一key / 同一payload fingerprintは畳み込み、同一key / 異payload fingerprintを拒否する。
- normal cold resumeは`readMonitorReplaySlice`でMonitor partitionだけを読み、audit noiseに比例させない。index repairの明示的maintenance scanは通常resumeに含めない。
- M02はchain head、bounded `PendingMonitorDeliveries`、T+1 historyだけを持つ。永続的な重複判定はM07 identity indexが所有する。
- missing predecessor、pending overflowは`INCOMPLETE`、causal forkは`CONFLICT`とし、payloadを捨てずreducer / Judgeへ適用しない。

## Plugin SPI規則

- 正規化済みcontributionはMonitor、evidence provider、Judge instruction、route ruleを別descriptorとして持ち、すべてplugin content digestへ束縛する。
- provider ID、instruction ID、rule IDはplugin / graph内で一意でなければならない。
- Monitorが参照するprovider / instruction / route ruleは同じcompile transactionで解決する。
- `MonitorManifest.evidenceProviderId`はexactly oneのdescriptorを指し、M06は解決済みprovider以外を選択できない。
- evidence snapshotはIntent / Monitor / stage / graph revision、provider schema version、redaction policy、summary digestへ束縛する。
- 外部Plugin authoring形式をCore SPIに露出しない。初期first-party adapterと将来adapterは同じ内部schemaへ写像する。

## Live authorization規則

| ID | 規則 |
|---|---|
| LMR-L01 | credential-attested adapterだけが`LiveAuthorizationPort`を実装できる |
| LMR-L02 | credential / token / secretそのものをauthorization、audit、receiptへ含めない |
| LMR-L03 | authorizationはIntent、harness、implementation revision、package digest、environment、issuer、trace、attestationへ束縛する |
| LMR-L04 | protected `LIVE_SMOKE_AUTHORIZED` eventのcommit receiptなしにlive invocationを開始しない |
| LMR-L05 | raw receiptはcommitted authorizationと全bindingがexact matchしなければならない |
| LMR-L06 | skip / failed / Judge未観測をpassやIntent completion evidenceへ変換しない |
| LMR-L07 | U1〜U4のlive receiptは暫定であり、U5が最終revisionで再収集する |

## Distribution drift規則

- canonical sourceは`packages/framework/core/`とsingle harness descriptor registryである。
- 7 package face、6 host directory、5 self-install faceのprojection集合とdigestを1つのreceiptへ記録する。
- graph compile check、`package.ts --check`、`promote:self:check`の全成功を要求する。
- receiptはimplementation revision、package / registry / projection digest、各check output digestへ束縛する。
- generated `dist/`またはpromoted root suffixの手編集をpassへ変換しない。

## Harness portability規則

- 現行contract対象はClaude Code、Codex、Cursor、OpenCode、Kimi Codeである。
- Monitor algorithm、cycle state、Judge reservation、latch reducerをharness directoryへ複製しない。
- native adapterはcapability facts、Judge invocation / reconciliation、live authorizationだけを提供する。
- 将来のharness追加はdescriptor row、adapter、共通contract fixture、opt-in live scenarioの追加で閉じ、M02 algorithm変更を要求しない。
- Kiro / Kiro IDEは既存package projectionを維持するが、今回のlive success集合へ数えない。

## Failure classification

| Failure | Classification | Workflow effect | Recovery |
|---|---|---|---|
| malformed manifest | input error | state変更なし | manifest修正後compile |
| unknown event / route | contract error | state変更なし | graph / manifest修正 |
| duplicate delivery | benign replay | no-op | 元receiptを返す |
| missing predecessor / pending overflow | incomplete causal history | parked / `INCOMPLETE` | index reconciliation / repair |
| causal fork | concurrent conflict | parked / `CONFLICT` | authoritative workflow historyで解消 |
| Monitor replay index欠落・破損 | derived index failure | parked / `INCOMPLETE` | explicit doctor / repair |
| audit append conflict | recoverable concurrency | state変更なし | current revisionを再読込 |
| provider completed | reconciled success | canonical resultを適用 | 再dispatchなし |
| provider no-effect | recoverable delivery | pending維持 | 同じIDで再dispatch |
| provider possible / unknown | uncertain external effect | parked / `AWAITING_HUMAN` | 人間または新evidence |
| undeclared Judge route | contract error | projection不変 | provider / constraint修正 |
| same latch fingerprint | expected stop | 同じparked result | evidence変化 / human retry |
| live credentialなし | external capability absence | U1 deterministic work継続 | 認可環境でopt-in実行 |

## 要件・AC追跡

| 規則群 | 要件 / AC |
|---|---|
| compile | FR-LMC-001〜002、006、2095-AC01、05、09 |
| cycle / threshold | FR-LMC-003〜005、2095-AC02〜04 |
| Judge / replay | FR-LMC-007〜009、2095-AC05〜06 |
| latch / resume | FR-LMC-010、FR-STP-005〜006、2095-AC07〜08 |
| Plugin seam boundary | FR-LMC-011〜012、2095-AC09〜10 |
| harness / live / future adapter | FR-HAR-001〜007、2095-AC11〜14 |
| determinism / reliability / performance | NFR-DET-001〜003、NFR-REL-001〜002、NFR-PERF-001〜003 |

## 非目標

- Quality evidenceの意味、repair / replan方針、reviewer / sensor分類。
- `none / semi / full`、Intent-scoped grant、常任グラントの認可意味論。
- PR convergence、GitHub status、外部runnerの起動・監視。
- providerの物理的exactly-onceをAmadeusが保証したと表示すること。
- 新stage、scope-grid行、stage runner、常駐serviceを追加すること。
