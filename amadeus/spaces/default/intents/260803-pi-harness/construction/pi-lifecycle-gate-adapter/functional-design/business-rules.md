# pi-lifecycle-gate-adapter — Business Rules

## Registration and identity rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-PLA-001 | 全mandatory handler登録成功後だけ`RegistrationGate`をopenする。partial registrationはmutation不能 | `blocked(registration-incomplete)` |
| BR-PLA-002 | 同じExtension API instanceへの登録は高々1回 | `blocked(duplicate-registration)` |
| BR-PLA-003 | session identityは公開`getSessionId()`を正本とし、cwd/session fileはdigestだけをauditする | `blocked(session-identity-invalid)` |
| BR-PLA-004 | session replacement後に古いPi API/context/session manager参照を再利用しない | `blocked(stale-session-context)` |
| BR-PLA-005 | mandatory eventはjournal reserve→core `commitOnce(eventKey,fingerprint,event)`→journal completeの順。journal markが遅れてもcore durable receiptで完了済み副作用を再実行しない | health blocked、replay required |
| BR-PLA-006 | 全mandatory event keyは`pi-<kind>/v1` schemaと状態付きepoch/cycle/attempt/compaction identityから導出する。同一key・同一fingerprintだけduplicate | `blocked(event-identity-conflict)` |
| BR-PLA-007 | 同一event key・異なるfingerprintはnative再配信として扱わず、coreへ渡す前にprotocol conflictへ遷移する | mutation 0、health blocked |
| BR-PLA-008 | core commit receiptはaudit・sensor・state validationごとのderived idempotency subreceiptをdurableに持ち、replayは未完了suboperationだけを再開する | 各core副作用高々1 |

## Human presence and gate rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PLA-010 | HUMAN_TURN対象は`input.source=interactive`だけ。`rpc`/`extension`は常に0件 | FR-LIF-003、FR-GAT-001 |
| BR-PLA-011 | delivery keyはsession ID、受理前leaf ID、source/streaming behavior、content digestの`pi-input/v1` canonical bytes | NFR-REL-002 |
| BR-PLA-012 | interactive inputはpresence receipt確定後だけ`continue`。failure時は`handled`でagent処理を止める | fail-closed |
| BR-PLA-013 | adapterは回答内容からapprove/rejectを判定せず、gate stateとpresence検証をcoreへ委ねる | core ownership |
| BR-PLA-014 | 同文の意図的な後続inputは前message追加後の異なるbase leafを持つ。Pi 0.83 fixtureがこの順序を満たさなければformal supportをfailする | delivery uniqueness |

## Agent and continuation rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PLA-020 | `agent_end`はattempt observationのみでcontinuationを起動しない | FR-LIF-004 |
| BR-PLA-021 | 最初の`agent_start`から`agent_settled`までを1 SettlementCycleとする。running中のstartはduplicate、matching end後のstartだけがattempt ordinalを増やす | Pi settled semantics |
| BR-PLA-022 | `agent_settled`だけがcycle CASと`prepareOnce`を起動する。open cycleなしの非duplicate settledはfail-closed | FR-LIF-004 |
| BR-PLA-023 | continuationはdurable outbox prepare→session token照合→append→verify→markの順で、engine invocationとPi turnはcycleごとに高々1 | NFR-REL-002 |
| BR-PLA-024 | pending outboxをtarget以外のsessionへ配送しない。session replacement時はoperator-visible blocked | session isolation |
| BR-PLA-025 | continuation failureをnative duplicateで無制限retryしない。session-start reconciliationだけがpendingを回復する | failure transparency |

## Tool and compaction rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PLA-030 | `tool_call`はPreToolUse guard、`tool_execution_start/end`はexecution fact。`tool_result`からPostToolUseを重複発火しない | FR-LIF-006 |
| BR-PLA-031 | endは同session epochのstartとcall ID/tool名が一致しなければならない | protocol integrity |
| BR-PLA-032 | PostToolUseのaudit/sensor/state-validation対象判定はcore正本を使い、Pi側allowlistを作らない | FR-LIF-006 |
| BR-PLA-033 | mandatory tool bridge failure後はhealthをblockedにし、次のtool/input/continuationを禁止する | FR-GAT-002 |
| BR-PLA-034 | compaction前checkpointを保存できない場合はPi公開resultでcancelする | FR-LIF-005 |
| BR-PLA-035 | compaction後のintent/stage/missionはcore recordから再解決し、summaryから推測しない | FR-LIF-005 |
| BR-PLA-036 | mission reinjectionはcompaction entry IDごとに高々1件。overflow retry時にextension turnを追加しない | NFR-REL-002 |
| BR-PLA-037 | before-compactはopen attemptの同一fingerprintだけをduplicateとし、after-compactは`compactionEntry.id`でattemptをcloseする | compaction identity integrity |

## Health, security, and compatibility rules

- BR-PLA-040: 最初のmandatory failureを`ExtensionHealthLatch`へ保存し、後続failureで原因を上書きしない。
- BR-PLA-041: blocked中もread-only status/doctorは別portで完走し、workflow-changing handlerだけを拒否する。
- BR-PLA-042: input本文、image、tool args/result、provider secret、home絶対pathを平文journal/auditへ保存しない。replay必須payloadだけmachine-local AES-256-GCMでsealする。
- BR-PLA-043: unknown required discriminator/shapeはblocked。既知eventのadditional fieldだけを無視できる。
- BR-PLA-044: profile selectorはmacOS/LinuxのPi `>=0.83.0`を`pi-extension/0.83+`へ写像し、native Windows/older versionをformal successにしない。
- BR-PLA-045: adapterはmodel call、network、不要なfilesystem scanをevent hot pathへ追加しない。journal/core fakeを用いたKimi baseline比較をNFR-PERF-001どおり測定する。

## Closed outcomes

`PresenceOutcome`は`minted | duplicate | ignored-non-human | blocked`、`ContinuationOutcome`は`continued | already-delivered | not-needed | blocked`、`LifecycleBridgeOutcome`は`committed | duplicate | pending-replay | blocked`だけである。`CanonicalCommitOutcome`は`committed(receipt) | duplicate(receipt) | conflict | failed`のclosed unionである。exceptionはadapter境界でredacted `blocked`へ変換し、成功値へ変えない。

主要blocked codeは`registration-incomplete | duplicate-registration | missing-core-port | session-identity-invalid | stale-session-context | event-identity-conflict | journal-write-failed | journal-replay-failed | canonical-commit-failed | presence-commit-failed | agent-cycle-invalid | continuation-prepare-failed | continuation-delivery-failed | tool-correlation-invalid | post-tool-bridge-failed | compaction-checkpoint-failed | mission-reinjection-failed | unsupported-pi-version | unsupported-platform`のclosed unionである。

## Verification rules

- Presence property: interactive/rpc/extension、duplicate、同文次turnの組合せで期待HUMAN_TURN countがそれぞれ1/0/0、duplicate 1、次turn 2になる。
- Gate negative: no-input、RPC自動回答、presence failureでGATE_APPROVED=0、stage pointer/artifact mutation=0。
- Settlement property: agent_end/retry/compaction/queued/settledの全列でsettled前continuation=0、cycleごとのengine/Pi continuation各高々1。
- Outbox crash property: prepare、append、verify、markの各境界へcrashを注入し、session custom delivery tokenが1件以下になる。
- Event identity property: session replacement、agent duplicate/retry/next cycle、tool call/start/end duplicate、before/after compact duplicate/next attemptの各列で、duplicateは同一key/receipt、正当な次eventは別key、同一key異内容はblockedとなる。
- Tool property: read/write/bash/customのstart/update/end/duplicate/mismatchでPostToolUse、applicable sensor、state validationがcore条件と一致する。
- Tool commit crash property: journal reserve、core prepare、audit receipt、各sensor receipt、state-validation receipt、core committed、journal core-committed、journal completeの各境界へcrashを注入し、各副作用countが高々1、reconciliation後のfinal receiptが1となる。
- Compaction property: manual/threshold/overflowでfresh active intent/stage/missionが一致し、summary改ざんでidentityが変わらない。
- Failure property: journal/core/sensor/state/continuation各failureでblocked latchが残り、後続workflow mutation 0、status/doctor success。
- Replacement property: new/resume/fork/reloadで古いcontext呼出0、新session identityのstart/end chainが欠落・重複0。
- Security property: fixtureにtoken、prompt、home pathを含めても平文journal/audit/diagnostic 0件。
- Performance property: warm-up 10回、交互100回のpure adapter medianがKimi baselineの2倍または+100msの大きい方以下。

## 上流トレーサビリティ

`unit-of-work`のUnit-local fixture/benchmark、`unit-of-work-story-map`のSCN-003/004、`requirements`のFR-LIF/GATとNFR、`components`のcore/overlay分離、`component-methods`のtyped outcome、`services`のsession/settled lifecycleをbusiness invariantへ変換した。
