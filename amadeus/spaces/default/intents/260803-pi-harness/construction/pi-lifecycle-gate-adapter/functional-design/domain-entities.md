# pi-lifecycle-gate-adapter — Domain Entities

## Modelling policy

Pi native eventはversion付きexternal unionとしてanti-corruption layer内でparseし、Amadeus coreへはcanonical lifecycle/presence/tool/compaction factだけを渡す。entityはTypeScript discriminated unionとcompanion parser/reducerで表し、長寿命serviceやdatabaseを追加しない。

## Identity and delivery values

| Value | Construction | Invariant |
|---|---|---|
| `PiSessionId` | public `ReadonlySessionManager.getSessionId()` | non-empty、session replacementで再解決 |
| `RuntimeInstanceId` | extension factoryごとの256-bit CSPRNG | process memory/journal相関用、auditはdigest |
| `EpochId` | active epochをopenするときの256-bit CSPRNG | session start duplicate中は不変、replacementで更新 |
| `PiSessionEpoch` | session ID + epoch ID + start receipt | runtimeをまたぐjournal replayでも同一identity |
| `CanonicalEventKey` | event kindごとの`pi-<kind>/v1` canonical bytesのSHA-256 | versioned、raw contentなし、duplicate stable |
| `EventFingerprint` | event kindごとのsafe factをlength-prefixしたSHA-256 | 同一key異内容を検出 |
| `InputDeliveryKey` | `pi-input/v1` + session ID + epoch ID + base leaf + source/behavior + content digest | raw contentなし、duplicate stable |
| `SettlementCycleId` | epoch + CSPRNG token | first agent_startからsettledまで不変 |
| `AgentAttemptOrdinal` | cycle内1始まりの整数 | matching end後の次startだけincrement |
| `ToolDeliveryKey` | event phase + epoch + cycle + attempt ordinal + toolCallId | phaseごとのduplicate stable |
| `CompactionAttemptId` | before-compact open時の256-bit CSPRNG | open attemptのduplicate中は不変 |
| `CompactionDeliveryKey` | `pi-compact-after/v1` + epoch + compaction entry ID | reinjection高々1 |
| `OutboxDeliveryToken` | version prefix + 256-bit CSPRNG | Pi session entry detailsで照合可能 |

session file、previous/target file、cwdはrealpath後のdigestだけをcanonical factへ投影する。input/tool payloadのdigestはlength-prefixed canonical bytesからSHA-256で作り、生値をidempotency keyへ連結しない。

## Native and canonical events

`SupportedPiEvent`は`session_start`、`session_shutdown`、`input`、`agent_start`、`agent_end`、`agent_settled`、`tool_call`、`tool_execution_start/update/end`、`session_before_compact`、`session_compact`のclosed unionである。Pi 0.83 public literal、required field、context methodをexact parseする。unknown required shapeは`BlockedOutcome`、安全なadditional fieldだけignoreできる。

| Native fact | Canonical projection |
|---|---|
| session start/shutdown | session epoch、reason、path digest、timestamp |
| interactive input | human presence delivery key、session/leaf identity |
| rpc/extension input | non-human ignored receipt |
| agent start/end | settlement cycle open/attempt observation |
| agent settled | settled CASとcontinuation prepare request |
| tool call/start/end | PreToolUse guard、execution acceptance、PostToolUse fact |
| before/after compact | checkpoint、fresh recovery envelope delivery |

## Bridge journal and health

`PiBridgeJournalRecord`は`{eventKey, fingerprint, sessionEpochDigest, kind, safeProjection, sealedPayloadRef?, coreReceiptRef?, state:"received"|"core-committed"|"completed", createdAt, updatedAt, failureCode?}`を持つ。reserveは同一key・同一fingerprintなら既存record、異なるfingerprintなら`conflict`を返す。0700 machine-local directory、0600 file、fsync + atomic renameを用いる。replayにfull payloadが必要なinput/tool resultはAES-256-GCM envelopeへsealし、key/nonce/tag/versionを分離する。Git/package対象外である。

`CanonicalCommitReceipt`は`{eventKey,fingerprint,state:"prepared"|"committed",auditReceipt?,sensorReceipts: Record<SensorId,Subreceipt>,validationReceipt?,canonicalReceipt?,updatedAt}`を持つ。`CanonicalEventCommitPort`はeventをdurableにprepareし、`eventKey + suboperation kind + stable target ID`からderived idempotency keyを作る。各audit/sensor/state-validation entrypointもこのkeyで`commitOnce`し、完了済みsubreceiptは再実行せず、欠けたsubreceiptだけをreconcileする。同一key・同一fingerprintの再呼出は同じreceipt、異なるfingerprintは`conflict`である。

`ExtensionHealthLatch`は`healthy | blocked`のclosed unionである。blockedはfirst failure code、event key digest、timestamp、remediation IDを持ち、raw exception/payloadを持たない。mandatory handlerはjournal/core completion前にsuccessを返さない。blocked中のworkflow handlerはmutationせず、read-only diagnostic handlerだけが別dependencyで動く。新session startはjournal replayとcapability validationが全成功した場合だけ新epochをhealthyとして開始できる。

`RegistrationGate`は`closed | open`で、openにはprofile/capability setとregistration receiptが必須である。handlerはgateを参照するだけで、自身を個別enableしない。

## Presence and agent cycle state

`PresenceCandidate`はsession ID、base leaf ID nullable、source、streaming behavior、content digestを持ち、raw contentを持たない。`PresenceReceipt`は`minted | duplicate | ignored-non-human`である。同じbase leaf/keyのduplicateは同receipt、leaf更新後の次inputは別keyである。

`AgentCycleLedger`は次のclosed stateである。

| State | Required facts | Allowed next |
|---|---|---|
| `idle` | session epoch | `active` |
| `active-running` | cycle ID、attempt ordinal、startedAt | duplicate start、matching end |
| `active-ended` | cycle ID、attempt ordinal、agentEnd digest | retry start、settled |
| `settled` | cycle ID、settledAt、continuation receipt/outbox ref | `active-running`（次のagent_start） |

`agent_end`は`active-running`のmatching attemptを`active-ended`へ進めるだけでcycleを閉じない。running中の同fingerprint `agent_start`は同じevent receiptを返す。`active-ended`後の次startだけがordinalを増やしてrunningへ戻る。`agent_settled`だけが同cycle/versionをCASする。settled後のduplicateは同receiptを返し、次のagent_startだけが新cycleを作る。

## Continuation and recovery outboxes

`ContinuationOutbox`は`{cycleId,targetSessionId,deliveryToken,directiveDigest,sealedMessageRef,state:"prepared"|"appended"|"delivered"|"blocked", preparedAt}`を持つ。engine-owned `prepareOnce`が`not-needed` receiptまたはoutboxをatomicに生成する。adapterはtarget sessionのcustom entriesからtokenを検索し、存在時はappendせずmarkする。tokenはmessage detailsに置き、本文へ露出しない。

`CompactionAttemptLedger`は`idle | open | completed`のclosed stateである。openはattempt ID、before event key/fingerprint、base leaf、session/cycle/attempt identity、reason、willRetryを持つ。同一fingerprint beforeはduplicate、異内容beforeはconflictである。`session_compact`は`compactionEntry.id`でafter keyを作り、対応attemptをcompletedへCASする。

`CompactionCheckpoint`はcompaction attempt、session/cycle、reason、willRetry、active intent UUID、stage、state version、mission digest、createdAtを持つ。`MissionRecoveryOutbox`はcompaction entry ID、target session、delivery token、fresh state digest、bounded recovery envelopeを持つ。recovery envelopeはactive recordから再構築し、Pi summaryをidentity sourceにしない。overflow時も`triggerTurn=false`である。

outboxのsession mismatch、payload verification failure、append/mark failureは自動的に別sessionへ移送せずblockedとなる。archive済みsessionのoutboxはoperator remediationでのみcloseできる。

## Tool execution aggregate

`ToolExecutionLedger`はcall/start/endそれぞれのevent key/fingerprint、tool name、call ID、session epoch、cycle/attempt identity、safe input projection、sealed args/result ref、start/end timestamp、isError、canonical commit receiptを持つ。stateは`accepted → ended → core-prepared → core-committed`である。update eventはstateを進めない。

`tool_call`と`tool_execution_end`は別factであり、前者は実行前guard、後者だけがPostToolUseを生成する。unknown end、name mismatch、end-before-startは`tool-correlation-invalid`。duplicate endは保存済みcore receiptを返す。relative workspace path以外の絶対path、command本文、result本文はsafe projectionへ含めない。

## Ports and ownership

| Port | Operations | Must not own |
|---|---|---|
| `PiBridgeJournalPort` | key/fingerprint reserve、seal、markCoreCommitted、complete、listPending、replay、health latch | stage routing、gate approval |
| `CanonicalEventCommitPort` | `commitOnce`、receipt lookup、audit/sensor/state-validation subreceipt reconciliation | Pi event parsing、Pi session delivery |
| `CanonicalLifecyclePort` | session start/end、Pre/PostToolUseのcanonical reducer | Pi event parsing、冪等commitの独自実装 |
| `PresencePort` | `mintHumanTurnOnce`とreceipt lookup | input source分類、回答意味判定 |
| `ContinuationPort` | cycle CAS、`prepareOnce`、mark delivery、engine next | Pi message append、native retry |
| `ActiveRecordResolverPort` | active intent、stage、state version、missionのfresh snapshot | Pi summary parse |
| `PiSessionDeliveryPort` | custom entry token lookup、append continuation/recovery message | engine routing、cross-session forwarding |
| `ReadOnlyDiagnosticPort` | status、doctor、blocked detail | trust承認、repair、workflow mutation |
| `ClockAndIdPort` | UTC timestamp、CSPRNG runtime/epoch/cycle/compaction/token | global mutable identity |

`PiExtensionPorts`は上記を明示fieldとして持ち、service locatorや過去doctor stateを読まない。Pi native `ExtensionAPI`/`ExtensionContext`はadapter entrypointだけが受け取り、core portへ漏らさない。全port resultはclosed unionでthrowせず、native exceptionはadapter境界でredacted blocked codeへ変換する。

## 上流トレーサビリティ

`unit-of-work`のversion付きmapping/journal/benchmark、`unit-of-work-story-map`のgate journey、`requirements`のsession/presence/continuation/tool/compaction criteria、`components`のPi固有knowledge境界、`component-methods`の登録・input・settled interface、`services`の短命runtimeとreconciliationをdomain modelへ落とした。
