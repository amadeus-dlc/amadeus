# pi-lifecycle-gate-adapter — Business Logic Model

## 目的と責務境界

本UnitはPi 0.83.0以上の公開Extension API eventを、Amadeusの既存core hook、audit、state validation、sensor、human-presence、continuation契約へ変換する。Pi固有のevent discriminatorとsession APIはoverlayに閉じ、gate判定、stage routing、state transition、sensor applicabilityはcoreに残す。

すべてのmandatory eventはwrite-ahead `PiBridgeJournal`で受理を確定してからcoreへ渡す。native handler失敗を成功へ変換せず、最初の必須failureで`ExtensionHealthLatch`をdurableにblockedへ遷移させる。blocked中も明示read-only status/doctor portだけは使用できる。

## Registration workflow

1. `registerAmadeusPiExtension(pi, ports)`はraw API/portsをstructural parseし、Pi public `on`、`sendMessage`、`appendEntry`と、journal、core hook、presence、continuation、record resolver、read-only diagnostic portを検証する。
2. module-local registryで同じExtension API instanceへの重複登録を拒否する。handlerはすべて閉じた`RegistrationGate`をcaptureし、gateがclosedの間はworkflow mutationを行わない。
3. read-only `amadeus-status` / `amadeus-doctor` commandを独立portへ登録する。続いてsession、input、agent、tool、compactionの全handlerを登録する。途中failureではgateをclosedのままにし、`BlockedOutcome`を返すためpartial registrationは有効化されない。
4. 全登録成功後にgateを一度だけopenし、capability setと`pi-extension/0.83+` profileを持つ`registered`を返す。handler closureはsession replacement後の古いcontextを再利用しない。

## Canonical event identity and commit

すべてのmandatory eventは、handlerが状態付きidentity reducerから`{eventKey, fingerprint}`を得てからjournalへreserveする。keyは下表のversioned canonical bytesをSHA-256化した値、fingerprintは示したsafe factをlength-prefixしてSHA-256化した値である。同一key・同一fingerprintは保存済みreceiptを返し、同一key・異なるfingerprintは`event-identity-conflict`としてhealthをblockedにする。

| Native event | Event key schema | Fingerprint facts |
|---|---|---|
| `session_start` | `pi-session-start/v1 + sessionId + epochId` | reason、session/cwd/previous file digest |
| `session_shutdown` | `pi-session-shutdown/v1 + sessionId + epochId` | reason、target session file digest |
| `input` | `pi-input/v1 + sessionId + epochId + baseLeafId + source + streamingBehavior + contentDigest` | 同じcanonical safe facts |
| `agent_start` | `pi-agent-start/v1 + epochId + cycleId + attemptOrdinal` | event kindとcycle attempt identity |
| `agent_end` | `pi-agent-end/v1 + epochId + cycleId + attemptOrdinal` | message digestとcycle attempt identity |
| `agent_settled` | `pi-agent-settled/v1 + epochId + cycleId` | event kindとcycle identity |
| `tool_call` | `pi-tool-call/v1 + epochId + cycleId + attemptOrdinal + toolCallId` | tool nameとinput digest |
| `tool_execution_start` | `pi-tool-start/v1 + epochId + cycleId + attemptOrdinal + toolCallId` | tool nameとargs digest |
| `tool_execution_end` | `pi-tool-end/v1 + epochId + cycleId + attemptOrdinal + toolCallId` | tool name、args/result digest、isError |
| `session_before_compact` | `pi-compact-before/v1 + epochId + compactionAttemptId` | reason、willRetry、base leaf、cycle attempt、preparation digest |
| `session_compact` | `pi-compact-after/v1 + epochId + compactionEntry.id` | reason、willRetry、fromExtension、checkpoint attempt ID |

`tool_execution_update`はmandatory state transitionではなくbounded diagnosticであり、canonical commit対象にしない。journal reserve後のcore処理は`CanonicalEventCommitPort.commitOnce(eventKey, fingerprint, event)`だけを通す。このportは`committed(receipt) | duplicate(receipt) | conflict | failed`を返し、同じeventのcore副作用をdurableに再開できる唯一の境界である。

`CanonicalCommitReceipt`はaudit、各sensor、state validationごとのderived idempotency keyとsubreceiptを持つ。coreはeventKey/fingerprintをdurableにprepareし、未完了suboperationだけを実行して最後にcommittedへ遷移する。core成功後かつjournalの`core-committed`更新前にcrashしても、replayは既存receiptを返すか未完了suboperationだけを再開し、完了済みaudit/sensor/state mutationを繰り返さない。journalとcore storeを単一transactionと仮定しない。

## Session lifecycle

1. `session_start`で`ctx.sessionManager.getSessionId()`、session file digest、cwd digest、reason、previous file digestをparseする。絶対pathはauditへ渡さない。active epochがなければdurable reducerがCSPRNG `EpochId`をopenする。active epochへの同一fingerprint startは同じkeyを再利用し、異なるstartは旧epochを`inferred-unclosed-epoch`でreconcileしてから新epochをopenする。
2. journalの同epoch未完了eventとcontinuation/mission outboxを先にreconcileする。target session IDが異なるoutboxは配送せずoperator-visible blockedにする。全replay成功後だけhealthをhealthyにできる。
3. version付き`SESSION_STARTED` canonical eventをcoreへidempotently commitし、start receiptをepochへ保存する。duplicate startは同じreceiptを返す。
4. `session_shutdown`はsession ID、epoch、reason、target session digestをjournalへ先行記録し、canonical endをcommitする。handler完了前のprocess exitではpending journalを次のstartが回収する。観測不能crashは次のstartが既存core reconciliationへ`inferred-unclosed-epoch`として渡す。
5. `new | resume | fork | reload`では古いsession-bound contextを破棄し、新しい`session_start`からidentityとport viewを解決し直す。

## Interactive presence

1. `input` handlerはprofile schema、registration/health、session epochを検証する。blockedならrecognized read-only command以外を`handled`にし、check IDとremediationを表示する。
2. source=`rpc | extension`はpresenceをmintせず`ignored-non-human` receiptをjournalへ記録して`continue`を返す。自動RPC入力はHUMAN_TURN/GATE_APPROVEDを生成しない。
3. source=`interactive`では、session ID、受理前leaf ID、source、streaming behavior、text/imageのcanonical digestから`pi-input/v1` delivery keyを作る。本文・image・絶対pathはjournal/auditへ保存しない。
4. `presence.mintHumanTurnOnce(deliveryKey, sessionId, leafId)`を呼び、`minted | duplicate`だけで`continue`する。failureはhealthをblockedにして`handled`を返す。意図的な次のinputはPiが前の受理messageをsession treeへ追加した後に発火するためbase leafが変わり、同じ本文でも別deliveryになる。この順序を0.83 captured fixtureでformal-support条件として固定する。
5. gate承認はadapterが決めない。coreはHUMAN_TURN receiptと現在gate stateを検証し、回答内容を通常inputとして処理する。

## Agent cycle and exactly-once continuation

1. 最初の`agent_start`でsession epochに`SettlementCycleId`と`attemptOrdinal=1`をdurableにopenする。attempt stateは`running | ended`である。running中の同一fingerprint `agent_start`はduplicate、matching `agent_end`がendedへ遷移した後の次の`agent_start`だけが同cycleのordinalを増やす。retry、overflow compaction、queued messageに伴うstartはこの明示規則で正当な次attemptとして区別する。
2. `agent_settled`はopen cycleがある場合だけ受理する。event自身にIDがないためcycle IDをnative delivery identityとし、cycleを`settled`へCASする。open cycleなしは直前settledのduplicateなら同receipt、それ以外はtyped protocol failureである。
3. `continuation.prepareOnce(cycleId, sessionId)`はengine stateを読み、`not-needed` receiptまたはtarget session付き`ContinuationOutbox`をatomicに作る。stage routingやgate判定はこのcore operationだけが行う。
4. prepared outboxは`customType=amadeus-continuation-v1`、opaque delivery token、directive digestをdetailsに持つPi custom messageとして`sendMessage(..., {triggerTurn:true})`で配送する。配送前に同tokenのsession entryを走査し、既存なら再送せずdeliveredへ確定する。
5. crash before appendはpending outboxを同sessionの次startが再送する。append後/mark前のcrashはsession entry tokenを検出してmarkだけ行う。別sessionへの転送、native duplicateからの二重turn、adapter内retry loopは禁止する。
6. delivery/verification failureはoutboxを保持しhealthをblockedにする。operator remediation後のsession start reconciliationだけが再配送できる。

## Tool lifecycle bridge

1. `tool_call`はhealth latchとschemaを検証し、blockedなら`{block:true, reason}`を返す。healthy時はversioned event identityをreserveして`commitOnce`経由でcore PreToolUse guardへtool name、call ID、ephemeral inputを渡すが、adapterはinputを変更しない。
2. `tool_execution_start`は`{sessionEpoch, toolCallId, toolName}`をkeyにpending executionを作る。full argsはmachine-local encrypted journal payloadにだけ置き、auditにはtool名、relative workspace path、digestだけを投影する。
3. `tool_execution_update`はaudit/sensor triggerにせず、bounded diagnostic digestだけを任意記録する。
4. `tool_execution_end`はstartのcall ID/tool名とexact matchし、result/isErrorをsealed payloadへ追加して`commitOnce(eventKey, fingerprint, PostToolUseFact)`へ渡す。coreはaudit、applicable sensor、state validationの各derived idempotency keyを順にcommitし、1個のdurable receiptへ集約する。Piの`tool_result`はresult変換用eventであり、このbridgeから二重dispatchしない。
5. end重複はreceipt replay、同一key異内容またはunknown/mismatch endはprotocol failure。core failureではjournalとcore prepared receiptを保持してhealthをblockedにし、次のtool/input/continuationを禁止する。reconciliationは未完了suboperationだけを再開し、replay完了まで成功扱いしない。

## Compaction recovery

1. `session_before_compact`でopen attemptがなければCSPRNG `CompactionAttemptId`をtransactionalに作り、reason=`manual | threshold | overflow`、willRetry、session/cycle、base leaf、active intent UUID、stage、state version、mission digestを`CompactionCheckpoint`へ保存する。同じfingerprintの再配信はopen attemptを再利用し、異内容はconflictにする。record resolverまたはjournal writeが失敗した場合は`{cancel:true}`を返す。
2. `session_compact`は対応checkpointと`compactionEntry.id`を照合する。Pi summary本文からintent/stageを推測せず、active-intent cursorと`amadeus-state.md`をcore resolverで再読する。
3. fresh stateからbounded `MissionRecoveryEnvelope`を作り、`amadeus-recovery-v1` custom messageを`triggerTurn:false`でsessionへ追加する。delivery tokenをsession entryで照合するoutbox protocolはcontinuationと同じである。
4. overflow `willRetry=true`ではPi自身のretryを使い、extensionは追加turnをtriggerしない。manual/thresholdでは次の通常turnがenvelopeを読む。重複compactは同じcompaction entry IDでmessage高々1件となる。
5. reinjection failureはhealthをblockedにし、要約だけを信頼したworkflow continuationを禁止する。

## Failure and concurrency scenarios

| Scenario | Expected behavior |
|---|---|
| duplicate interactive input delivery | 同じbase leaf/digest keyでHUMAN_TURN=1、2件目はduplicate receipt |
| 同文を次turnで再入力 | base leafが異なるため別HUMAN_TURN |
| RPC/extension input | HUMAN_TURN=0、gate approval=0 |
| 同一event key・異なる内容 | fingerprint conflict、health blocked、core副作用=0 |
| `agent_end`後にretry/compaction | open cycle維持、continuation=0 |
| duplicate `agent_settled` | cycle CAS/outbox tokenによりengine continuation/Pi turn各高々1 |
| crash before/after continuation append | pending outbox再送、またはsession token検出でmarkのみ |
| tool endの各core commit境界でcrash | 完了済みsubreceiptは再実行せず、未完了だけ再開、各副作用高々1 |
| compaction checkpoint failure | compaction cancel、既存context維持 |
| overflow compaction | mission message 1件、Pi retryだけ、extension triggerTurn=0 |
| partial handler registration | registration gate closed、workflow mutation=0、read-only診断可 |
| session replacement | old contextを使用せず、新session IDのstartから再解決 |

## 上流トレーサビリティ

`unit-of-work`のlifecycle/gate ownership、`unit-of-work-story-map`のSCN-003/004、`requirements`のFR-LIF-001〜006・FR-GAT-001〜004とNFR-REL/SEC/PERF、`components`のextension/presence境界、`component-methods`の公開result union、`services`のPi Extension Runtime lifecycleをworkflowへ具体化した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:47:38Z
- **Iteration:** 1
- **Scope decision:** none

fail-closed構造は一貫しているが、journalとcore commit間のクラッシュでtool副作用を重複実行するexact-once欠落がある。

### Findings

- BLOCKER | tool_execution_endはjournal reserve→core PostToolUse→journal completeだが、PostToolUse成功後かつjournalのcore-committed/completed更新前にクラッシュすると、次startのpending replayが同じPostToolUseを再実行できる。PostToolUseはaudit・sensor・state validationを含むため、重複sensor発火や状態変異が起こりFR-LIF-006と「core PostToolUseへ1回」に違反する。CoreToolHookPort側にeventKeyを受け取るdurable idempotent commit/receiptを定義し、再実行時はduplicate receiptだけを返すか、journalとcore receiptを同一原子境界に置く必要がある。execution_end受領から各クラッシュ境界までの検証propertyも必要。
- BLOCKER | PiBridgeJournal.eventKeyの正規導出がinput以外のmandatory eventで閉じていない。session replacement、agent_start/end/settled、tool_call/execution start/end、before/after compactについて、どのPi安定識別子・epoch・cycle/versionを組み合わせ、再配信と正当な次イベントをどう区別するかが未定義である。このままではduplicate receipt、SESSION_STARTED/ENDED欠落0、settlement CAS、compaction message高々1を実装者が推測することになる。event kindごとのversioned key schemaと、同一key異内容をprotocol conflictとしてblockするfingerprint契約を定義する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:52:23Z
- **Iteration:** 2
- **Scope decision:** none

mandatory event identityとcanonical commitのクラッシュ境界が閉じ、循環依存・契約矛盾・実装不能・上流要件漏れを認めない。

### Findings

- None
