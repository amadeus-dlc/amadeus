# pi-child-execution-driver — Domain Entities

## Modelling policy

本Unitは永続databaseや長寿命aggregateを持たない。class-freeなTypeScriptのdiscriminated unionとcompanion parser/reducerで、request、RPC frame、lifecycle、terminal resultを表す。primitive wrapperはidentity取り違えやvalidation proofが正しさを変えるものだけに限定し、表示目的の微小型は作らない。

Pi native RPC modelはexternal published languageとしてanti-corruption layer内に閉じる。Amadeus coreへ公開するのは`PiChildRequest`、`PiChildResult`、acceptance/terminal factだけであり、Piのmessage/event内部型を漏らさない。

## Identity value objects

| Value | Source | Invariant | Auditability |
|---|---|---|---|
| `ExecutionId` | core execution lifecycle | 非空、spawn前確定、attempt全体で不変 | raw許可 |
| `ParentId` | parent operation | 非空、child chainで不変 | raw許可 |
| `ChildId` | core reservation | 非空、execution内で一意 | raw許可 |
| `RpcRequestId` | driver | command correlation内で一意、response後再利用禁止 | rawはdebug限定 |
| `PiSessionId` | `get_state` response | 非空、handshake後だけ存在 | raw許可 |
| `RequestFingerprint` | canonical request metadata | task/personaの生値を含まずdigestで表現 | digestのみ |
| `DeliveryIdempotencyKey` | parent/execution/child identity | `pi-child-delivery/v1` canonical bytesのSHA-256 | digestのみ |
| `PosixProcessGroup` | process port | macOS/LinuxでleaderPid=pgid、両方正 | raw許可 |

`ExecutionId`、`ParentId`、`ChildId`、`PiSessionId`は同じstringでも意味が異なり、smart constructorを通したbranded valueとして扱う。`timeoutMs`はNFR policyでvalidated numberを供給し、独立wrapperは作らない。

## Child request

raw境界は`unknown`を受ける`admitPiChildRequest`であり、`PiChildRequestAdmission`を返す。

```ts
type PiChildRequestAdmission =
  | { kind: "accepted"; request: PiChildRequest }
  | { kind: "admission-failed"; code: "invalid-request" | "invalid-role" | "invalid-workspace" | "invalid-timeout"; field: string; detail: string };
```

admission failureはraw value、executionId、childId、parentIdを保持・echoしない。公開`executePiChild(input: unknown, signal, ports)`は`PiChildAdmissionFailure | durable-result | non-acknowledgeable-failure`を返す。`durable-result`だけが`PiChildAcknowledgmentHandle`を持ち、内部`spawnReservedPiChild`だけがvalidated requestを受ける。

`PiChildRequest`は次のimmutable recordである。

| Field | Type / constraint | Ownership |
|---|---|---|
| `executionId` | `ExecutionId` | core |
| `childId` | `ChildId` | core |
| `parentId` | `ParentId` | core |
| `role` | `support | reviewer | construction` | orchestrator |
| `workspace` | validated absolute directory | orchestrator / worktree manager |
| `task` | non-empty bounded text | stage/swarm conductor |
| `persona` | non-empty bounded text | agent catalog |
| `timeoutMs` | positive finite policy value | NFR policy |

parserはall-or-nothingで、成功時に非空branded identityを持つ`PiChildRequest`を返す。raw requestをspawn pathへ渡さない。task/personaはprompt builderだけが読め、audit projectionはdigestにしか到達できない。

公開requestへidempotency fieldは追加しない。`DeliveryIdempotencyKey`は`parentId`、`executionId`、`childId`から導出し、異なるlogical attemptはcoreが新しいexecutionId/childIdを供給する。`RequestFingerprint`はidentity、role、workspace realpath digest、timeout、task/persona digestを`pi-child-request/v1` schemaで固定し、key replay時のpayload差分を検出する。

## Lifecycle state

`PiChildLifecycle`は次のclosed unionで、各transitionはcompanion reducerだけが生成する。

| State | Required facts | Allowed next |
|---|---|---|
| `reserved` | identity、fingerprint、permit | `process-starting`, `settling` |
| `process-starting` | validated runtime/cwd、durable launch nonce/manifest ref/deadline | `process-accepted`, `settling` |
| `process-accepted` | native handle、acceptedAt、sessionId=null | `rpc-ready`, `settling` |
| `rpc-ready` | native handle、PiSessionId、handshakeAt | `prompt-pending`, `settling` |
| `prompt-pending` | RpcRequestId、prompt digest | `running`, `settling` |
| `running` | prompt acceptedAt、event ordinal | `settling` |
| `settling` | latched terminal cause、canonical candidate digest、private replay payload ref/digest | `terminal-pending` |
| `terminal-pending` | durable terminal fact、fact digest、request fingerprint | `terminal` |
| `terminal` | exactly one committed result、process disposition proof、audit receipt | none |

sessionId=nullは`process-accepted`以前とhandshake前resultだけで表現可能にする。`rpc-ready`以降のresultでnullを許さない。全active stateは`enterSettling`でdurable candidate/payloadを確定してから`prepareTerminal`へ進む。`terminal-pending`は`prepareTerminal`成功後だけ生成し、commit失敗でも保持する。`terminal` stateはaudit commit成功後だけ生成する。terminalから別stateへのtransitionと異なるdigestによる2件目のterminal commitは型・reducer双方で拒否する。

## RPC protocol entities

| Entity | Meaning | Parser policy |
|---|---|---|
| `RpcCommandEnvelope` | correlation ID付き`get_state` / `prompt` / `abort` | driverが生成、LFを1件だけ付与 |
| `RpcSuccessResponse` | command acceptance/state response | ID、command、success、data shapeを照合 |
| `RpcFailureResponse` | command rejection | closed sanitized failureへ変換 |
| `PiAgentEvent` | `agent_start/end/settled`、message/tool/queue/retry/compaction events | version付きallowlist |
| `PiAssistantMessageFrame` | assistant `message_start/update/end`とtext delta/final/error | literal discriminatorとcontent pathを検証 |
| `UnknownRpcFrame` | parse可能だが未対応のtype/shape | terminal関連ならblocked、明示advisoryだけignore |
| `JsonlDecoderState` | UTF-8 decoder、未完buffer、byte count | streamごとに1件、end時未完recordを検査 |

wire version fieldは存在しない。`PiRpcProfile`はout-of-bandの`pi-rpc/0.83+`で、doctor/driver共通`selectPiRpcProfile`とversion-tagged captured fixturesへ束縛する。selectorはmacOS/Linuxのsemver `>=0.83.0`を同じprofileへ写像する。essential schemaは`get_state → response.data.sessionId`、`prompt → correlated success response`、`abort → correlated success/failure response`、assistant message lifecycle、`extension_error`、`agent_end(messages, willRetry)`、`agent_settled`である。

`PiAssistantMessageFrame`は`message_update.assistantMessageEvent.type=text_delta`の`contentIndex`/`delta`、`text_end`の`content`、`error`の`reason`/`error.errorMessage`、`message_end.message.content[*]`の`{type:"text", text}`をtyped subsetとして持つ。final outputは最後のassistant `message_end`から構成し、deltaは一致検証にだけ使用する。`extension_error`は`extensionPath`、`event`、`error`がすべてstringの独立failure eventである。

`agent_end`と`agent_settled`は別variantであり、前者を後者へcoerceしない。`RpcSuccessResponse(prompt)`と`PiAgentEvent(agent_settled)`も別aggregate factで、受付を完了として扱えないようにする。IDなしの`RpcFailureResponse`はunionへ入れず`UnknownRpcFrame`から`rpc-response-invalid`へ変換する。

## Process observation

`PiProcessDisposition`はprocess未生成traceとpositive handle traceを混同しないclosed unionである。

- `not-started`: native handleなし、reason（runtime probe / launch intent / guardian spawn failure）、observedAt。leader/group reapは`not-applicable`。
- `contained-group`: guardian leader PID / POSIX PGID、Pi start state（`not-authorized | started`）、spawnedAt、exit observation、leader reap、group extinction。

`contained-group`の`PiProcessObservation`は次を持つimmutable fact集合である。

- leader PID / POSIX PGID（macOS/Linuxでは同値）
- spawnedAt、acceptedAt、exitObservedAt
- exit kind: `code | signal | spawn-error | not-observed`
- termination request: `none | abort-rpc | sigterm | sigkill`
- leader reap statusとgroup extinction status: `confirmed | residual-possible | unknown`
- bounded/redacted stderr digestとtail metadata

raw stderr、environment、promptはentityへ保持しない。guardian spawnは`detached: true`で専用groupを作り、signalは負PGIDへ送る。正常settle後のdriver起因SIGTERMは`exit kind=signal`でもcleanup policyと組み合わせてsuccess candidateになれる。positive handleを得た`contained-group`だけがleader reapと`kill(-pgid,0)=ESRCH`を必須とし、`not-started`へ架空PID/PGIDを作らない。

## Terminal cause and result

`TerminalCause`は`settled | cancelled | deadline | protocol-failure | process-failure | lifecycle-failure`のsemantic closed unionで、`observedOrdinal`とtimestampを持つ。arbiterは最初のcauseを保存し、後続causeをdiagnostic observationとしてのみ保持する。terminal audit failureはこのunionへ入れず、cleanup後のaudit overrideだけで扱う。

`PiChildResult`は次のclosed unionである。

| Kind | Required fields | Meaning |
|---|---|---|
| `succeeded` | executionId、childId、PiSessionId、bounded output | native attempt settled、group extinct、terminal audit committed |
| `failed` | executionId、childId、sessionId nullable、closed code、redacted detail | transport/native/audit/cleanup failure。audit commit failureではreceiptなし |
| `timed-out` | executionId、childId、sessionId nullable、timeoutMs | deadline won、group extinct、terminal audit committed |
| `cancelled` | executionId、childId、sessionId nullable、redacted reason | AbortSignal won、group extinct、terminal audit committed |

公開resultにrole、parentId、native handle、terminal receiptを重複保持しない。内部`CommittedPiChildTerminal`だけが`{result, terminalReceipt}`を持つ。commit失敗時は`UncommittedPiChildFailure`が`failed(terminal-audit-failed)`とterminal fact digestをcore recovery seamへ返し、存在しないreceiptを捏造しない。

`PendingTerminalRecord`はcore-owned durable metadataで、`{idempotencyKey, requestFingerprint, terminalFact, terminalFactDigest, replayPayloadRef, replayPayloadDigest, acknowledgmentTokenHash, acknowledgedAt: timestamp | null, preparedAt, reconcileTicket, lastReconcileAttemptAt: timestamp | null, reconciliationFailureCount, lastReconciliationCode: string | null, leaseId: string | null, leaseUntil: timestamp | null}`を持つ。prepare時はCSPRNG acknowledgment tokenを生成してhashだけをmetadataへ、plain opaque handleを暗号化payloadへ格納する。canonical terminal factはredacted result、session identity、process observation、output digestだけを含む。

`PrivateReplayPayload`はversion、idempotency key、terminal fact digest、result digest、full bounded `PiChildResult`、plain acknowledgment handleを含む。`amadeus/.amadeus-sessions/pi-child-replay/`の0700 directory内へAES-256-GCMで暗号化し、0600 temporary fileからatomic renameする。nonce/tag/versionをenvelopeに持ち、keyは同machine-local directoryの0600 key fileから読む。symlinkを拒否しrealpath containmentを確認する。payload/ref/key/ack handleをaudit、diagnostic、Git、package projectionへ含めない。

`enterSettling`は暗号化fileのfsync/atomic renameを先に行い、次にsettling metadataのref/digestをatomic commitする。metadata commit前のcrashで残るunreferenced payloadはstartup orphan sweepがgrace後に削除するが、metadataから参照されるpayloadは削除しない。

`PiChildAcknowledgmentHandle`はversion prefix + 256-bit CSPRNG tokenのopaque branded stringで、key/result digest/receiptを露出しない。公開`acknowledgePiChildResult(handle, ports)`はhandle hashからrecordを一意に引き、terminal receiptと未削除payloadを検証してacknowledged markerだけを付ける。同じhandleはidempotentに`already-acknowledged`を返す。active intent中はduplicate replayのためpayloadを保持する。intent archive lock後のpurgeだけがacknowledged payloadを削除できる。

ack/purgeもthrowせず、`replay-ack-failed` / `replay-purge-failed`のoperational `LifecycleResult`を返す。ackはopaque handleだけを入力にしてhash/receiptを内部照合する。これらは既に返却済みの`PiChildResult` kindを変更せず、payloadを保持してdoctor remediationへ渡すため、`PiChildFailureCode`には混入させない。

`PiReconciliationBatchOutcome`は次のclosed unionで、公開`executePiChild` responseから呼出元へ届く。

- `completed`: batchId、attempted/committed count、failureごとのkey digest、closed code、`visibility: lifecycle-audit | emergency-diagnostic`。
- `visibility-failed`: nullable batchId、`reconciliation-visibility-failed`、redacted detail。新規spawnを許可しない。

`PendingTerminalBatch`は`{batchId, leaseUntil, records}`のimmutable snapshotである。claimはlease切れrecordから最小`reconcileTicket`順に最大limit件をatomic選択し、1 invocationで1 batchだけ返す。failureをlifecycleへ記録できた場合はattempt metadataを更新し、fresh maximum ticketを割り当ててleaseを解放する。successはrecordをterminalへ移す。同一batchをcursorで再走査しない。

`PoisonReconciliationRecord`は`{keyDigest, terminalFactDigest, firstObservedAt, lastObservedAt, closedCode}`だけをmachine-local quarantineへdurable保存する。raw key/result/promptを含めない。preflight snapshotはquarantine key digestをclaim excludeへ渡すが、current keyの安全判定はbatch後のfence内再読を正本とする。一致時は`reconciliation-quarantined`で短絡し、`terminal-pending`の同期reconcileを含む全処理を禁止する。doctorは件数とremediationを表示し、lifecycle修復後の明示clearだけが再claim・reserve・同期reconcileを許す。

`QuarantineFence`はkey digest、CSPRNG owner token、取得timestampを持つmachine-local cross-process exclusive tokenである。既存coreのmkdir-based lock primitiveと同じowner検証・stale owner recoveryを再利用し、raw idempotency keyをlock pathへ含めない。`acquireQuarantineFence(keyDigest)`成功からreleaseまで、同じdigestの`quarantinePoison`、`clearQuarantine`、current-key `reserve`、`terminal-pending`同期reconcileを直列化する。driverはbatch後にfence内でquarantine stateを再読し、不存在の場合だけfenceを保持したままreserveと非待機同期CASを実行する。fence内では別lock/leaseの取得待ち、sleep、retry、unbounded I/Oを禁止する。取得・owner検証・再読・releaseの失敗は`reconciliation-visibility-failed`としてspawnを禁止し、tokenなしのpoison追加/clearをport実装が拒否する。

pending terminal reconcileは待機関係を型で分離する。`reconcileClaimedPendingTerminal(record, leaseId)`はbatch lease所有者専用であり、claimを返す前にcore lockを解放する。`reconcileCurrentPendingTerminal(key, digest, {wait:false})`は`committed | lease-busy | digest-conflict | failed`のclosed immediate resultを返し、leaseを取得・待機・解放しない。current pathは`lease-busy`でfenceを直ちに解放して`failed(delivery-in-progress)`を返す。driverはこの結果を内部retryせず、batch側もlifecycle/core lockを保持したままfenceを待たない。

`GuardedLaunchIntent`は`{idempotencyKey, launchNonce, manifestRef, launchDeadline, stateVersion}`をPi spawn前にdurable化する。`GuardedLaunchManifest`は`{launchNonce, leaderPid, pgid, state:"awaiting-go"}`を持ち、guardianが0600 fileへfsync/atomic renameする。driverはmanifest照合とprocess acceptance commit後だけGOを送る。

`ReservedNoLaunchEvidence`は`{expectedState:"reserved", expectedStateVersion, launchIntent:"absent", observedAfterStaleDeadline, observer}`である。lifecycle storeはrecovery CASと同じatomic operation内で現在state/versionおよびlaunch intent row/referenceの不存在を照合する。spawnはdurable launch intent後だけ許可されるため、この証拠はguardian/Piが未生成であることを示す。外部process探索だけでこのevidenceを生成しない。

`PiNotStartedEvidence`は`{launchNonce, expectedManifestRef, controlChannel:"closed", manifestState:"absent" | "awaiting-go", observedAfterLaunchDeadline, observer}`である。launch intentとnonceを照合でき、GO未送信を証明する場合だけhandleなし`process-starting`をnot-startedとして回復できる。

`StaleExecutionRecoveryRequest`はclosed unionである。

- `pre-settling-finalize`: key、expected source state/version、operator identity/reasonに加え、`reserved`なら`ReservedNoLaunchEvidence`、positive handleなら`ProcessExtinctionEvidence`、handleなし`process-starting`なら`PiNotStartedEvidence`を必須とする。candidate digestを要求しない。
- `settling-recover`: key、expected state/version/candidate digest、`retry-prepare | finalize-replay-unavailable`、operator identity/reason。

pre-settling recoveryはCAS成功後に`failed(stale-execution-recovered)` candidateとprivate payload/ack handleを生成し、通常の`settling → terminal-pending → terminal`へ進む。`reserved`のno-launch evidence、positive handleのextinction evidence、またはhandleなし`process-starting`のPiNotStartedEvidenceというsource state対応の証拠がない場合、state/version mismatch、既存terminalではstate不変のclosed operational failureを返す。

`PiRuntimeSnapshot`は`{executableRealpath, version, platform: "darwin" | "linux", profile: "pi-rpc/0.83+", observedAt}`を持つimmutable factである。`PiRuntimeProbePort.probe()`はsnapshotまたはclosed environment failureを1回で返し、driverはsnapshot fieldを個別に再probeしない。doctorとdriverは同じprobe implementationを別invocationで呼ぶため、doctor結果のhandoffや永続cacheは不要である。

## Ports and ownership

| Port | Operations | Must not own |
|---|---|---|
| `ChildExecutionLifecyclePort` | `reserve`、`recordLaunchIntent`、`recordProcessAcceptance`、`recordSessionIdentity`、`enterSettling`、`prepareTerminal`、`commitPreparedTerminal`、`getPendingTerminal`、`claimPendingTerminalBatch`、lease専用`reconcileClaimedPendingTerminal`、非待機`reconcileCurrentPendingTerminal`、`finishReconciliationAttempt`、`scanStaleExecutions`、`recoverStaleExecution`、`acknowledgeChildResult`、`purgeArchivedReplayPayloads` | spawn、RPC parse、retry decision |
| `PiChildProcessPort` | guarded detached group spawn、manifest/control observe、GO、RPC proxy、stdin close、group signal、leader wait、group extinction probe | audit、role semantics、pool width |
| `PiRpcCodec` | command encode、strict JSONL decode、external frame parse | process lifecycle、terminal decision |
| `PiChildTerminalArbiter` | accept cause、latch first、produce result candidate | kill/reap、audit write |
| `PiChildOutputCollector` | bounded assistant output、digest、redaction | task semantic validation |
| `ClockAndDeadlinePort` | now、deadline schedule/cancel | retry/backoff |
| `PiRpcProfileSelector` | Pi semver/platformから`pi-rpc/0.83+ | unsupported`を決定 | RPC process、doctor表示、version別分岐 |
| `PiRuntimeProbePort` | executable realpath、version、platform、profileを同一snapshotとしてprobe | doctor state永続化、process spawn、credential |
| `EmergencyDiagnosticPort` | `emit`、`listQuarantinedKeyDigests`、`acquireQuarantineFence`、fence内`readQuarantineState`、token必須`quarantinePoison` / `clearQuarantine`、`releaseQuarantineFence`をmachine-local fallbackへ実行してclosed ackを返す | retry、terminal commit、raw key/prompt/secret出力 |
| `PiChildDriverPolicy` | reconciliation batch limit/lease、stale execution閾値/scan limit、guardian launch deadlineのvalidated値 | retry admission、pool width、dynamic config discovery |

これらのportはfake/failing implementationをtest側に置くためのseamであり、本番コードにfixture modeを追加しない。process runnerの既存termination policyとexecution lifecycle contractを再利用できる範囲で共有し、Pi RPC framing/handshakeだけをharness overlayへ閉じる。

`PiChildProcessPorts`は公開署名に渡すaggregate dependencyで、`{process, lifecycle, codec, output, clock, runtimeProbe, emergencyDiagnostic, policy}`を必須fieldとして持つ。profile selectorはruntime probeの明示依存であり、snapshotへ選択結果を格納する。したがって`executePiChild(input, signal, ports)`からruntime/lifecycle/diagnostic/policyへ直接到達でき、別の隠れた引数やglobal service locatorを要求しない。

全lifecycle operationは`LifecycleResult<T, Code>`のclosed unionを返しthrowしない。`claimPendingTerminalBatch({limit, leaseUntil, excludeKeyDigests})`はticket順snapshotを返し、core lockを解放してからdriverへ渡す。`reserve`は`new | in-progress | terminal-pending | terminal-replay | conflict`、またはclosed failureを返す。`enterSettling(sourceState, candidate)`はprivate payload先行、settling metadata後続のrecoverable protocol、`prepareTerminal`はsettling ref/digestからpending metadataへcompare-and-setする。`commitPreparedTerminal`、lease付きbatch reconcile、非待機current reconcileはkey + digestのcompare-and-setであり、current variantだけがlease-busyを即時返す。各failure codeとcleanup/returnはbusiness-logic-modelのfailure matrixを正本とする。

reconcilerのownerは既存`PiSubagentDriver` entrypointである。各driver invocationはpolicy閾値で全nonterminal active stateをscanし、quarantine exclude snapshotを読む。snapshot一致なら早期終了し、不一致ならpendingを1 batch claimした後にcurrent keyのper-key fenceを取得してstateを再読する。不在時だけ同じfence内でreserveと必要な同期reconcileを行う。poison追加とclearも同じfenceを必須とするため、snapshot後の並行追加を迂回できない。stale keyはoperator-only `recoverStaleExecution`でsource state/versionをcompare-and-setする。pre-settlingでは`reserved`のno-launch、handleなし`process-starting`のnot-started、positive handleのextinctionというstate対応evidence付きfailure candidateを新規生成し、settlingではexpected candidate digestを検証してretry/finalizeする。任意clearと新process再spawnは許さない。pending failure metadataを書けない場合はfence内でpoison quarantineへdurable隔離し、fence取得または隔離も失敗なら新規spawnを禁止する。

## 上流トレーサビリティ

`unit-of-work`のtyped request/result ownership、`unit-of-work-story-map`のrole/terminal/pool coverage、`requirements`のidentity・failure・concurrency・secret条件、`components`のPiSubagentDriver、`component-methods`の公開interface、`services`のshort-lived process stateをdomain modelへ落とした。
