# pi-child-execution-driver — Business Logic Model

## 目的と責務境界

本Unitは、Amadeus coreが許可した1 child attemptをPi 0.83.0以上のRPC processへ配送し、native acceptance、session相関、terminal observationをtyped resultへ変換する。`unit-of-work`が定めるとおり、support / reviewer / constructionでprocess mechanicsを分岐させない。role差はpersona/task envelopeだけであり、pool width、dependency、attempt budget、retry admissionは既存coreへ残す。

Pi RPCは公開CLI `pi --mode rpc --no-session`をshellなしで起動し、stdin/stdoutをLF区切りJSONLとして扱う。`prompt`のsuccess responseは受付事実でありtask完了ではない。成功候補は`agent_settled`受信後だけ成立する。

## Main workflow

1. **Admit request**
   - raw/unknown inputは`admitPiChildRequest`だけが扱い、`executionId`、`childId`、`parentId`、role、workspace、task、persona、`timeoutMs`を一度だけparseする。
   - roleは`support | reviewer | construction`、identity/task/personaは非空、timeoutは正の有限値、workspaceは実在directoryでなければ、`PiChildAdmissionFailure`を返して終了する。このfailureはraw identityのecho、`PiChildResult`、native/audit factを生成しない。
   - 成功時だけ非空branded identityを持つimmutable `PiChildRequest`を生成する。Application Designの公開`executePiChild(input: unknown, ...)`はadmission unionを返し、内部`spawnReservedPiChild`だけがvalidated requestを受理する。
   - task/persona/environmentの生値はaudit fieldへ渡さず、必要な相関にはcanonical digestだけを使う。
2. **Reconcile pending terminals and reserve the attempt**
   - idempotency keyは`pi-child-delivery/v1`と`parentId`、`executionId`、`childId`のUTF-8 length-prefixed列からSHA-256で決定的に導出する。scopeは1 core child deliveryであり、異なるattemptはcoreが新しいexecutionId/childIdをmintする。
   - request fingerprintは`pi-child-request/v1`、3 identity、role、realpathのSHA-256、`timeoutMs`、taskのSHA-256、personaのSHA-256を固定順のlength-prefixed列としてhashする。raw workspace/task/personaを永続化しない。
   - core execution lifecycle portへidentity、role、workspace digest、request fingerprint、導出済みidempotency keyを渡す。
   - `ports.lifecycle.scanStaleExecutions({olderThan: now-policy.staleExecutionAfterMs, limit: policy.staleScanLimit})`を最初に呼び、全nonterminal active stateの検出keyをisolatedのまま`stale-execution-detected`としてstructured batch failureへ含める。scan failureは`stale-execution-scan-failed`で新規spawnを禁止する。同じkeyの`reserve`は常にspawn permitを拒否する。
   - 次に`ports.emergencyDiagnostic.listQuarantinedKeyDigests()`を読む。このclosed operationが失敗した場合はpublic batchを`visibility-failed`、resultを`failed(quarantine-index-read-failed)`としてclaim/reserve/runtime/spawnをすべて禁止する。
   - quarantine読取成功後、導出済みidempotency keyのdigestを同じcanonical digest関数で計算し、snapshotと照合する。一致した現在deliveryはbatchを`completed`（failure code=`reconciliation-quarantined`、visibility=`emergency-diagnostic`）、resultを`failed(reconciliation-quarantined)`とする`non-acknowledgeable-failure`で即時終了する。この早期照合は不要なbatch claimを避ける最適化であり、後述のfence内再照合を置換しない。
   - quarantine読取成功後、`ports.lifecycle.claimPendingTerminalBatch({limit: policy.reconciliationBatchLimit, leaseUntil, excludeKeyDigests})`を一度だけ呼ぶ。返されたlease付き1 pageの全recordを試し、同一invocation内でpaginationしない。このreconcilerは既存`PiSubagentDriver` entrypointが所有する。
   - batch recordはlease付き`reconcileClaimedPendingTerminal(record, leaseId)`で処理する。claim時のcore lockはsnapshot/leaseを返す前に解放され、network/process待機中やquarantine fence取得時まで保持しない。reconcile成功はrecordをterminalへ移す。失敗は`finishReconciliationAttempt(..., failed)`でpending recordのattempt metadataとround-robin ticketをatomic更新する。これが失敗した場合は`ports.emergencyDiagnostic.emit`へbounded/redacted recordを同期出力する。
   - lifecycle writeが失敗したrecordは、そのkey digestのcross-process `QuarantineFence`を取得した区間で`emergencyDiagnostic.quarantinePoison`へdurableに隔離し、次回claimのexclude setへ入れる。`clearQuarantine`も同じfenceを必須とする。quarantineはdoctorに表示し、lifecycle修復後に明示clearすると再claim対象へ戻る。隔離ackが得られた無関係failureでは現在deliveryを継続する。fence取得または隔離が失敗した場合だけ`visibility-failed` batch outcomeと`failed(reconciliation-visibility-failed)`を呼出元へ返し、runtime probe/native spawnを行わない。
   - admission成功後のpreflight `PiReconciliationBatchOutcome`は`executePiChild` responseへ必ず含める。recordは単調増加`reconcileTicket`の昇順でclaimし、failure時に新しい最大ticketへ回すため、sort keyを更新しながらcursor走査する問題を作らない。
   - batch完了後、current key digestの`QuarantineFence`を取得し、fence内でquarantine stateを再読する。一致時は`non-acknowledgeable-failure` + `failed(reconciliation-quarantined)`へ短絡する。fence取得/再読失敗は`reconciliation-visibility-failed`でfail-closedする。
   - quarantine不存在を同じfenceで保持したまま`reserve`を呼ぶ。`terminal-pending`ならbatch用lease operationを使わず、`reconcileCurrentPendingTerminal(key, digest, wait:false)`を同じfence内で一度だけ呼ぶ。このoperationはleaseを取得・待機・解放せず、core stateを即時CASする。lease所有中なら`lease-busy`を直ちに返すため、driverはfenceを解放して`non-acknowledgeable-failure` + `failed(delivery-in-progress)`を返し、自動retry/spawnを行わない。CAS成功ならoriginal result、closed write failureなら`failed(terminal-audit-failed)`を返す。
   - `QuarantineFence`保持中は、blocking lock/lease取得、sleep、retry、I/O待ちを禁止する。`new`、terminal replay、in-progress、conflict、同期reconcileの即時結果を得た時点でfenceを解放する。batch pathはlogical leaseを持ち得るがcore lockを保持せず、current pathはfence内でleaseを待たないため、lease→fenceとfence→leaseの待機cycleは成立しない。poison追加・clear・reserve・同期reconcileはkeyごとに直列化され、snapshot照合後の並行quarantine追加はreserve/reconcileを迂回できない。
   - `new`だけがspawn permitを得る。terminal replay、in-progress duplicate、fingerprint conflictは新processを起動せずtyped resultにする。fence解放後に新規quarantineが成立する場合、その線形化点は`new` reservationより後であり、既存pending recordのない同keyへ遡及適用しない。
3. **Resolve one runtime snapshot for a new permit**
   - reservationが`new`を返した場合だけ`ports.runtimeProbe.probe()`を一度呼び、Pi executable realpath、reported semver、platform、選択済み`PiRpcProfile`を同じimmutable `PiRuntimeSnapshot`として得る。terminal replayとpending recoveryはPi runtime availabilityに依存しない。
   - probeは同じ観測内でexecutable解決、`pi --version`、platform判定、`selectPiRpcProfile`を実行する。unsupported/failureならprocess 0件のterminal failureとしてlifecycleへ記録する。
   - doctorも別の短命invocationから同じ`probePiRuntime` implementationとselectorを呼ぶが、doctor結果の永続化・handoffには依存しない。driverは暗黙globalや過去doctor stateを読まない。
4. **Spawn without a shell**
   - Piを直接spawnしない。driverはCSPRNG launch nonceとmachine-local manifest refを作り、`recordLaunchIntent(key, nonce, manifestRef)`で`reserved → process-starting`を先にdurable化する。
   - `PiChildProcessPort.spawnGuarded`はAmadeus-owned guardianをshellなし・detached groupで起動する。guardianはPiをまだ起動せず、nonce付きmanifest `{leaderPid, pgid, nonce, state:"awaiting-go"}`を0600 fileへfsync/atomic renameし、同じ値をcontrol pipeで返す。
   - driverはmanifest/nonce/PID/PGIDを照合して`recordProcessAcceptance`をcommitした後だけcontrol pipeへ`GO`を送る。guardianはGO後にPiを同じprocess groupのchildとして`--mode rpc --no-session`でspawnし、stdin/stdout/stderrをproxyする。task/personaはGO後のRPC stdinだけで渡す。
   - driverがmanifest受領前またはacceptance commit前にcrash/pipe closeした場合、guardianはPiを起動せずgroupを終了する。acceptance commit後のcrashではlifecycleにPGIDがある。したがってPiが起動し得る時点では必ずrecoverable handleが先に永続化済みである。
   - `reserved`でstaleになったstateは、同じstate versionにlaunch intentが存在しないことをlifecycle store内でatomicに照合する`ReservedNoLaunchEvidence`でだけfinalizeできる。spawnはdurable launch intent後にしか許可されないため、この証拠が成立するtraceのOS guardian/Pi spawn countは0件である。
   - `process-starting`でhandleがないstale stateはlaunch nonce、control-channel closed、manifest absent/`awaiting-go`、launch deadline超過を組み合わせた`PiNotStartedEvidence`でだけfinalizeできる。任意のprocess探索やargv相関は使わない。
   - executableとparser profileはこのinvocationの`PiRuntimeSnapshot`からだけ取得する。
   - cwdを検証済みworkspaceに設定し、task/persona/secretをargvへ置かない。provider/authはprocess environmentへ委譲するが、driverは環境内容を記録しない。
   - macOS/Linuxではguardianを`detached: true`で起動し、leader PIDと同じPGIDを持つ専用process groupを作る。stdout parser、stderr tail、group exit observer、AbortSignal、deadlineをGO前に接続する。
5. **Record process acceptance**
   - guardian manifestから正のPID/PGIDとnonceを検証した後、sessionIdなしのaccepted factをcore lifecycle portへcommitする。
   - commit失敗時はGOを送らずguardian groupを停止・reapする。commit成功後だけGOを送るため、untracked Pi executionを続けない。
6. **Perform RPC handshake**
   - correlation ID付き`get_state`を1行送る。
   - 同じIDのsuccess responseをparseし、非空`sessionId`をPi session identityとしてaccepted factへ追記する。
   - timeout、error response、invalid JSON、unknown required response shape、process early exitはprompt前failureである。
7. **Submit bounded task**
   - role、persona、task、workspace規律、期待する返却形式を1つのprompt envelopeに組み、correlation ID付き`prompt` commandとしてstdinへ送る。
   - success responseは`prompt-accepted` factだけを表す。false responseまたはresponse前exitはfailureとする。
8. **Collect events until settled**
   - event frameをversion付きexternal unionとしてparseする。output collectorはassistant `message_start/update/end`だけを追跡し、最後に完了したassistant messageのtext blockだけを返却候補にする。
   - `text_delta`は`contentIndex`別の検算bufferへ順序どおり追加する。`message_end.message.content[*].text`を唯一のfinal sourceとし、delta列はfinal textとの一致確認にだけ使って二重追加しない。thinkingとtool callは公開outputへ含めない。
   - `agent_end`はretry、compaction、queued follow-upが続き得るためterminalにしない。
   - `agent_settled`を受けた時点でterminal arbiterへ`settled` causeを提示する。
   - Pi error/extension error、invalid required frame、output capacity超過、early exitは`failure` causeを提示する。
9. **Close and reap**
   - settled時はstdinを閉じ、負のPGIDへSIGTERMを送り、grace内のleader exitとgroup消滅を待つ。driver起因のSIGTERM exitは正常cleanupとして扱う。
   - cancel/timeout/failure時は、stdinが利用可能ならcorrelation ID付き`abort`を送り、短いsettle grace後に負のPGIDへSIGTERM、さらにSIGKILLへescalateする。
   - leader close/reapに加え、`kill(-pgid, 0)`がESRCHになることを確認する。groupが残る、確認不能、またはleaderなしでPGIDを安全に扱えない場合は、outputが存在しても`process-reap-failed`で失敗する。
   - leader reap後はPGID再利用の危険があるため再signalせず、残存可能性をtyped failureとして返す。現在のPiがchildを別session/groupへdetachしないことをlive process-tree fixtureでformal support条件として固定する。
10. **Commit exactly one terminal fact**
   - cleanup後、全source state（`reserved`、`process-starting`、`process-accepted`、`rpc-ready`、`prompt-pending`、`running`）は`enterSettling(candidate)`を通る。これは暗号化private replay payloadを先にfsync/atomic renameし、candidate digest/refを持つdurable `settling`へatomic transitionする。
   - 続いて`prepareTerminal(key, candidateDigest)`がaudit-safe terminal fact metadataを書き、`settling → terminal-pending`へatomic transitionする。runtime probe/spawn/handshake等のearly failureも同じ経路を使い、active stateから`terminal`へ直接遷移しない。
   - `enterSettling`のmetadata失敗時はpayloadを削除し、crashで残ったunreferenced payloadはstartup orphan sweepがgrace後に削除する。`prepareTerminal`失敗時はdurable `settling`とpayloadを保持する。
   - 続けて`commitPreparedTerminal(key, digest)`を呼ぶ。同じkey + digestはidempotentに同じreceiptを返し、異なるdigestはconflictとして拒否する。commit成功後にだけ`succeeded`を呼出元へ返す。receiptは内部`CommittedPiChildTerminal`が保持し、公開`PiChildResult`へ追加しない。
   - commitが失敗してもdurableな`PendingTerminalRecord`とprivate replay payloadを削除せず、今回の公開結果はreceiptなしの`failed(terminal-audit-failed)`とする。次のreservationは`terminal-pending`を返してspawnを拒否し、driver invocation preflightまたはduplicate pathが同じfactをcommitする。reconcile成功後はpayloadをdecrypt/verifyしてoriginal resultをterminal replayする。payloadを読めない場合は`replay-payload-unavailable`でfail-closedし、別resultを捏造しない。
   - original resultをreplay可能なterminal commit/replayは`durable-result`とopaque `PiChildAcknowledgmentHandle`を返す。terminal audit未確定またはpayload復元不能のfailureは`non-acknowledgeable-failure`とhandle nullを返す。parentはhandleを公開`acknowledgePiChildResult`へそのまま渡し、key/digest/receiptを推測しない。ack後もactive intent中はduplicate replayのためpayloadを保持する。
   - stale executionはoperator-only `recoverStaleExecution(request)`で解決する。requestはstate versionをCASし、operator identity/reasonを必須とする。
     - `pre-settling-finalize`: source state/version、operator identity/reasonとsource対応evidenceを持ち、candidate digestを要求しない。`reserved`は同じstate/versionでlaunch intent不存在をatomic照合する`ReservedNoLaunchEvidence`、handleなし`process-starting`はnonce-bound `PiNotStartedEvidence`、positive handle stateは`ProcessExtinctionEvidence`を必須とする。成功時は`failed(stale-execution-recovered)`を新candidateとして生成し、通常の`settling → pending → terminal`へ進める。
     - `settling-recover`: expected candidate digestを持つ。`retry-prepare`はpayload検証後に同じcandidateを進め、`finalize-replay-unavailable`はpayload破損を証拠付きterminal failureへ確定する。
   - source state対応evidenceを確認できないpre-settling stateは隔離を維持し、任意clearや再spawnを許さない。

## Strict JSONL transformation

stdout decoderはUTF-8のchunk境界を保持し、LFだけでrecordを分割する。CRLF入力はLF直前の単一CRだけを除去する。U+2028/U+2029はJSON stringの一部として保持し、汎用line readerを使わない。empty line、invalid UTF-8、invalid JSON、1 recordのcapacity超過はprotocol failureである。

parse後のframeは次の順で分類する。

1. `type=response`かつ非空の既知correlation IDならpending commandへ配送する。
2. `type=response`だがID欠落、unknown ID、duplicate IDなら`rpc-response-invalid`にする。command failureでもID省略を許さない。
3. versionで認識するAgentSession eventならevent reducerへ配送する。
4. 将来追加された未知top-level eventは、`pi-rpc/0.83+`の非衝突・IDなしadvisory規則を満たす場合だけignoreできる。
5. terminal判断に関わる未知frame、またはshape不一致はfail-closedにする。

stderrはprotocolとしてparseせず、診断用のbounded/redacted tailだけを保持する。stdoutとstderrの混同を許さない。

### Pi RPC 0.83+ wire profile

wire frame自体にはversion fieldがない。doctorとdriverはPi overlayの同じpure function `selectPiRpcProfile(version, platform)`を使う。macOS/Linuxかつsemver `>=0.83.0`はすべてminimum-compatible `pi-rpc/0.83+`を返し、0.83.0未満、invalid semver、native Windowsはunsupportedを返す。doctorがsupportedと判定したversionをdriverがversion理由で拒否してはならない。

`pi-rpc/0.83+`は0.83で公開されたessential discriminator/pathを下限契約としてparseする。既知essential frame（response、assistant message lifecycle、agent_end、agent_settled、extension_error）が既知shapeを破る場合はfail-closedにする。将来versionが追加する未知top-level eventは、`type`が非空string、`id`を持たず、既知essential discriminatorと衝突しない場合だけadvisoryとしてbounded digestを監査して無視する。未知response、既知message typeの必須field欠落、未知frameによるterminal推測は許さない。これによりadditive eventを受理しつつ、0.83 essential contractの破壊はsuccessに変換しない。

| Frame | Required literal schema |
|---|---|
| Get state command | `{id: string, type: "get_state"}` |
| Get state success | `{id: same, type: "response", command: "get_state", success: true, data: {sessionId: non-empty string, ...}}` |
| Prompt command | `{id: string, type: "prompt", message: string}` |
| Prompt success | `{id: same, type: "response", command: "prompt", success: true}` |
| Abort command | `{id: string, type: "abort"}` |
| Abort success | `{id: same, type: "response", command: "abort", success: true}` |
| Command failure | `{id: same non-empty string, type: "response", command: same pending command, success: false, error: string}` |
| Assistant message start | `{type: "message_start", message: {role: "assistant", content: array, ...}}` |
| Assistant text delta | `{type: "message_update", message: {role: "assistant", ...}, assistantMessageEvent: {type: "text_delta", contentIndex: non-negative integer, delta: string, partial: {role: "assistant", ...}}}` |
| Assistant text end | `{type: "message_update", message: {role: "assistant", ...}, assistantMessageEvent: {type: "text_end", contentIndex: non-negative integer, content: string, partial: {role: "assistant", ...}}}` |
| Assistant stream error | `{type: "message_update", message: {role: "assistant", ...}, assistantMessageEvent: {type: "error", reason: "aborted" | "error", error: {role: "assistant", stopReason: "aborted" | "error", errorMessage?: string, ...}}}` |
| Assistant message end | `{type: "message_end", message: {role: "assistant", content: Array<{type: "text", text: string, ...} | non-text-block>, stopReason: string, ...}}` |
| Extension error | `{type: "extension_error", extensionPath: string, event: string, error: string}` |
| Agent end event | `{type: "agent_end", messages: array, willRetry: boolean}` |
| Agent settled event | `{type: "agent_settled"}` |

`data.sessionId`以外のget_state fieldはforward-compatible additional fieldとして無視できる。responseのid/command/successとessential event discriminatorはexact matchする。assistant以外のmessage lifecycleはrecognized advisory eventとして検証後にoutput collectorでは無視する。`text_start`、`start`、`done`などrecognized assistant updateはstate/shapeを検証するが、公開outputへ追加しない。assistant stream `error`は`agent-error`、`extension_error`は`extension-error`を即座にarbiterへ提示する。recognized 0.83 advisory eventはprofile allowlistでparseしてevent reducerへ渡し、将来追加された非衝突top-level eventだけを上記forward-compatible ruleで無視する。

### Deterministic output builder

collectorは同時に1つのassistant messageだけをactiveにし、各messageを受信ordinalで識別する。`message_start`で空のblock mapを作り、`text_delta`を`contentIndex`別に追加する。`text_end.content`は同indexのdelta連結値と一致しなければ`rpc-framing-invalid`で失敗する。`message_end`では`message.content`の配列順を保持し、`type=text`の`text`だけをLFで連結したfinal textを作る。deltaをfinal textへ再追加しない。deltaを受けたblockはfinal block textとの一致も必須とする。

完了したassistant messageが複数ある場合は、最後の`message_end`で確定したfinal textだけを`PiChildResult.succeeded.output`に採用する。tool-result/user message、thinking block、tool call blockはoutput対象外である。`message_end`なし、重複start/end、index不整合、capacity超過、またはstream error後のsettledはfailureとする。空のfinal textは有効だが、assistant messageが一度も完了しないままsettledした場合は`rpc-framing-invalid`とする。

## Terminal arbitration

terminal決定は次の3 phaseを固定順に適用する。

1. **Semantic arbitration:** 単一threaded event reducerが最初に受理したcauseをlatchし、semantic candidateを1件だけ作る。後続causeはcandidate kindを変更しない。
2. **Cleanup override:** process group消滅を確認できない場合だけ、semantic candidateを`failed(process-reap-failed)`へ置換する。
3. **Audit override:** cleanup後のcanonical candidateを`prepareTerminal`してcommitする。prepare/commitが完了しなければ、今回の公開結果だけを`failed(terminal-audit-failed)`へ置換する。durable pending recordには置換前のcanonical candidateを保持し、後のreconcile成功時はそのoriginal resultをterminal replayする。

| First accepted cause | Result candidate | Cleanup |
|---|---|---|
| AbortSignal | `cancelled` | RPC abort → SIGTERM → SIGKILL → reap |
| Deadline | `timed-out` | RPC abort → SIGTERM → SIGKILL → reap |
| Protocol/process/lifecycle failure | `failed` | SIGTERM → SIGKILL → reap |
| `agent_settled` | `succeeded` candidate | SIGTERM → reap |

latched後のeventは観測・cleanupには使えるがsemantic candidate kindを変更しない。例えばcancelを先に受理した後の`agent_settled`は`cancelled`のまま、settledを先に受理した後の遅いAbortSignalはsemantic successをcancelへ変えない。RPC abortのwrite/responseが失敗しても、SIGTERM/SIGKILL後にgroup消滅を確認できれば元の`cancelled`/`timed-out`を維持し、cleanup escalation factを監査する。その後にcleanup override、最後にaudit overrideを適用するため、`settled → audit commit failure`の今回返却値は一意に`failed(terminal-audit-failed)`となる。

## Result classification

- `admission-failed`: raw inputを`PiChildRequest`へ構築できない。field名とclosed codeだけを持ち、executionId/childId/sessionIdを持たず、`PiChildResult`とは別のentrypoint outcomeである。
- `succeeded`: prompt accepted、`agent_settled`受信、required frame errorなし、bounded output取得、process-group消滅確認、terminal audit commit成功。
- `failed`: validated request後のenvironment/reservation/spawn/handshake/prompt/protocol/native/audit/cleanup failure。codeはclosed union、detailはredactedする。
- `timed-out`: `agent_settled`より先にdeadlineを受理し、cleanupを確認できた。
- `cancelled`: `agent_settled`より先にAbortSignalを受理し、cleanupを確認できた。

`succeeded`はchildのnative attemptがsettleした事実であり、生成コードやレビュー判断の正しさを意味しない。constructionは既存swarm `check`、support/reviewerは各stageのvalidation seamがsemantic outcomeを判定する。

### Lifecycle port failure matrix

全operationはthrowせず`LifecycleResult<T, Code> = {kind:"ok", value:T} | {kind:"failed", code:Code, detail:string}`を返す。adapterが捕捉したnative exceptionも対応するclosed codeへ変換する。

| Operation | Failure code | Required driver behavior |
|---|---|---|
| `scanStaleExecutions` | `stale-execution-scan-failed` | public batchを`visibility-failed`、reserve/runtime/spawn禁止 |
| `listQuarantinedKeyDigests` | `quarantine-index-read-failed` | public batchを`visibility-failed`、claim/reserve/runtime/spawn禁止 |
| current key digest quarantine match | `reconciliation-quarantined` | public batchを`completed` + emergency-diagnostic failure、reserve/sync reconcile/runtime/spawn禁止。明示clearだけが再試行を許可 |
| `acquireQuarantineFence` / fence内再読 | `reconciliation-visibility-failed` | reserve/同期reconcile/runtime/spawn禁止。machine-local lock remediationを返す |
| `claimPendingTerminalBatch` | `pending-terminal-read-failed` | public batchを`visibility-failed`、reserve/runtime/spawn禁止 |
| `reserve` | `lifecycle-reserve-failed` | process 0件のfailed result。batch outcomeと共に返す |
| `recordLaunchIntent` | `launch-intent-audit-failed` | OS process 0件のnot-started failure。spawn禁止 |
| `spawnGuarded` / guardian manifest | `spawn-failed` / `guardian-protocol-failed` | guardianが存在すればgroup extinction確認。PiへGO禁止 |
| `recordProcessAcceptance` | `process-accept-audit-failed` | GOを送らずguardian groupをkill/reapし、emergency diagnosticへaccepted-but-untrackedを出してfailed result |
| `recordSessionIdentity` | `session-identity-audit-failed` | semantic failureをlatchしabort/kill/reap後、通常terminal prepare/commitへ進む |
| `enterSettling` | `terminal-audit-failed` | success禁止、source active stateを保持。stale scanとemergency diagnosticで隔離 |
| `prepareTerminal` | `terminal-audit-failed` | success禁止、durable settling/payloadを保持。stale scanが隔離対象として可視化 |
| `commitPreparedTerminal` | `terminal-audit-failed` | pending metadata/payload保持。今回success禁止 |
| `getPendingTerminal` | `pending-terminal-read-failed` | duplicate pathでspawn禁止、failed result |
| `reconcileClaimedPendingTerminal` | `terminal-audit-failed` | batch lease所有者だけが実行し、finish attemptへfailureを渡す。core lockをfence待機へ持ち越さない |
| `reconcileCurrentPendingTerminal(wait:false)` | `lease-busy` / `terminal-audit-failed` | fence内で非待機CASを一度だけ実行。busyはfence解放後`delivery-in-progress`、write failureはaudit failure。spawn禁止 |
| `finishReconciliationAttempt` | lifecycle write failure | poison quarantine成功時だけ無関係delivery継続。失敗ならvisibility failure |
| `acknowledgeChildResult` | `replay-ack-failed` | opaque handleだけを検証。delivered resultは変更せず、payload保持とactionable operational resultを返す |
| `purgeArchivedReplayPayloads` | `replay-purge-failed` | active deliveryへ影響させず、payload保持とdoctor remediationを返す |
| `recoverStaleExecution` | `stale-recovery-failed` | state/payloadを変更せずoperatorへclosed operational failure。再spawn禁止を維持 |

cleanup failureは上表の元codeより`process-reap-failed`を優先し、terminal prepare/commit failureは最後のaudit overrideとして`terminal-audit-failed`を優先する。これ以外のoperation固有分岐を実装側で追加しない。

## Failure and concurrency scenarios

| Scenario | Expected behavior |
|---|---|
| signalがspawn前にaborted | process 0件、`cancelled(sessionId=null)` |
| identityが空 | admission failure、PiChildResult/audit/native process 0件 |
| current delivery keyがpoison quarantine中 | `non-acknowledgeable-failure` + `failed(reconciliation-quarantined)`、reserve/同期reconcile/runtime/native process 0件。明示clearまで同じ結果 |
| snapshot照合後にcurrent keyが並行quarantine | per-key fenceがpoison追加とreserve/同期reconcileを直列化。追加が先なら`reconciliation-quarantined`、reservationが先ならその線形化済みresult。迂回・二重処理0件 |
| batch lease所有中にcurrent deliveryがterminal-pending | fence内の同期CASは`lease-busy`を即時返し、fence解放後`delivery-in-progress`。batchは後にfenceを取得可能で、双方とも待機cycle・spawn 0件 |
| runtime probeがunsupported | typed environment failure、native process 0件 |
| executable不在 | `failed(pi-not-found)`、accepted factなし、native process 0件 |
| driver crash after guardian spawn, before GO | guardianはpipe closeでPiを起動せず終了。launch evidenceからnot-started/contained groupを確定 |
| driver crash after reserve, before launch intent | `reserved`の同じstate/versionとlaunch intent不存在をatomic照合し、`ReservedNoLaunchEvidence`付きCASだけでfailure terminalへ収束。native process 0件 |
| PID受理後にaudit commit失敗 | child groupをkill/reap、`failed(process-accept-audit-failed)` |
| `get_state`前にexit | `failed(rpc-handshake-failed, sessionId=null)` |
| prompt response success後にprocess exit | `failed(process-exited-before-settled)` |
| `agent_end`後にretry/compaction | 待機継続。`agent_settled`までterminal 0件 |
| timeout直後にsettled | arbiterの受理順で1 result。重複terminal 0件 |
| duplicate delivery | core reservationが2件目のspawnを拒否し、native process高々1件 |
| duplicate deliveryが`terminal-pending`を発見 | 同期reconcile成功ならoriginal resultをreplay、失敗なら`terminal-audit-failed`。spawn 0件 |
| 無関係pendingのpreflight reconcile失敗 | lifecycle auditまたはemergency diagnosticがackすれば現delivery継続。両方失敗ならvisibility failureでspawn 0件 |
| private replay payloadが欠落/復号不能 | `replay-payload-unavailable`、spawn 0件、payloadを捏造しない |
| pre-settling stateがstale | extinction evidence付きoperator CASで`stale-execution-recovered`へterminalize。証拠なしは隔離維持 |
| pool=4 | 各driver instanceは1 childだけを所有。総数制御はcore poolが行う |

## 上流トレーサビリティ

`unit-of-work`のprocess ownershipとtest boundary、`unit-of-work-story-map`のSCN-005/006、`requirements`のFR-SUB-001〜005・NFR-REL-002/003・NFR-SCL-001・NFR-SEC-002、`components`のPiSubagentDriver境界、`component-methods`のPiChildRequest/PiChildResult、`services`のRPC process lifecycleを具体化した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T12:27:09Z
- **Iteration:** 1
- **Scope decision:** none

Passed artifacts内に循環依存は認められず、core/driver責務、terminal raceのfirst-cause latch、secret非露出の基本方針は整合している。ただし、idempotency identity、RPC wire contract、terminal audit failure、process-tree reapに実装者の推測を要する契約欠落があり、FR-SUB-002/004とfailure transparencyを一意かつ安全に実装できない。

### Findings

- BLOCKER | business-logic-model.mdとBR-PCE-003/004はreservationへidempotency keyとrequest fingerprintを渡してduplicate spawnを防ぐが、公開PiChildRequestにもdomain-entities.mdのChild requestにもidempotency keyが存在せず、keyの導出元・scope・canonical fingerprintの対象field/versionも定義されていない。同一deliveryと異なるattemptをcore/driver間で一意に判別できず、native process高々1件という契約を決定的に実装できない。
- BLOCKER | domain-entities.mdは全PiChildResultとterminal stateにterminal audit receiptを必須とする一方、component-methods.mdの公開PiChildResult全variantにはreceiptがなく、さらにbusiness-rules.mdはterminal-audit-failedを返却可能なclosed errorとしている。terminal commit自体が失敗した場合に必須receiptを生成できず、receiptを捏造するか型を破るしかない。未commit/recovery-requiredを表す結果・state、または別のdurable recovery receipt契約が必要である。
- BLOCKER | RPC境界はget_state、prompt、abort、type=response、success、version付きevent、agent_settledを参照するが、command envelopeとresponse/eventのliteral discriminator、version field、sessionId抽出path、error shapeのclosed schemaがどの成果物にも定義されていない。strict fail-closed parserとhandshakeを実装・fixture化する際にPi 0.83.0の有効frameまで拒否する可能性があり、公開CLIがこのcall shapeを受理することもpassed contractsから検証できない。
- BLOCKER | business-logic-model.mdはprocess group/childの消滅確認を成功条件とするが、NativeHandleとPiChildProcessPortは単一PID/platform handle、signal、wait/reapしか契約化していない。process-group生成、descendant ownership、group signal、残存確認のplatform別規則がなく、Piがdescendantを生成した場合に親PIDだけをreapして孤児0件と誤判定できる。macOS/Linuxでのprocess-tree containment契約を明示する必要がある。
- FOLLOW-UP | RPC abort送信失敗後にSIGTERM/SIGKILLとreapが成功した場合、BR-PCE-021/022とresult classificationでは元のcancelled/timed-outになり得る一方、error policyはabort-failedをunknown-effectのfailedとしている。cleanup確認後の最終result優先順位を固定すべきである。
- NIT | process acceptance audit失敗はシナリオ表でaudit-failed、closed error policyではprocess-accept-audit-failedと表記が分かれている。実装・fixtureで同じclosed codeを使うよう統一すべきである。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T12:31:23Z
- **Iteration:** 2
- **Scope decision:** none

Idempotency key/fingerprint、POSIX process-group containment、abort失敗時の優先順位、error code表記は修正され、循環依存も認められない。一方、terminal audit再commitの到達可能な契約と、成功outputを構成するRPC event schemaがまだ欠落しており、failure recoveryと正常系の双方に実装不能箇所が残る。

### Findings

- BLOCKER | terminal commit失敗時にUncommittedPiChildFailureとterminal fact digestをcore recovery seamへ渡すと記載されたが、公開spawnPiChildはPromise<PiChildResult>しか返さず、PiChildResult.failedにもdigest/recovery tokenはない。ChildExecutionLifecyclePortにもpending terminalの登録・取得・recommit operationがなく、lifecycleはsettlingに残ったままduplicate reservationがin-progress拒否される。どのactorが失敗factを保持して再commitするか到達可能なAPIがないため、FR-SUB-002のaudit chainを回復できない。公開return unionまたはcore portにdurable pending-terminal/reconcile契約が必要である。
- BLOCKER | Pi RPC 0.83 wire profileはcommand responseとagent_end/agent_settledだけをliteral schema化したが、Main workflowが成功outputを収集するassistant message eventsのdiscriminator・content path・delta/final重複規則がない。agent-errorとextension-errorもclosed failure codeに存在する一方でwire shapeが未定義である。unknown typeをfail-closedにする現在の規則では正常なmessage eventを拒否するか、PiChildResult.succeeded.outputを構成できず、FR-SUB-001のresult返却を一意に実装・fixture化できない。
- FOLLOW-UP | Command failure schemaはid?: sameとしてID欠落を許す一方、strict classifierは既知correlation IDを持つresponseだけをpending commandへ配送する。IDなしfailureをcommand rejectionとして扱うのかrpc-response-invalidとして扱うのかを統一すべきである。

## Review — Iteration 3

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T12:38:46Z
- **Iteration:** 3
- **Scope decision:** none

RPC schemaとresponse ID分類は具体化されたが、terminal auditの結果決定・再commit経路と対応version契約に実装不能な矛盾が残る。

### Findings

- BLOCKER | `agent_settled`後にterminal audit commitが失敗するtraceの結果契約が矛盾する。business-logic-model.mdのterminal arbiterは最初のcauseをlatchし、後続eventはresult kindを変更せず、例外はreap不能だけと定める一方、同文書とBR-PCE-025/028はcommit失敗時に`failed(terminal-audit-failed)`を返し、successを禁止する。同じtraceが`settled`由来の`succeeded`とaudit override由来の`failed`を同時に要求するため、audit failureを含むpost-latch override順位を明示しなければNFR-REL-003を決定的に実装できない。
- BLOCKER | durable pending-terminalの再commitはまだ到達可能な実行契約として閉じていない。domain-entities.mdはstartup reconcilerがpending recordを列挙するとするが、`ChildExecutionLifecyclePort`のoperationには列挙APIがなく、Application Designのcomponent/service/Unitにもstartup reconcilerのownerや起動配線が存在しない。また`reserve`が`terminal-pending`を返したduplicate deliveryについて、`spawnPiChild`がreconcileを待つのか、成功・元結果・`terminal-audit-failed`のどれを返すのか未定義である。さらに公開署名は`PiChildProcessPorts`だけを受ける一方、Functional Designは別の`ChildExecutionLifecyclePort`を必須依存としており、その注入・集約契約も示されない。FR-SUB-002のaudit chain回復を実装者が推測せず構築できない。
- BLOCKER | 対応version契約が上流要件と一致しない。requirements.mdのFR-DOC-003とNFR-CMP-001はPi 0.83.0以上を正式対応・pass対象とするが、business-logic-model.mdは0.84以降をfixture互換性未確認なら未知profileとして拒否する。doctorが受理したversionをdriverが拒否し得るため、保証範囲を0.83.xなどへ限定するか、将来minorを受理する一意な互換性判定とdoctor/driver共通profile選択契約が必要である。
- NIT | requirements.mdの完全性表示はfunctional requirementを42件としているが、列挙およびunit-of-work-story-map.mdの集計は30件である。

## Review — Iteration 4

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T12:45:13Z
- **Iteration:** 4
- **Scope decision:** none

前回の3論点は概ね具体化されたが、driverが共通Pi profileを選択するための入力経路と、無効identityをtyped resultへ変換する契約に実装不能な欠落が残る。

### Findings

- BLOCKER | doctor/driver共通`selectPiRpcProfile(version, platform)`を要求する一方、公開`spawnPiChild(request, signal, ports)`にはPi executable path・version・platform・doctor結果がなく、`PiChildProcessPorts`にもそれらを取得するprobe portがない。Main workflowの「doctorで解決済みのPi path」は別の短命Doctor Invocationからdriverへ渡す契約や永続共有状態がpassed contractsに存在しないため、driverはprofile selectorを呼べず、暗黙global依存またはdoctorとの重複probeを推測するしかない。validated executableとversion/platform/profileを同一snapshotとして注入する契約、または共有probe portと所有pathが必要である。
- BLOCKER | request parserとBR-PCE-001は空の`executionId`/`childId`を`invalid-request`として返すことを要求するが、全`PiChildResult` variantは同じ有効なexecutionId/childIdを必須とし、domain modelはこれらを非空branded valueとして扱う。identity validationに失敗したtraceでは有効なresult identityを生成できず、raw空値を返せば不変条件違反、捏造すれば相関違反、例外を投げればtyped failure契約違反になる。admission failure専用resultでidentityをraw/nullableにするか、公開境界でvalidated requestのみ受理するpreconditionへ変更する必要がある。
- FOLLOW-UP | bounded preflight reconciliationはpaginationとownerを得たが、無関係なpending recordの`reconcilePendingTerminal`失敗時に現在のdeliveryを継続するか、どのtyped outcome・診断を返すか、cursorをどこまで進めるかが未定義である。backlogのstarvationやaudit回復失敗のsilent dropを避けるため、batch結果とfailure visibilityを固定すべきである。
- NIT | `TerminalCause`に`audit-failure`を含め、semantic cause表にもaudit failureを置く一方、確定した優先順位ではterminal audit failureはcleanup後のoverrideである。二重の分類経路を避けるため、acceptance-audit failureなどsemantic側の対象を別名で限定するか、terminal audit failureをcause unionから外すと明確になる。

## Review — Iteration 5

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T12:56:43Z
- **Iteration:** 5
- **Scope decision:** none

循環依存とterminal audit overrideの矛盾は認められないが、admission公開契約とpending reconciliationの公平性・失敗可視化に実装不能な欠落が残る。

### Findings

- BLOCKER | component-methods.mdはplain string fieldの公開`PiChildRequest`を`spawnPiChild(...): Promise<PiChildResult>`へ直接渡す契約だが、Functional Designはraw inputを別の`admitPiChildRequest(unknown)`だけが受理し、branded validated requestだけをspawnへ渡し、admission failureを`PiChildResult`外へ分離する。公開契約にはadmission entrypoint/outcomeもopaque brandもないため、空identityを含む構造値が`PiChildRequest`として型適合し、実装者は既存署名を破るか、例外・捏造identity・不変条件違反のいずれかを選ぶしかない。公開APIをadmission unionまで含めて更新する必要がある。
- BLOCKER | `PendingTerminalRecord`の定義は`lastReconcileAttemptAt`を持たない一方、business-logic-model.mdとdomain-entities.mdは同fieldの更新と`lastReconcileAttemptAt ASC, preparedAt ASC, key ASC`を公平性の根拠にする。初回値・null順序もなく、さらにcursor走査中にsort keyを更新してrecordを末尾へ移すため、snapshot semanticsなしのkeyset/offset paginationでは同一recordの再取得または後続recordのskipが起こり得る。永続failure群が後続pendingをstarveさせないというverification propertyを決定的に実装できない。field schema、初期化、安定cursor/snapshot、または1 invocation 1 pageの明示契約が必要である。
- BLOCKER | 無関係pendingのreconcile失敗を可視化する唯一の契約は`recordReconciliationFailure`だが、このoperation自体の戻り値・失敗時挙動と、呼出元へ返すstructured batch diagnosticの型がない。lifecycle/audit障害でこの記録も失敗した場合、現在deliveryを継続すると元のreconcile failureがsilent dropされ、停止するとBR-PCE-029cの「無関係failureは現在deliveryを止めない」と衝突する。NFR-REL-003を満たすため、failure-of-reportingを含むbatch outcomeとfallback visibility契約を定義する必要がある。
- FOLLOW-UP | Main workflowはruntime probeをreservationとpending-terminal preflightより先に実行するため、Pi executable/version probeが壊れているだけで既存terminal replayもaudit reconciliationも到達不能になる。新規spawn permitを得た場合だけruntime probeを要求し、duplicate/pending recoveryをPi runtime availabilityから分離するとblast radiusを抑えられる。
- NIT | business-logic-model.mdのResult classificationは`failed`へinvalid requestを含める一方、同文書とbusiness-rules.mdはinvalid requestをidentityなしの`admission-failed`として`PiChildResult`から除外している。分類文をadmission契約へ統一すべきである。

## Review — Iteration 6

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:02:15Z
- **Iteration:** 6
- **Scope decision:** none

主要な前回論点は改善されたが、restart後のresult replay、reconciliation starvation、lifecycle port failure契約に実装不能な欠落が残る。

### Findings

- BLOCKER | `PendingTerminalRecord`の列挙schemaには`originalResult`がなく、`terminalFact`も公開success outputではなくoutput digestを保持すると定義される一方、preflight/duplicate reconciliation成功時はrecord内のoriginal `PiChildResult`をreplayするとされている。BR-PCE-031もauditへの許可をoutput digestに限定するため、restart後に必須の`succeeded.output: string`を復元できない。監査用terminal factとは分離したdurableなprivate replay payload、その保持・暗号化/権限・削除契約を定義しなければ公開return contractを実装できない。
- BLOCKER | BR-PCE-029dのstarvation防止は`finishReconciliationAttempt`が成功してfresh maximum ticketを永続化できる場合にしか成立しない。同operationが`write-failed`を返した場合、設計はemergency diagnosticへ出力して現在deliveryを継続するだけで、旧ticketとleaseを更新・隔離できない。lease失効後に同じ最小ticketが再claimされ、page limit件以上のwrite-failed recordがあると後続recordは永久に到達不能となり、「finite backlogの各recordが有限invocation内にclaimされる」という明示verification propertyに反する。queue advancementを失敗記録とは独立してdurableに行うか、poison record隔離と復旧契約が必要である。
- BLOCKER | `ChildExecutionLifecyclePort`は`claimPendingTerminalBatch`、`reserve`、`recordProcessAcceptance`、`recordSessionIdentity`、`scanStaleSettling`等を公開するが、`finishReconciliationAttempt`以外のoperation failure resultを定義していない。特にhandshake後の`recordSessionIdentity`失敗にはclosed code、kill/reap、terminal preparation、公開resultの規則がなく、batch claim自体の失敗時にも必須`PiReconciliationBatchOutcome`を構成できない。FR-SUB-002の完全なaudit chainとNFR-REL-003のfailure transparencyを例外や実装者判断なしに満たせないため、各port operationのclosed success/failure unionと失敗別のspawn/cleanup/return方針が必要である。
- FOLLOW-UP | `scanStaleSettling`はprepare失敗後のunknown-effect隔離を担うとされるが、Main workflowのpreflight手順には呼出しがなく、stale判定閾値、batch上限、reserveとの順序、検出結果の公開visibilityも未定義である。安全な再spawn禁止だけでなく運用上の回復可能性を一意に実装できる契約へ具体化すべきである。
- FOLLOW-UP | Application Designの公開`PiChildResult.failed.code`は`string`のままだが、Functional Designはclosed error-code unionを要求する。公開型を列挙unionへ更新するか、closed code typeへの参照に統一し、未知codeがcompile時に混入しないようにすべきである。

## Review — Iteration 7

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:08:56Z
- **Iteration:** 7
- **Scope decision:** none

前回論点の修正は概ね反映されたが、early failureを監査済みterminalへ収束させるstate transitionとport契約が矛盾している。

### Findings

- BLOCKER | domain-entities.mdでは`reserved`、`process-starting`、`process-accepted`、`rpc-ready`、`prompt-pending`から`terminal`への直接遷移だけを許し、`terminal-pending`は`settling`からしか生成できない。一方、business-logic-model.mdはruntime probe、spawn、process acceptance audit、handshake等のearly failureも`prepareTerminal`→`commitPreparedTerminal`で記録することを要求し、`prepareTerminal`は`terminal-pending`を生成すると定義する。portには直接terminal commit operationもなく、実装者はstate invariantかFR-SUB-002のterminal audit chainのどちらかを破る必要がある。全active stateから`settling`/`terminal-pending`への遷移を定義するか、early-terminal専用のatomic operationとreplay契約を追加する必要がある。
- FOLLOW-UP | `prepareTerminal`失敗後のstale `settling`は`scanStaleSettling`で検出・隔離し「人手reconciliation対象」とされるが、passed contractsには解決・clear・terminal確定を行うoperationがない。`reconcilePendingTerminal`は`terminal-pending`専用で、`clearQuarantine`はpoison pending record用であるため、同じkeyは永久にreserve拒否となる。安全性を保ったoperator recovery契約を明示すべきである。
- FOLLOW-UP | business-rules.mdはclosed error codeを表の集合へ限定するが、公開`PiChildFailureCode`の`delivery-in-progress`、`session-identity-audit-failed`、`lifecycle-reserve-failed`、`pending-terminal-read-failed`、`stale-settling-scan-failed`が表に存在せず、`PiReconciliationBatchOutcome.completed.failures.code`も`string`のままである。公開union、分類、retry ownership、batch failure型を同じclosed集合へ統一すべきである。

## Review — Iteration 8

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:14:37Z
- **Iteration:** 8
- **Scope decision:** none

early failure遷移とclosed error集合は改善され循環依存も認めないが、stale active stateの回復とreplay payloadのack/purge経路が到達不能である。

### Findings

- BLOCKER | `enterSettling`のmetadata失敗ではpayloadを削除して`reserved`〜`running`のsource active stateを保持し、process crashでも同じpre-settling stateが残り得る。一方、全nonterminal stateを対象とする唯一の回復API `recoverStaleExecution(key, expectedCandidateDigest, decision)` はcandidate digestとpayload検証を必須とするため、candidate digestを一度も永続化できなかったstateには呼び出せない。reserveは同じkeyのspawnを永久拒否するので、この再現可能なtraceをterminalへ収束できず、BR-PCE-029f/029gとfailure transparencyを実装できない。pre-settling state向けのCAS recovery decisionと証拠schemaが必要である。
- BLOCKER | parentによるreplay payload acknowledgmentは`acknowledgeChildResult(idempotencyKey, resultDigest)`を要求するが、公開`PiChildExecutionResponse`は`PiChildResult`とbatch outcomeしか返さず、result digest・terminal receipt・ack tokenを公開しないうえ、result digestのcanonical byte schemaも定義されていない。parentはresult取込み後の正しいackを決定的に構成できず、BR-PCE-037どおりのacknowledged判定と安全なarchive purgeに到達できないため、秘密を含み得るpayloadが永久保持されるか、推測digestによる誤削除になる。opaque acknowledgment handleを返すか、canonical digest生成APIとparentから到達可能なack契約を公開する必要がある。

## Review — Iteration 9

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:20:55Z
- **Iteration:** 9
- **Scope decision:** none

acknowledgment経路と回復unionは追加され循環依存も認めないが、post-spawn crash、process未生成terminal、quarantine参照失敗の各経路が安全かつ一意に閉じていない。

### Findings

- BLOCKER | `process-starting`永続化後、detached childのspawn成功直後かつ`recordProcessAcceptance`前にdriverがcrashすると、lifecycleにはPID/PGIDもcandidate digestも残らない一方でchildは生存し得る。追加された`pre-settling-finalize`はnative handleをnullableにしたまま`processExtinction: confirmed`を要求するが、handleもargv上の相関identityもないprocessを識別して消滅確認する証拠生成・検証契約がない。このtraceでは永久隔離するか、生存childを見落としてterminalizeするしかなく、BR-PCE-023/029hとnative process高々1件を実装できない。spawn前後をrecoverableにする永続handle予約、親死亡時に確実に消滅するcontainment、またはhandleなしでも対象processへ結び付く検証可能なevidence schemaが必要である。
- BLOCKER | runtime probeの`pi-not-found`・unsupported、またはspawn failureはprocess 0件のcandidateとして`settling → terminal-pending → terminal`へ進む一方、domain `terminal`はgroup reap observationを必須とし、BR-PCE-023は全resultでleader reapと`kill(-pgid,0)=ESRCH`の確認を要求する。PID/PGIDが存在しないtraceではこの不変条件を満たせず、架空のprocess observationを作るかterminal auditを断念するしかない。process dispositionに`not-started`を追加し、group extinction確認をpositive native handle取得後だけの条件にする必要がある。
- BLOCKER | preflight必須operationの`EmergencyDiagnosticPort.listQuarantinedKeyDigests()`がclosed failureを返した場合のcode、batch outcome、reserve/spawn可否がfailure matrixとbusiness rulesに存在しない。失敗を無視すればpoison recordを再claimしてstarvation・failure不可視化を起こし得るが、停止する場合もどの公開結果へ写像するか実装者判断になる。NFR-REL-003を満たすため、この失敗を明示的な`visibility-failed`へ写像してclaim/reserve/spawnを禁止する等の一意な契約が必要である。

## Review — Iteration 10

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:27:21Z
- **Iteration:** 10
- **Scope decision:** none

前回3論点は修正され具体的な循環依存も認めないが、reserved状態の回復不能経路とquarantine迂回経路が残る。

### Findings

- BLOCKER | `reserve`が`new`を永続化した直後、`recordLaunchIntent`前にdriverがcrashすると、stateは`reserved`、native handle・launch nonce・manifestはすべて不存在となる。ところが`StaleExecutionRecoveryRequest.pre-settling-finalize`はpositive handleの`ProcessExtinctionEvidence`またはhandleなし`process-starting`の`PiNotStartedEvidence`しか受理せず、`reserved`を安全にterminalizeする証拠variantがない。reserveは同keyの再spawnを拒否するため、このprocess 0件traceは永久にactiveとなり、BR-PCE-029g、stale recovery property、NFR-REL-003を満たせない。state-version付きのno-launch-intent evidenceなど、`reserved`専用のCAS recovery契約が必要である。
- BLOCKER | poison recordのkey digestはpreflight batch claimから除外され、明示clearまで再claim不可と定められる一方、今回のdeliveryが同じkeyの場合の経路が閉じていない。preflight後の`reserve`は依然`terminal-pending`を返し、business-logic-modelはquarantine照合なしに同keyを同期`reconcile`するため、BR-PCE-029eとdomainの「明示clearだけが再claimを許す」を迂回する。公開reservation/result unionにもquarantined-current-keyを表す結果がなく、実装者は隔離を破って再試行するか未定義codeで停止するしかない。derived key digestをquarantine setと照合して同期reconcileを禁止し、一意なtyped outcomeへ写像する契約が必要である。
- FOLLOW-UP | BR-PCE-007はdriver invocationごとにruntime snapshotを取得すると定めるが、business-logic-modelは`new` permit時だけprobeし、terminal replayとpending recoveryをPi runtime availabilityから分離する。Piが欠落したduplicate deliveryの結果がreplayかenvironment failureかで分岐するため、ruleをnew permit限定へ統一すべきである。

## Review — Iteration 11

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:34:52Z
- **Iteration:** 11
- **Scope decision:** none

前回3論点は修正され循環依存も認めないが、quarantine照合のTOCTOUによりcurrent deliveryが隔離を迂回できる。

### Findings

- BLOCKER | current keyのquarantine照合がpending batchより前の一度だけであり、照合後に同じcurrent keyのterminal-pending recordがbatch内または並行invocationでpoison quarantineへ追加されると、その後のreserveまたは同期reconcileへ進めてしまう。batch outcomeのfailure.keyDigestとの再照合だけでも同一invocation内は防げるが並行追加は防げないため、reserveとterminal-pending同期reconcileの各境界でquarantine非存在を原子的に検証するfence/CAS契約、または同等の直列化を定義し、追加後は必ずnon-acknowledgeable failed(reconciliation-quarantined)へ短絡する必要がある。現状はBR-PCE-029kと「quarantine中はreserve/reconcile 0」の検証propertyを競合実行で満たせない。

## Review — Iteration 12

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:37:34Z
- **Iteration:** 12
- **Scope decision:** none

quarantineのTOCTOUは閉じたが、reconciliation leaseとQuarantineFenceの逆順取得によるデッドロック経路が残る。

### Findings

- BLOCKER | pending batchはrecordのReconciliationLeaseをclaimした後、lifecycle write failure時にquarantinePoisonのQuarantineFenceを取得するため取得順が lease→fence になる。一方、current deliveryはfenceを保持したままterminal-pending同期reconcileを実行し、そのreconcileが同じrecordのlease取得または解放待ちを必要とするため fence→lease となる。両者が競合するとbatchはfence待ち、同期reconcileはlease待ちとなり停止できる。全経路を fence→lease の単一順序へ統一するか、fence保持中の同期reconcileを非待機claimとして失敗時にfenceを解放してtyped retryへ戻すなど、待機禁止・解放・結果契約を明記し、競合propertyにデッドロック不在を追加する必要がある。

## Review — Iteration 13

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:39:04Z
- **Iteration:** 13
- **Scope decision:** none

前回のlease/fence逆順待機は型分離と非待機current reconcileで解消され、全体にも循環依存・契約矛盾・実装不能・上流要件漏れを認めない。

### Findings

- None
