# pi-child-execution-driver — Business Rules

## Identity and admission rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-PCE-001 | `admitPiChildRequest`は非空identityを持つvalidated `PiChildRequest`だけを生成する。admission failureはidentityをechoせず`PiChildResult`を生成しない | `invalid-request` admission failure |
| BR-PCE-002 | roleは`support | reviewer | construction`だけ | `invalid-role` |
| BR-PCE-003 | idempotency keyは`pi-child-delivery/v1` + parentId/executionId/childIdのlength-prefixed canonical bytesからSHA-256で導出し、同一key + fingerprintはnative process高々1件 | in-progress refusalまたはterminal replay |
| BR-PCE-004 | fingerprintは`pi-child-request/v1` + identity/role/workspace digest/timeout/task digest/persona digestの固定列。同一key + 異なるfingerprintはspawn 0件 | `idempotency-conflict` |
| BR-PCE-005 | workspaceはparse時に実在directoryとして確定し、spawn cwd以外へ変換しない | `invalid-workspace` |
| BR-PCE-006 | timeoutは正の有限値。具体的default/capはNFR Designのnamed policyから供給 | `invalid-timeout` |
| BR-PCE-007 | reservationが`new` permitを返した場合だけ、driverは`PiRuntimeProbePort`からexecutable/version/platform/profileの同一snapshotを1件得る。terminal replay、pending recovery、quarantine短絡ではprobeせず、doctor stateや暗黙globalを読まない | typed environment failure |

## RPC and lifecycle rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PCE-010 | executable/argsはshellを介さず、argvは`pi --mode rpc --no-session`を基礎とする | FR-SUB-001、NFR-SEC-002 |
| BR-PCE-011 | stdoutはLF-only strict JSONL。U+2028/U+2029でsplitしない | Pi 0.83.0 public RPC framing |
| BR-PCE-012 | stderrをRPC frameとして解釈しない | failure transparency |
| BR-PCE-013 | process acceptance後、prompt前に`get_state`で非空sessionIdを得る | FR-SUB-002 |
| BR-PCE-014 | `prompt success=true`はaccepted factでありterminal successではない | Pi RPC command contract |
| BR-PCE-015 | `agent_end`はterminalにしない。`agent_settled`だけがnative success candidateを作る | Pi 0.83.0 settled contract |
| BR-PCE-016 | unknown correlation ID、duplicate response、invalid required frameはfail-closed | FR-SUB-004 |
| BR-PCE-017 | role差で別driver implementation、別result schema、別shutdown pathを作らない | FR-SUB-005 |
| BR-PCE-018 | doctor/driver共通`selectPiRpcProfile`はmacOS/LinuxのPi `>=0.83.0`を`pi-rpc/0.83+`へ写像し、doctor pass後のversionをdriverがversion理由で拒否しない | Pi 0.83 public contract、NFR-CMP-001 |
| BR-PCE-019 | get_stateは`data.sessionId`、prompt/abortはcorrelated success response、terminalはliteral`agent_settled`をexact parseする | FR-SUB-001/002 |
| BR-PCE-019a | responseはsuccess/failureを問わず既知の非空correlation ID必須。ID欠落は`rpc-response-invalid` | failure transparency |
| BR-PCE-019b | 公開outputは最後に完了したassistant `message_end`のtext block列。`text_delta`は検算専用でfinal textへ二重追加しない | FR-SUB-001 |
| BR-PCE-019c | assistant stream `error`は`agent-error`、literal `extension_error`は`extension-error`としてsettled前にfailureをlatchする | FR-SUB-004 |

## Terminal and cleanup rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PCE-020 | terminal arbiterはcauseを一度だけlatchし、結果は1件 | NFR-REL-002 |
| BR-PCE-021 | deadlineがsettledより先なら`timed-out`、AbortSignalが先なら`cancelled` | FR-SUB-004 |
| BR-PCE-022 | cancel/timeoutでは可能ならRPC `abort`を先行し、その後macOS/Linuxの負PGIDへSIGTERM→SIGKILL | services lifecycle |
| BR-PCE-023 | positive guardian handleを得た`contained-group`ではPGID=leader PID、leader reap、`kill(-pgid,0)=ESRCH`を必須とする。process 0件の`not-started`はreap not-applicableとし架空handleを作らない | FR-SUB-004 |
| BR-PCE-024 | settled後のdriver起因SIGTERMは正常cleanupだが、settled前のexit/signalはfailure | RPC client lifecycle |
| BR-PCE-025 | terminal audit commitが成功するまで呼出元へsuccessを返さない | FR-SUB-002、failure transparency |
| BR-PCE-026 | child semantic outputの正しさはdriverで推測せず、後段checkが判定 | core ownership boundary |
| BR-PCE-027 | RPC abort失敗後もprocess-group消滅を確認できれば元のcancel/timeoutを維持する。reap不能だけが`process-reap-failed`へoverrideする | terminal determinism |
| BR-PCE-028 | terminal receiptは内部committed stateだけに必須。public failure resultはcommit失敗時にreceiptなしで返せる | audit failure transparency |
| BR-PCE-029 | terminal factはcommit前にcore portへdurable `terminal-pending`として保存する。duplicate delivery/driver invocation preflightはpending factを再commitし、再spawnしない | FR-SUB-002、NFR-REL-003 |
| BR-PCE-029a | 結果決定順はsemantic first-cause → reap failure override → audit failure override。audit failure時の今回結果は常に`terminal-audit-failed` | NFR-REL-003 |
| BR-PCE-029b | driver invocation preflightはlease付き1 pageを一度だけclaimし、batch専用`reconcileClaimedPendingTerminal`で処理する。duplicateのpendingはfence内の非待機`reconcileCurrentPendingTerminal(wait:false)`で即時CASし、成功ならoriginal result、lease-busyならfence解放後`delivery-in-progress`、write failureならaudit failureを返す | FR-SUB-002 |
| BR-PCE-029c | 無関係pending failureはlifecycle auditまたはemergency diagnosticのackがあれば現在deliveryを継続する。両方失敗なら`reconciliation-visibility-failed`でspawn禁止 | failure transparency |
| BR-PCE-029d | pendingは単調増加ticketの昇順でclaimし、failure時に新しい最大ticketへatomic更新する。1 invocation 1 pageとしcursor paginationしない | starvation prevention |
| BR-PCE-029e | lifecycle write不能recordはcurrent key操作と共通のcross-process per-key `QuarantineFence`内でmachine-local poison quarantineへdurable隔離し、claim excludeへ入れる。clearも同じfenceを必須とし、doctor可視化と明示clearなしに再claimしない | starvation prevention、failure transparency |
| BR-PCE-029f | stale execution scanはpending claim/reserveより先に全nonterminal active stateを対象として実行し、named policyの閾値/上限を使う。scan不能なら新規spawn禁止 | unknown-effect containment |
| BR-PCE-029g | early/late failureを問わず全active stateはdurable `settling`→`terminal-pending`→`terminal`の順で進み、直接terminalへ遷移しない | FR-SUB-002 |
| BR-PCE-029h | pre-settling stale recoveryはstate version CASに加え、`reserved`では同じversionにlaunch intentがない`ReservedNoLaunchEvidence`、positive handleではextinction evidence、handleなし`process-starting`ではnonce-bound `PiNotStartedEvidence`を必須とする。`stale-execution-recovered`以外のcandidateや任意restartは禁止 | unknown-effect containment |
| BR-PCE-029i | Pi起動はdurable launch intent→guardian manifest→process acceptance commit→GOの順。GO前のdriver/pipe failureではguardianがPiを起動せず終了する | native process at-most-once |
| BR-PCE-029j | quarantine indexを読めない場合は`quarantine-index-read-failed` + visibility-failedとし、claim/reserve/runtime/spawnを禁止する | failure transparency |
| BR-PCE-029k | 導出済みcurrent key digestのsnapshot照合後、batch完了時にper-key `QuarantineFence`を取得してstateを再読し、同じfenceを保持したままreserveと必要な非待機同期CASを実行する。fence内ではlock/lease待機・sleep・retryを禁止し、lease-busyは即時`delivery-in-progress`へ写像して解放する。poison追加/clearも同じfenceで直列化する。quarantineが先に線形化された場合は`reconciliation-quarantined`を返してclaim/reserve/同期reconcile/runtime/spawnを禁止し、明示clearだけが再試行を許可する | quarantine non-bypass、deadlock prevention、failure transparency |

## Security and redaction rules

- BR-PCE-030: task本文、persona本文、provider token、API key、process environment、home絶対pathをauditへ出さない。
- BR-PCE-031: auditに許可するのはidentity、role、request/output digest、Pi version、sessionId、native handle、timestamp、terminal kind、closed error code、redacted detailだけである。
- BR-PCE-032: task/personaをargvへ置かずstdinのRPC promptで渡す。process listingにpromptを露出させない。
- BR-PCE-033: stderr/outputをdetailへ転記する前にsecret/path redactorへ通し、bounded tailだけを保持する。
- BR-PCE-034: provider/authの取得・更新・保存はPiへ委譲し、driver独自credential storeを作らない。
- BR-PCE-035: `--approve`でproject trustを迂回しない。trust不足はdoctor/remediationへ返す。
- BR-PCE-036: full result replay payloadはaudit/diagnosticと分離し、machine-local 0700 directory、0600 file、AES-256-GCM、atomic rename、path containmentで保護する。keyは同directoryの0600 versioned key fileで、Git/package対象外とする。
- BR-PCE-037: durable result/replayはCSPRNG opaque acknowledgment handleを返し、parentは公開ack APIへそのまま渡す。ackはhandle hashとterminal receiptを照合する。active intent中はpayloadを保持し、archive lockで新delivery禁止かつterminal metadata compact済みの場合だけ削除する。

## Error code policy

closed error codeは次のclassへ限定する。

| Class | Codes | Retry ownership |
|---|---|---|
| Request admission | `invalid-request`, `invalid-role`, `invalid-workspace`, `invalid-timeout` | retry不可。呼出側修正。PiChildResult外 |
| Reservation | `delivery-in-progress`, `lifecycle-reserve-failed`, `idempotency-conflict` | in-progressは同attempt待機。port failure/conflictはcoreが判断 |
| Environment | `pi-not-found`, `pi-probe-failed`, `unsupported-pi-version`, `unsupported-platform` | process 0件。環境修正後に呼出側判断 |
| Spawn/lifecycle | `spawn-failed`, `launch-intent-audit-failed`, `guardian-protocol-failed`, `process-accept-audit-failed`, `session-identity-audit-failed`, `pending-terminal-read-failed`, `stale-execution-scan-failed`, `stale-execution-recovered`, `quarantine-index-read-failed` | effect/監査stateをreconcile後にcore/operatorが判断 |
| RPC | `rpc-handshake-failed`, `rpc-framing-invalid`, `rpc-response-invalid`, `prompt-rejected` | driverは自動retryしない |
| Native | `agent-error`, `extension-error`, `process-exited-before-settled`, `output-capacity-exceeded` | core convergence policyが判断 |
| Cleanup | `process-reap-failed` | unknown/residual effectとしてfail-closed。RPC abort失敗だけならcleanup escalation fact |
| Audit | `terminal-audit-failed` | success禁止。coreのdurable pending-terminal reconcilerが回復 |
| Reconciliation | `reconciliation-quarantined`, `reconciliation-visibility-failed` | quarantine中のcurrent keyは明示clearまで全再処理を禁止。failureを可視化できない場合も新規spawn禁止。公開batch outcomeで呼出元へ返す |
| Replay | `replay-payload-unavailable` | original resultを復元不能。spawn/代替result禁止、doctor remediation |

driver自身はretry回数やbackoffを持たない。effect、native acceptance、terminal resultをcoreへ返し、retry admissionは既存execution lifecycle / swarm refereeが決める。

Request classのうち`invalid-request`、`invalid-role`、`invalid-workspace`、`invalid-timeout`は`PiChildAdmissionFailure`のcodeであり、validated request後の`PiChildResult.failed`には現れない。`idempotency-conflict`だけは有効identityを持つreservation failureとして`PiChildResult.failed`になり得る。

`PiReconciliationFailureCode`は`terminal-audit-failed | pending-terminal-read-failed | stale-execution-detected | reconciliation-quarantined`だけであり、公開batchの`failures.code`に任意stringを許さない。`stale-recovery-failed`、`replay-ack-failed`、`replay-purge-failed`はoperator/maintenance result専用で`PiChildFailureCode`へ含めない。

## Verification rules

- Happy path: 3 rolesすべてで同じspawn/handshake/prompt/settled/cleanup sequenceとtyped successを確認する。
- Error path 1: handshake前exitでsessionId=null、terminal failure、orphan 0件を確認する。
- Error path 2: prompt accepted後のtimeout/cancelでRPC abort→kill/reap、success 0件を確認する。
- Race property: cancel/deadline/failure/settledの全順序でterminal resultがちょうど1件になる。
- Framing property: arbitrary UTF-8 chunking、CRLF、U+2028/U+2029を含むJSONでrecord集合が保持される。
- Output property: `text_delta`と同内容の`message_end`を受けてもoutputは1回だけであり、最後のassistant messageのtext block順を保持する。
- Idempotency property: duplicate request deliveryでspawn countとterminal mutationが高々1回になる。
- Audit recovery property: terminal commitを失敗させてもpending recordが残り、restart/duplicate deliveryから同じdigestをrecommitしてspawn 0件でterminalへ収束する。
- Version property: 0.82.x/invalid/native Windowsはdoctor/driver両方unsupported、macOS/Linuxの任意`>=0.83.0`は両方同じ`pi-rpc/0.83+`を選び、additive unknown eventではresultを変えない。
- Admission property: identityを含む任意raw inputに対し、validated requestまたはidentityなしadmission failureのどちらか一方だけを返し、捏造identityとnative processは0件である。
- Reconciliation property: finite backlogでfailure recordがpage上限件数以上あってもticket rotationにより各recordが有限invocation内にclaimされ、lifecycle/fallback双方の失敗はspawn禁止の公開outcomeになる。
- Poison property: lifecycle write-failed recordをquarantineした後、非quarantine backlogは有限invocation内にclaimされ、quarantine clear後は元recordが再対象になる。
- Quarantine non-bypass property: current key digestがquarantine中の任意reservation state（`terminal-pending`を含む）で、claim/reserve/同期reconcile/runtime/spawnは各0件、公開結果は`reconciliation-quarantined`だけとなり、明示clear後にだけ通常経路へ戻る。
- Quarantine race property: snapshot読取、batch quarantine追加、fence取得、reserve、terminal-pending同期reconcileの全競合順序で、poison追加がfence内で先に線形化されたtraceは必ず`reconciliation-quarantined`かつreserve/reconcile/runtime/spawn各0件、reserve/reconcileが先のtraceは同じfence内で一度だけ完了し、隔離迂回と二重処理がない。
- Lease/fence deadlock property: batch lease所有者とcurrent deliveryを全競合順序で実行し、fence内同期CASはlease-busyをbounded immediate resultとして返す。core lockをfence待機へ持ち越さず、待機グラフにlease→fence→lease cycleがなく、両invocationが有限stepでfenceを解放または取得する。
- Replay property: commit failure→process restart→reconcile成功後もbyte-identical `PiChildResult`を復号し、parent ack前後でpayload保持/削除が切り替わる。
- Ack property: durable result/replayは同じopaque handleを返し、valid handleはacknowledged/already-acknowledged、random/改ざんhandleはpayload/state不変のclosed failureになる。
- Stale recovery property: candidate digestなしの全pre-settling stateで、`reserved`は同一state/versionかつlaunch intent不存在、handleなし`process-starting`はnonce-bound not-started、positive handleはextinctionの各証拠がない限りstate不変であり、対応するvalid evidence付きCASだけがfailure terminalへ一度だけ収束する。
- Guarded launch property: driver crashをlaunch intent/guardian manifest/acceptance/GOの各境界へ注入し、Piが起動するtraceでは必ずdurable PGIDが先行し、handleなしtraceではPi spawn count=0となる。
- Process disposition property: runtime/launch failureは`not-started`、positive guardian handleは`contained-group`となり、後者だけがreap/extinction proofを要求する。
- Security regression: fixtureにtoken、prompt、home pathを混ぜてもaudit/detailに平文0件である。
- Pool contract: driver 4 instanceを既存pool=1/2/4から起動し、driver側にqueue/width判断がないことを確認する。

## 上流トレーサビリティ

`unit-of-work`のconstraints、`unit-of-work-story-map`のSCN-005/006とFR/NFR owner、`requirements`のsubagent・failure・security規則、`components`のcore/driver境界、`component-methods`の公開result union、`services`のshort-lived processとkill/reap契約をruleへ変換した。
