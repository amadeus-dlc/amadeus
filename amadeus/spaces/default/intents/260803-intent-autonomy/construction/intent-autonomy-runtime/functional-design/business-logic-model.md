# Business Logic Model — intent-autonomy-runtime

## 上流入力と設計範囲

本設計は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`を正本とする。対象はU3 `intent-autonomy-runtime`と#2067のFR-AUT / GRT / DEC / STP、およびU3に割り当てられた2067-ACである。

実装範囲はM04 Intent Grant、M05 Auto Decision、M06 gate / question / park / resume統合、M07 audit / replay / status基礎、M08 / M09の5 harness autonomy contractである。U1のLoop MonitorとU2のQuality Repairを利用し、PR / merge、外部runner lifecycle、completed decision review surface、credential-attested terminal live completionは所有しない。

## Public contract refinement

| Contract | U3の必須refinement | Owner |
|---|---|---|
| `GrantProjection` | principal、issuance human turn、scope descriptor / fingerprint、confirmed policy set / digest、issuance identityを追加 | M04 |
| `DecisionPolicy` | source text digest、selector、normalized option rule、scope、human confirmation identityを束縛 | M04 / M05 |
| `AutonomyProjection` | human commandまたはfail-closed default/legacy provenance、current grant、workflow state、legacy standing grant diagnosticsを保持 | M04 |
| `DecisionAuthorization` | grant付き`full`とgrantなし`semi phase-gate`を別variantにする | M04 / M06 |
| `AutoDecisionRecord` | `decider` と `basisKind` を分離し、mode / policy / norm / history / election / recommendationを正確に表す | M05 |
| `WorkflowResult` | mode / grantの合法組合せとreason別resume conditionをstrict parseする | M00 / M06 |

confirmed policyは「decider」ではなくdeterministic-engineの「basis」である。solo electionとagent recommendationだけがそれぞれのdeciderになる。この分離により`principal / decider / actor / basis`をEvent Registryとstatusで混同しない。

## 1. Modeとgrantの原子遷移

### Mode表

| Mode | Gate | Question | Quality | Current grant |
|---|---|---|---|---|
| `none` | stage / phase / Walking Skeletonすべてhuman | human | current interactive path。none opt-in時だけU2 | null |
| `semi` | phase内はdeterministic auto、phase境界 / Walking Skeletonはhuman | human | U2必須 | null |
| `full` | stage / phase / Walking Skeletonすべてgrant scope内auto | decision chain | U2必須 | active |

unset / unknown / legacy `gated / autonomous`は`none`へfail-closedで読み替え、grantを発行しない。unsetは`system-default(DEFAULT_MODE_V1)`、legacy-onlyはsorted legacy event identitiesに束縛した`legacy-fail-closed` provenanceをread modelで決定的に導出する。これらはprincipal / human turnを持たず、authorizationやmode遷移を表さない。headless、harness種別、environment variable、standing delegationの存在からmodeを昇格しない。

### Human command flow

1. 操作対象のIntent UUIDをexplicitに解決し、team child Intentや別Intentへ暗黙に波及させない。
2. real `VerifiedHumanTurn`、principal、command occurrence、current projection revisionを検証する。
3. `full`の場合はIntent / scope / norm / host-tool boundaryから`GrantScopeDescriptor`を正規化する。
4. optionalな自然言語の事前裁定方針をselector / option ruleへ正規化し、scope、principal、normalized policyを人間へ表示する。
5. 同じhuman turnが表示されたcanonical digestを明示確認した場合だけ、`grantId = H(intentUuid + commandOccurrenceId + humanTurnId + scopeFingerprint + policySetDigest)`を発行する。
6. M07がmode遷移、old grant terminalization、new grant、human provenanceを同一transactionでcommitする。

`none ↔ semi`はgrant=nullを維持する。`issue-full / replace-full`はmode=fullとactive grantを同時に生成する。`full → none/semi`はactive grantをrevokedにしてcurrentから外す。再発行は旧grant revokedと新grant activeを同時にcommitする。workflowがsuspendedでもrevoke / downgradeは即時適用し、workflow state自体は維持する。

grantはTTL、usage count、secret、bearer tokenを持たない。`Request Changes`、quality failure、parkはgrantのrevoke / expiryにならない。

## 2. Gateとquestionの認可

M06は各interactionに`InteractionOccurrence`を作り、Intent、interaction kind、stage / phase / Bolt、Walking Skeleton flag、question / gate ID、option set、graph revision、requested effectへ束縛する。

### Gate policy

- `none`: human turnを待つ。
- `semi`: `phase-internal-stage-gate`だけauto。phase boundaryとWalking Skeletonはhuman。
- `full`: grant scope内のstage / phase / Walking Skeleton gateをdeterministic approval。scope外は`AWAITING_HUMAN`。

`semi`のauto gateはgrant exerciseではない。M06はmode発行のhuman provenance、current mode revision、gate occurrence / effectを内部再検証し、`AUTO_DECIDED(decider=deterministic-engine,basis=mode-semi,reviewState=not-applicable) + GATE_APPROVED`を同一M07 transactionへcommitする。`INTENT_GRANT_EXERCISED`は生成せず、question review queueにも投影しない。

`full`のauto gateはselected option=`approve`とgate effectをgrant candidateへ束縛し、reservation / revalidation後に`INTENT_GRANT_EXERCISED + AUTO_DECIDED(basis=grant-gate,reviewState=not-applicable) + GATE_APPROVED`を原子commitする。gate recordはquestion review queueへ投影しない。

questionは`none / semi`でhuman、`full`で次節のdecision chainを使う。新しいpermission、irreversible operation、scope外、norm / quality waiverはどのmodeでもauto candidateにせず`AWAITING_HUMAN`とする。

## 3. Full question decision chain

M05は次の順序を1回の`resolveAutoDecision`で評価し、選択肢ID集合外の回答を生成しない。

1. **Confirmed policy**: selector / scope / option setが一致し、一意なoptionになる場合だけ採用。非一意 / stale / invalidは行使せず次へfall through。
2. **Norm / history**: applicable normが矛盾すれば優先順を創作せず`NORM_CONFLICT`。normと過去人間裁定がscope lineage / selector / norm fingerprintに一致し、同じoptionへ一意な場合だけ採用。
3. **Solo election**: harness capabilityが実在する場合だけ開き、canonical rulingを採用。
4. **Agent recommendation**: election capability欠落時はdegraded capability / reasonを記録し、複数投票を偽装せず推奨を使う。

mode-semi / grant-gate / policy / norm / historyのbasisは`reviewState=not-applicable`、election / recommendationは`unreviewed`とする。前二者はgate専用でqueue非対象、policy / norm / historyもquestion review queue非対象である。U3はrecordとqueue stateを生成するが、active / completed Intentのaccept / flag操作はU4が所有する。

decision sourceがoptionを選んでも認可は完了しない。M06はCore-owned `DecisionOptionEffectRegistry`からeffect分類とpayload schemaをexact lookupし、`EffectAuthorizationValidator`でcurrent scope / permission boundary / applicable normを検証する。`new-permission / irreversible / scope-out / norm-waiver / quality-waiver`、registry未登録、payload不一致、current norm不一致はcandidateにせず`AWAITING_HUMAN`へ送る。applicable norm同士の矛盾はoption選択前後を問わず`NORM_CONFLICT`とし、confirmed policyはnormや禁止effectをoverrideできない。

`decisionId = H(intentUuid + questionId + occurrenceId + graphRevision)`であり、文面、回答順、時刻に依存しない。

## 4. Grant exerciseの二相commit

1. M04がcurrent full grant、question occurrence、canonical option setをread-only authorizeする。
2. M05がselected optionを返した後、M06がそのoptionの`DecisionOptionEffect`をexact lookupする。
3. M04がselected option、scope、effect identity / payload fingerprint / classification / registry revision、current applicable norm fingerprintを含むfull `DecisionCandidate`を生成する。
4. M07が`INTENT_GRANT_EXERCISE_RESERVED`をcandidate全体、digest、grant ID、projection revision、graph revision、effect registry revision、current applicable norm fingerprintとともにcommitする。
5. crash / resume時はM04がauditからcandidateを再生し、current grant、graph、scope、question / occurrence、option、effect registry / payload / classification、current applicable norm、digestを内部再検証する。caller booleanを受けない。
6. validな場合だけ`INTENT_GRANT_EXERCISED + AUTO_DECIDED + existing workflow effect`を1つのtransactionでcommitする。invalidなら`INTENT_GRANT_EXERCISE_ABORTED`だけをcommitする。

effectはcanonical eventからmaterializeされ、audit外の後続副作用を残さない。transaction前crashは3eventとも未commit、後crashはすべてcommit済みである。

## 5. Park、failure、resume

| Reason | Trigger | Resume condition | Monitor latch |
|---|---|---|---|
| `AWAITING_HUMAN` | permission / irreversible / scope / waiver / capability | human actionまたはexternal capability | なし |
| `REPAIR_STALLED` | U2 stalled route | any-of evidence change / human retry | あり |
| `NORM_CONFLICT` | applicable normの矛盾 | norm fingerprint change | なし |
| `USER_PARKED` | real human park | real human unpark / retry | なし |

parkはworkflow stateを`suspended`にするが、`full`のactive grantは変更しない。`none / semi`はgrant=nullのままである。same condition / fingerprintの再起動はLLMや自動裁定を呼ばず同じparked resultを返す。

condition充足後は`REPAIR_STALLED`だけU1 Monitor latch clearを要求し、他reasonはmonitor plan=nullとする。condition satisfaction、optional latch clear、`WORKFLOW_UNPARKED`を同一M07 transactionでcommitする。

CLIのterminal `failed`は現在の呼出しだけを終了し、workflowはrunning、mode / grant / latchは不変とする。M06は途中のstate-changing planを破棄し、`transactionId = H(intentUuid + invocationId + failureEvidenceFingerprint)`へ束縛した`INVOCATION_FAILED`だけをM07へ渡す。M07はsanitized failure evidence、before / after projection digest（同値）、`retryable=false`、failed resultの`failureRef`を同じtransactionでcommitする。同一invocation / evidenceの再送は同じreceiptを返し、runner auto retryは行わない。人間は通常のAmadeus起動でactive Intentを継続できる。

## 6. Legacy standing grant migration

M04 replayは既存standing delegation eventを`LegacyStandingGrantRecord`として読めるが、current authorizationへ投影しない。検出時はID、source event、status=`legacy-non-authoritative`、recommended human actionをmigration diagnosticへ返す。

- modeは`none`へfail-closed。
- Intent-scoped grantを自動発行しない。
- synthetic `HUMAN_TURN`や代理provenanceを作らない。
- legacy eventは削除・書き換えせずaudit / replayで表示する。
- 人間がnew mode / grantを選び直したときだけ正規遷移を行う。

## 7. Audit、status、5 harness contract

M07はmode / grant issuance / replacement / revoke、mode decision、grant reservation / exercise / abort、auto decision、park / resume、terminal invocation failure、legacy diagnosticをcanonical eventとして再生する。grant正本はIntent auditだけであり、per-clone gitignored stateは参照用scratchに限る。

status / resultはautonomy mode、workflow execution state、nullable grant ID / state / scope、suspended reason、policy count、stop reason、resume condition、legacy diagnosticをhuman / machine両方で表示できる。U4の未確認queue / reviewはこのdecision recordを利用する。

Claude Code、Codex、Cursor、OpenCode、Kimi Codeは同じmode表、grant candidate、decision chain、park / resume、result envelope fixtureを実行する。native adapterはcapability factsとelection / recommendation invocationを提供し、M04 / M05 algorithmをforkしない。U3のlive completion capabilityはまだfalseで、U5の最終revision receiptなしにIntent completionをpassしない。

## 8. Verification scenarios

| Scenario | Oracle |
|---|---|
| unspecified / headless / legacy mode | `none`、grant=null |
| unspecified / legacy-only provenance | system-default / legacy-fail-closed、human turnなし |
| human none→semi | provenance付きmode原子遷移 |
| semi phase-internal gate | `AUTO_DECIDED + GATE_APPROVED`、grant eventなし |
| semi phase boundary / question / skeleton | human待ち |
| full issuance | scope / policies / principal表示と確認後だけactive |
| full gate / skeleton | reservation後`INTENT_GRANT_EXERCISED + AUTO_DECIDED + effect` |
| policy hit | deterministic-engine + confirmed-policy、queue非対象 |
| unique norm / history | exact selector / lineage / norm fingerprint |
| norm conflict | parked / `NORM_CONFLICT`、grant active |
| election unavailable | fake voteなし、recommendationへloud degradation |
| new permission / waiver | parked / `AWAITING_HUMAN` |
| crash after reservation | full candidate再生・内部再検証、caller booleanなし |
| candidate tamper / graph change | exercise abort、effectなし |
| prohibited effect / norm drift | candidateなしまたはexercise abort、human / norm conflict route |
| Request Changes / quality failure | grant不変 |
| suspended revoke | revoke / mode変更、workflow suspended維持 |
| same parked fingerprint | LLM / decision 0回、同じresult |
| terminal invocation failure | failure evidence + same before/after projection digestの原子receipt、auto retryなし |
| team child Intent | target UUID必須、parent / sibling不変 |
| legacy standing grant | non-authoritative diagnostic、自動変換なし |
| 5 harness contract | byte-equivalent result / audit plan |

## 要件・AC追跡

| 設計群 | 要件 / AC |
|---|---|
| mode / migration | FR-AUT-001〜010 |
| grant lifecycle / exercise | FR-GRT-001〜009 |
| decision chain / audit | FR-DEC-001〜007 |
| quality / loop integration | FR-LMC-008〜012、FR-QRP-001〜013 |
| park / resume / result | FR-STP-001〜007 |
| harness neutrality | FR-HAR-001〜007、NFR-DET / SEC / REL / MNT |

### 2067-AC直接対応

| AC | Verification scenario / owner boundary |
|---|---|
| 2067-AC01〜03 | unspecified/headless、human none→semi、provenance transition（U3 primary） |
| 2067-AC04〜07 | full issuance、audit正本、synthetic human禁止、grant exercise二相commit（U3 primary） |
| 2067-AC08〜09 | semi/full gate・question・Walking Skeleton mode表（U3 primary） |
| 2067-AC10〜13 | policy hit、unique norm/history、norm conflict、election degradation（U3 primary。live実測だけU5） |
| 2067-AC14 | U2 Quality Repair routeをmode / grant不変で受ける統合oracle（U2 primary、U3 secondary） |
| 2067-AC15 | park / resume / terminal failure receipt（U3 primary、U1/U2 integration） |
| 2067-AC16〜17 | principal/decider/actor/basis schema、全auto pathの`AUTO_DECIDED`（U3 primary、U4 projection） |
| 2067-AC21 | completed decision reviewが参照するimmutable decision projection（U4 primary、U3 secondary） |

`FR-HAR-001〜007`のCore contract / fixture整合はU3 secondary、credential-attested live completionとterminal receiptの全5 harness実測はU5 primaryである。U3はlive completion capabilityを有効化しない。

## 非目標

- completed Intentのdecision accept / flag、self-fix / self-feature提案、新Intent作成。
- credential-attested 5 harness terminal completionとlive completion flag。
- PR / GitHub / merge / convergence、外部runner / scheduler、常駐supervisor。
- TTL、usage budget、synthetic human、host / cloud / tool permission拡張、waiver自動承認。

## Historical Review Cycle 1 — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:01:45Z
- **Iteration:** 1
- **Scope decision:** none

主要フローは上流設計を具体化しているが、既定・legacy modeの再生、禁止effectとnorm境界の認可、自動gate記録、terminal invocation failureの監査契約に実装不能な欠落がある。

### Findings

- BLOCKER | 既定・legacyのnone状態で必須ModeProvenanceを構築できない: AutonomyProjectionのmodeProvenanceはreal-human variantに加えてsystem-default／legacy-fail-closed variantまたはnullable表現が必要。
- BLOCKER | option effectが禁止操作およびcurrent norm内であることを検証する契約がない: effect classification registryとcurrent norm再検証を定義しなければCON-004とNFR-SAF-003を強制できない。
- BLOCKER | mode-semi／grant-gateのAUTO_DECIDEDに合法なreviewStateが定義されていない: gate自動承認用のcanonical reviewStateとqueue非対象性が必要。
- BLOCKER | terminal invocation failureの監査transactionが設計されていない: failed result、failure evidence、不変stateを同一transaction identityへ束縛するevent planとreplay規則が必要。
- FOLLOW-UP | U3受入条件への直接追跡がFR群の範囲表記に留まる: 2067-AC単位のverification対応とU5境界のprimary／secondary区分が望まれる。

## Historical Review Cycle 1 — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:08:05Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4論点は解消されたが、grant行使のcanonical event名が上流公開契約と矛盾し、監査・replayを一意に実装できないためNOT-READY。

### Findings

- BLOCKER | business-logic-model.mdとbusiness-rules.mdはGRANT_EXERCISED／GRANT_EXERCISE_ABORTEDをcanonical eventとして記述する一方、上流component-methods.mdのM04／M06公開契約はINTENT_GRANT_EXERCISED／INTENT_GRANT_EXERCISE_ABORTEDを要求する。このままではproducer・reducer・Event Registry・replay fixtureが異なるevent typeを実装でき、FR-GRT-009と2067-AC07の再生契約が一意に定まらないため、上流名へ統一するか明示的な契約変更が必要。
- FOLLOW-UP | 2067-AC直接対応表はU3 primaryのAC01〜13・15〜17を追跡できているが、U3がsecondaryとなるAC14とAC21についても統合oracleまたは所有境界を明記すると、unit-of-work-story-map.mdとの追跡が完全になる。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:26:43Z
- **Iteration:** 1
- **Scope decision:** none

現行設計はINTENT_GRANT_EXERCISED／INTENT_GRANT_EXERCISE_ABORTEDを上流公開契約へ統一し、mode・grant・裁定・監査・停止再開を実装可能かつ内部整合した契約として閉じている。

### Findings

- FOLLOW-UP | unit-of-work-story-map.mdは2067-AC18〜21をU3 secondaryとするが、3成果物の直接対応表はAC21だけを列挙している。本文ではU3のdecision record／queue生成とU4のreview操作境界が説明され実装阻害はないものの、AC18〜20にもsecondary oracleまたは非所有境界を明記すると上流追跡が完全になる。
