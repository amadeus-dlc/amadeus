# Pi Lifecycle / Gate Adapter — Security Design

## 適用範囲

本設計はPi 0.83.0以上の公開Extension API eventを既存coreのhook、audit、sensor、state validation、human-presence、continuationへ橋渡しする境界を保護する。engine-resolved inputは `business-logic-model` のみであり、条件付きの `security-requirements` / `tech-stack-decisions` は期待どおり不在である。新しい要件やcloud componentは作らない。

child RPC process、setup transaction、foundation packaging、doctor probe、formal evidenceは各所有Unitの責務であり、本adapterへ重複させない。

## Trust model

### Trust boundaries

| Boundary | Trusted fact | Untrusted or sensitive input |
|---|---|---|
| Pi public Extension API | 0.83+ captured profileに一致するevent kind/source/order | event body、unknown field、malformed discriminator |
| Adapter registration | structural parse済みAPI/port集合とclosed registration gate | partial registration、duplicate API instance |
| Core commit port | durable `CanonicalCommitReceipt` とsubreceipt | journal内の自己申告success |
| Pi session store | current session IDとnative custom entry enumeration | message本文、別sessionのtoken |
| Core state resolver | active intent UUID、stage、state version、gate state | compaction summary、custom message本文 |
| Machine-local runtime root | owner-only regular fileとAEAD検証済みpayload | symlink、foreign owner、tampered ciphertext |

Pi extensionは承認後に同一OS user権限で動くためsandboxではない。adapterは同一userによるruntime/module改ざんを防ぐsecurity boundaryを主張しない。一方、通常経路のRPC/extension input、malformed native event、replay、crash、session replacement、filesystem tamperは攻撃・故障入力として扱う。

## Registration and capability integrity

`registerAmadeusPiExtension`はPi API、core ports、journal、state resolver、session APIをclosed schemaでparseする。unknown capabilityを成功とみなさず、Pi profile/version mismatchではworkflow-changing handlerを有効化しない。

1. 同じExtension API object identityへの二重登録をmodule-local registryで拒否する。
2. handler closureはclosed `RegistrationGate`をcaptureし、登録途中ではworkflow mutationを行わない。
3. read-only status/doctor commandと全mandatory handlerの登録が完了した後だけgateを一度openする。
4. 途中failureではgateをclosedのまま保持し、既に登録されたhandlerが呼ばれてもtyped blocked resultだけを返す。
5. session replacement時は古いcontext/epoch viewを破棄し、`session_start`からportsとidentityを再解決する。

partial success、capability omission、unsupported versionからsingle-agent modeへのsilent fallbackは禁止する。

## Human presence provenance

Pi 0.83+ public APIの `input.source` をnative provenanceとして使用する。

- exact `interactive`のみ `mintHumanTurnOnce` へ進める。
- `rpc`、`extension`、欠落、unknown、型不正はHUMAN_TURN=0、GATE_APPROVED=0とする。
- message本文、選択肢の数字、TTY有無、時刻、session custom entryからhumanを推定しない。
- adapterはraw input eventを外部moduleから注入できるpublic APIを公開しない。
- gate approvalはadapterではなくcoreがdurable HUMAN_TURN receiptと現在gate stateから判断する。

same-user malicious extensionがPi runtimeそのものを改ざんする脅威はnative trust境界外である。それでも別extensionが通常の `source=extension` で同じ本文を送るnegative fixtureではhuman receiptが必ず0になることを検証する。

## Canonical identity and replay protection

Functional Designのevent-kind別 `eventKey` schemaをversion付きcanonical bytesとして実装し、fingerprintはsafe factのlength-prefix serializationをSHA-256化する。

- 同一key・同一fingerprintは保存済みreceiptを返す。
- 同一key・異なるfingerprintはprotocol conflictとしてhealthをblockedにする。
- hashは機密化ではないため、secret、prompt、image、tool args/result、absolute pathをhashしてauditへ載せるだけの設計は禁止する。
- key schema version、Pi profile、session epoch、cycle/attempt ordinalを混同せず、正当な次eventとnative replayを区別する。

`PiBridgeJournal`はwrite-ahead recovery sourceだが成功のauthorityではない。core副作用の成功は `CanonicalEventCommitPort.commitOnce` が返すdurable `CanonicalCommitReceipt`だけで確定する。receiptはaudit、各sensor、state validationのderived idempotency key/subreceiptを持ち、crash後は未完了suboperationだけを再開する。

## Journal and private payload protection

### Metadata / payload separation

journal metadataへ保存できるのはschema version、event key/fingerprint、session/epoch/cycleのopaque ID、safe enum、digest、relative workspace path、commit/outbox state、receipt referenceだけである。次はmetadata、audit、diagnostic、custom message detailsへ保存しない。

- user prompt、image bytes、assistant本文
- full tool args/result、provider response
- home/absolute path、username
- API key、OAuth token、SSH key、provider credential

raw payloadがcrash recoveryに必要なtool lifecycleに限り、`PiSealedPayloadVault`へ分離する。vaultはmachine-local runtime rootに置き、0600相当のowner-only regular file、no-follow `lstat`、same-directory temporary write、fsync、atomic renameを使う。master keyはrepository外のowner-only file、record keyはHKDF、cipherはAES-256-GCM、AADはschema/eventKey/fingerprint/payload digestへ束縛する。

鍵欠落、foreign owner、symlink、AEAD不一致、digest mismatchではpayload unavailableとしてblockedにし、raw bytesをdiagnosticへfallbackしない。retention/ack後のpurgeはexplicit core policyで行い、commit failure時のbest-effort cleanupでrecovery payloadを失わない。

## Durable health latch

`ExtensionHealthLatch`はsession/epoch、first failure code、affected event key digest、remediation、last successful reconciliation receiptをmachine-local durable stateとして持つ。最初のmandatory failureを保持し、後続errorで原因を上書きしない。

blocked中に許可するのはread-only status/doctorだけである。input presence、tool execution、continuation、compaction reinjection、stage mutationは拒否する。自動unblockは同一session/epochで次をすべて確認した場合だけ許可する。

1. journal pendingがcore receiptへreconcile済み。
2. continuation outboxが `turn-observed`、mission outboxが同一sessionで `entry-appended`、または各outboxが不要。
3. identity conflict、vault tamper、session mismatchが残っていない。
4. core state validationが成功し、reconciliation receiptをdurableに保存した。

operatorがstate fileを削除しただけでhealthyとみなさず、修復不能ならfresh session/remediationを明示する。

## Continuation and mission outbox security

outboxはCSPRNG delivery token、target session ID、schema/version、directiveまたはmission digest、delivery stateを持つ。continuation stateは少なくとも `prepared | entry-appended | turn-observed | blocked-ambiguous`、mission stateは `prepared | entry-appended` を区別する。tokenはcorrelation値でありauthorizationではない。

- delivery前にcurrent session IDを再取得し、targetとexact matchしなければ送信しない。
- current session entryだけをbounded scanし、同tokenのcustom entryが既にあればcontinuationを `entry-appended`、missionを完了へ進める。continuationはこの時点でdelivered/turn実行済みとmarkしない。
- 別sessionで見つかった同tokenを成功根拠にせず、別sessionへoutboxを転送しない。
- continuationは `triggerTurn:true`、compaction missionは `triggerTurn:false` のclosed policyとする。
- message detailsはopaque token、schema、safe digestだけを持ち、raw directive/mission、prompt、absolute record pathを入れない。
- 受信message単独でgate承認、stage advance、HUMAN_TURN mintを行わず、coreがfresh stateからdirectiveを決める。

### Continuation turn activation receipt

`sendMessage(triggerTurn:true)` のreturnやcustom entry appendは、agent turn開始の証拠ではない。`PiContinuationOutbox`は次の二段階receiptを使う。

1. append後にcurrent active pathからcustom entry ID、token、session IDを再読し、`entry-appended` receiptを保存する。
2. 次のnative `agent_start`で `PiCycleReducer` がactive path上のnearest unconsumed `amadeus-continuation-v1` entryを解決し、entry ID/token/session ID、新cycle ID/attempt ordinalを束縛した `CONTINUATION_TURN_OBSERVED` をcoreへ `commitOnce` する。
3. durable turn receiptのcommit後だけoutboxを `turn-observed` とし、FR-LIF-004上のcontinuation実行済みと扱う。agent start duplicateは同receiptを返す。

custom entry append後からturn receipt commit前にprocessが停止した場合、session startはtoken存在だけで完了扱いせず `blocked-ambiguous` にする。自動再送はturn二重実行、自動markはturn欠落を生むため、どちらも禁止する。read-only doctorは同一session、entry ID、token digest、観測済みcycleの有無を示す。

明示的なoperator recoveryだけが次へ進める。re-armは、Pi process generationが変わり旧in-memory trigger queueが消滅したこと、active pathに当該entryがあること、そのentry以後のnative agent cycle/assistant entryおよびcore turn receiptが0であることをproduction probeが証明できる場合に限り、旧outboxを `superseded-without-turn` としてcoreへcommitして新delivery tokenを発行する。いずれかを証明できなければ再送せずblockedを維持する。このrecovery操作自体はHUMAN_TURNやgate approvalをmintしない。

session entry enumeration unavailable、token conflict、append verification failureではoutboxをpendingのままhealthをblockedにする。adapter内の無限retry loopは禁止する。append前の `prepared` だけは次回 `session_start` reconciliationが再配送できる。`entry-appended` だがturn未観測のcontinuationは自動再配送せず、上記の証拠付きoperator recoveryだけを許可する。

## Tool lifecycle controls

`tool_call`、`tool_execution_start`、`tool_execution_end`はsession epoch、cycle、attempt ordinal、toolCallId、tool nameで厳密に対応させる。

- unknown/mismatch end、同一key異内容、startなしendはprotocol failure。
- full input/args/resultはephemeral memoryまたはsealed payloadだけに置き、auditへ渡すのはtool name、relative path、digest、isErrorである。
- `tool_execution_update`はbounded diagnostic digestだけで、audit/sensor/state triggerにしない。
- Pi `tool_result`はresult変換用eventであり、PostToolUseを二重dispatchしない。
- core commit failure時はpending journal/receipt/payloadを保持し、後続tool/input/continuationをblockedにする。
- duplicate endは同じreceiptを返し、完了済みsensor/audit/state operationを再実行しない。

tool resultに含まれるANSI、control character、巨大文字列、secret canaryはbounded redactorを通し、redaction failure時にraw fallbackを行わない。

## Compaction recovery controls

`session_before_compact`はactive intent UUID、stage、state version、mission digestをcore state resolverから取得してcheckpointする。Pi summary本文は信頼しない。resolver/journal failureでは `{cancel:true}` を返し、checkpointなしcompactを成功扱いしない。

`session_compact`は対応attempt IDとnative compaction entry IDを照合し、fresh core stateからbounded mission envelopeを構成する。overflow `willRetry=true`でもPi自身のretryだけを使い、extensionは追加turnを起動しない。重複eventでは同token entryが高々1件となる。

mission envelopeの容量上限超過、state mismatch、session replacementではtruncateして意味を変えずblockedにする。要約だけからintent/stageを推測してworkflowを継続しない。

## Threat matrix

| Threat / failure | Control | Negative verification |
|---|---|---|
| RPC/extension inputでgate承認 | exact native `interactive`のみpresence | source mutation全値でHUMAN_TURN=0 |
| partial handler registration | closed registration gate、all-or-nothing open | 各registration step failureでmutation 0 |
| journalをsuccess authorityに偽装 | durable core receipt/subreceipt | core commit境界crashで副作用各1 |
| event replay/conflict | versioned key + fingerprint | same/sameはduplicate、same/differentはblocked |
| raw prompt/tool payload漏洩 | metadata separation + AEAD vault + redactor | canary scanでaudit/diagnostic/custom details 0件 |
| symlink/foreign vault file | no-follow、owner/type check、AEAD | symlink/owner/tamper fixture拒否 |
| continuationを別sessionへ配送 | target session binding + current-entry scan | replacement後append 0、blocked 1 |
| entry appendをturn開始と誤認 | `entry-appended` / `turn-observed` receipt分離 | append/queue/start直前crashで自動完了0・自動再送0 |
| tokenを権限として再利用 | core fresh-state decision only | custom messageだけでstage/gate変化0 |
| tool end二重dispatch | strict matching + commitOnce receipt | duplicate/`tool_result`併発でPostToolUse各1 |
| compaction summary injection | core checkpoint/resolver only | forged summaryでintent/stage変化0 |
| overflow時の二重turn | mission `triggerTurn:false` | Pi retry + extension trigger count = 0 |
| health file削除でsilent recovery | durable reconciliation evidence | pending/conflict存在時healthy 0 |

## Failure policy

| Failure | Result | Allowed behavior |
|---|---|---|
| schema/version/source invalid | typed protocol failure | read-only diagnosticのみ |
| duplicate API registration | registration blocked | second handler set有効化0 |
| journal/vault/core commit failure | durable health blocked | pending保持、workflow mutation 0 |
| identity conflict | event conflict | replay/継続0、operator remediation |
| target session mismatch | outbox blocked | cross-session append 0 |
| native entry verification unavailable | delivery unverified | retry loopなし、pending保持 |
| checkpoint/resolver failure | compaction canceled/blocked | summary fallback 0 |

## Verification gate

- captured Pi 0.83 fixturesで全mandatory event discriminator、source、orderingをproduction parserへ通す。
- interactive/rpc/extension/unknown/missing sourceをmutationし、presence/gate receipt数を検査する。
- registrationの各stepでfailureを注入し、gate openとworkflow mutationが0であることを確認する。
- journal reserve、各core subreceipt、journal complete、outbox append/markの全crash境界を再起動し、副作用高々1をproperty testする。
- real filesystemでowner/mode、symlink、ciphertext/tag/digest tamper、key lossを検証する。
- session replacementとtoken collisionで別session deliveryが0であることを確認する。
- continuationのappend直後、native trigger queue直後、`agent_start`直前、turn receipt commit前にcrashし、entryだけではdeliveredにならず、自動再送も0であることを確認する。turn観測後のduplicate startではturn receiptとengine continuationを各1にする。
- explicit re-armはprocess generation変更、same-session active-path entry、entry後native cycle/assistant/core receipt 0の全証拠があるfixtureだけ成功し、1条件でも不明ならappend/turn 0でblockedを維持する。
- tool start/end mismatch、duplicate、`tool_result`併発、update floodを検証する。
- manual/threshold/overflow compactionとforged summaryで、core checkpoint由来message高々1、overflow追加turn 0を確認する。
- prompt/image/tool/credential/home-path canaryがaudit、journal metadata、diagnostic、custom detailsで0件であることをscanする。

検証はfixture内の自己申告 `valid` や単純event件数ではなく、durable receipt、core state、actual session entries、audit/sensor recordsから判定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:54:15Z
- **Iteration:** 1
- **Scope decision:** none

core commitのexact-once境界は閉じているが、continuation outboxがmessage appendをturn実行済みと誤認するクラッシュ窓が残る。

### Findings

- BLOCKER | continuation recoveryはsame-session entryにopaque tokenが存在すればoutboxをdeliveredへ進めて再送しないが、`sendMessage(triggerTurn:true)`によるcustom entry append後から実際のagent turn開始前にPi processが停止する境界を識別できない。次session startではtoken検出だけで完了扱いとなり、必要なcontinuationが0回になる一方、無条件再送すれば2回になり得るためFR-LIF-004を満たせない。Pi 0.83+のpublic contractとしてappendとturn開始が再起動をまたいで不可分・durableであることを実証して依存条件にするか、outboxへtokenに結び付いたnative agent_start/cycle receiptを追加して`entry-appended`と`turn-observed`を分離し、未観測時のidempotent re-armまたはfail-closed manual recovery契約を定義する必要がある。append直後、trigger queue直後、agent_start直前のcrash fixtureも必要である。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:56:38Z
- **Iteration:** 2
- **Scope decision:** none

message appendとcontinuation turn観測がdurable receiptで分離され、曖昧なcrash境界は自動完了・自動再送せずfail-closedとなるため、既知のexact-once欠落は解消されている。

### Findings

- None
