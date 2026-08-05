# Business Rules — autonomy-review-observability

## 上流入力と適用範囲

本規則は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`からU4 `autonomy-review-observability`の不変条件を抽出する。対象はread / review / status / telemetryであり、decision effect、Intent completion、rollback、新Intent作成を含めない。

## Query規則

| ID | Rule | Violation |
|---|---|---|
| OBS-Q01 | list / detailはexplicit target Intent UUIDを要求し、decision IDからIntentを逆引きしない | target required |
| OBS-Q02 | target lifecycleはactive / completedだけ、query filterと一致させる | lifecycle mismatch |
| OBS-Q03 | queueはsolo election / agent recommendationのunreviewedだけ | projection error |
| OBS-Q04 | policy / norm / history / gateはhistory表示可能だがnot-applicableかつqueue非対象 | projection error |
| OBS-Q05 | ordering / cursorはoccurrence / decision ID / query fingerprintとimmutable read snapshot identityから決定し、時刻や文面に依存しない。page間snapshot driftは`CONFLICT(cursorSnapshot)`とする | malformed / stale cursor |
| OBS-Q06 | cross-Intent decision IDをnot foundとして拒否し、他Intentの存在を漏らさない | not found |

## Detail・privacy規則

- question / options / selected option / principal / decider / actor / basis / nullable grant / evidence / degradation / review stateを返す。
- safe label、redacted value、canonical digestだけを表示・保存する。
- credential、secret、bearer token、raw provider prompt、未redact host / tool payloadを返さない。
- redaction failure時はraw fallbackせず`withheld`を表示する。
- access control / retentionは既存Intent audit、Event Registry、OTel contractを継承する。

## Review規則

| ID | Rule | Violation |
|---|---|---|
| OBS-R01 | accept / flagはeligible unreviewed decisionだけ | review not eligible |
| OBS-R02 | active source Intentのreal VerifiedHumanTurnをtarget Intent、decision、choice、command occurrenceへ束縛したreceiptとして検証する | provenance error |
| OBS-R03 | synthetic human、proxy principal、headless auto reviewを認めない | fail-closed |
| OBS-R04 | review IDはIntent / decision / human turn / choiceから決定する | identity error |
| OBS-R05 | same review / choiceはsame receipt、terminal choice競合は拒否する | terminal conflict |
| OBS-R06 | reviewはdecision effectを再実行せず、過去decision eventを変更しない | transaction reject |
| OBS-R07 | `AUTO_DECISION_REVIEWED`はchoice、principal、human turn、safe remediation metadataを記録する | schema reject |
| OBS-R08 | active targetはsource=target、completed targetは現在のactive source Intentを使い、target sealへHUMAN_TURNを追記しない | context required |
| OBS-R09 | caller提供audit / receipt / lifecycleを認可せず、M07がcanonical storeからactive sourceとhuman turn commitを直接readしてappend時にも再検証する | provenance error |
| OBS-R10 | review principal / actorはreal human principalと同一、decision principal / actorはcanonical AUTO_DECIDED safe fieldだけから投影し、field導入前eventはnull / withheld | projection error |
| OBS-R11 | 新規AUTO_DECIDEDはsubject無しoverloadを持たないM05 plannerだけから生成する。M04 authorizerがcanonical audit / authoritative lock revision / state projection revisionの同一snapshotからsemi mode eventまたはfull grant issuance / exerciseを検証してprincipal receiptを発行し、M05が新snapshotで同receiptを再検証する。canonical Registry portで解決したM06 actorとreceipt digest / source revisionを完全なAuditEventPlanのsubject_v1へ必須保存し、source revisionをM07 append CASへそのまま使う。欠落・revision drift時はplan / commitしない。null / withheldはfield導入前replayだけ | provenance error |
| OBS-R12 | flag classification / safe note digestはreview_command_v1のhuman bindingとdigestへexplicit nullを含めて束縛し、review command側の自由入力やhuman turn後の差替えを認めない | provenance error |

## Completed seal規則

- completed Intentでは専用`CompletedDecisionReviewValidator`だけを使う。
- event typeはexactly `AUTO_DECISION_REVIEWED`とし、同じtransactionの他eventを拒否する。
- decisionがexplicit target sealed auditに存在し、active source auditのhuman turn receiptがtarget / decision / choice / occurrenceと一致することを必須にする。
- original completion seal、artifact digest、workflow lifecycle、grant、decisionを変更しない。
- post-seal review extensionはcompletion seal digest、previous extension、review eventからhash chainを作る。
- extension chain mismatch、expected revision mismatch、unknown eventはfail-closedする。
- completed-only pathを一般append APIとして公開しない。
- event fieldsはexactly `payload_v1`だけとし、closed `AutoDecisionReviewedPayloadV1`のfixed-key-order canonical JSONを保存する。
- post-seal extensionはclosed v1 schema、dense revision、current head、canonical extension identityを検証する。
- review event / extension identityはcanonical review payload digestとaudit transaction IDを含み、payload改変でchain identityが変わる。
- review payloadはaudit transaction IDとreceipt projection revisionを持ち、replayでfull `DecisionReviewReceipt`を再構築する。

## Identity・redaction規則

- U4 identityはdomain tag、ordered field tag、null/text variant、u32/u64 length prefix、UTF-8 valueを持つ`canonical-tuple-v1`だけからSHA-256生成する。
- delimiter連結、native JSON stringify、display text、時刻をidentity preimageにしない。
- redaction失敗時はquestion / label / basis / note / evidenceのvalueとdigestをnullにし、`withheld`だけを返す。
- safe principal / actorは別nullable referenceとして投影し、review principal / actorとdecision principal / actorを混同しない。
- contract success digestはschema ID別canonical-value-v1でnested object / array / integer / normalized human stringをencodeし、`DecisionPage.nextCursor`ではtarget audit revision、nullable review extension head、projection event-set digestをpublic type宣言順に含むgolden byte vectorで5 harness一致を検証する。
- projection event-set digestはtarget Intent内のvalid `AUTO_DECIDED / AUTO_DECISION_REVIEWED`だけをclosed payload digest付きentryへ変換し、event type / event ID順にsortしてexact duplicateだけをdedupeする。同一event IDの内容衝突や対象eventのinvalid schemaはcursorを作らずfail-closedする。

## Flag remediation規則

| Classification | Primary proposal | Effect |
|---|---|---|
| existing contract defect | self-fix | proposal only |
| specification addition / change | self-feature | proposal only |
| unspecified | self-fix primary、self-feature conditional alternative | proposal only |

flagはactive / completedをrollback / reopenせず、grant / workflow / artifactsを変更しない。提案からscope commandを実行せず、新Intentを自動作成しない。

## Status規則

| ID | Rule |
|---|---|
| OBS-S01 | human / machine statusは同じcanonical projectionを使う |
| OBS-S02 | mode、workflow、nullable grant / scope、policy count、suspended / stop reason、resume condition、unreviewed countを表示する |
| OBS-S03 | completedはworkflow=null / current grant=nullを維持し、review queueを保持できる |
| OBS-S04 | review appendはcompletion result / identityを変更しない |
| OBS-S05 | REPAIR_STALLEDとlegacy diagnosticは既定のmode別説明を維持する |
| OBS-S06 | illegal enum / combinationをmachine schemaで拒否する |
| OBS-S07 | projector inputはlifecycle、safe grant scope、policy count、stop / resume、decision / accepted / flagged countsを明示的に持ち、欠落値を推測しない |

## Public API・harness fixture規則

- `listAutoDecisions`はpage items、snapshot-bound next cursor、query fingerprintを返し、bounded page sizeを受ける。first pageはsnapshot identityとitemsを同一readで取得し、継続時のsnapshot driftは`CONFLICT(cursorSnapshot)`で拒否する。
- `getAutoDecision`はraw recordでなくredacted `DecisionDetail`を返す。
- queue判定は上流`AutoDecisionRecord.decider / reviewState`のclosed enumを使い、表示文やfree-form basisへ依存しない。
- `ReviewStatusInput`と`MachineStatus`はlifecycle、safe grant scope、policy count、stop reason、decision / unreviewed / accepted / flagged countを持つ。
- 5 harness fixtureはfixture ID / contract revision / exact harness tuple、canonical-value-v1およびprojection event entry / setのgolden vectors、authorization / list / detail / review / status、source / target audit、success / exact `ContractError` oracleを持つ。
- contract resultはharness IDを束縛し、exactly-once 5件、nested value / human stringのcanonical digest、session / process / compaction / clone後のqueue / receipt persistence、negative caseのerror code / locusを検証する。

## Registry・OTel規則

- `AUTO_DECISION_REVIEWED`と`amadeus.intent.id / decision.id / review.id / review.choice / review.lifecycle / review.principal_ref / review.actor_ref / review.source_turn_ref / decision.principal_ref / decision.actor_ref / decision.source / decision.basis_digest / grant.id / review.note_digest / redaction.status / audit.transaction_id / trace.id / span.id`を既存Event Registryへ登録する。
- principal / decider / actor / basisを別fieldで保持する。
- Intent / decision / review / grant / audit transaction / trace identityを相互参照可能にする。
- raw question / evidence / credentialをspan attributeへ載せない。
- redaction failure時はID / enum correlationと`redaction.status=withheld`だけを残す。
- 別telemetry schema / storeを作らない。
- 5 harness adapterへreview / redaction / seal algorithmを複製しない。

## Failure classification

| Failure | Classification | Effect | Recovery |
|---|---|---|---|
| target missing / lifecycle mismatch | query error | state不変 | explicit target correction |
| cross-Intent decision | not found | existence非開示 | correct target |
| ineligible decision | review boundary | state不変 | history閲覧のみ |
| invalid human turn | authorization error | review eventなし | real human command |
| duplicate same review | idempotent replay | same receipt | none |
| conflicting terminal review | conflict | past review不変 | history確認 |
| completed extension mismatch | seal conflict | appendなし | replay / reload |
| redaction failure | privacy boundary | value withheld | protected source correction |

## 要件・AC追跡

| Rule group | Requirement / AC |
|---|---|
| query / detail / queue | FR-DEC-007、FR-OBS-001〜002、2067-AC18 |
| review / completed seal | FR-OBS-003〜004、NFR-SAF-002、2067-AC19 |
| flag proposal | FR-OBS-005、2067-AC20 |
| status | FR-STP-005〜006、FR-OBS-006、NFR-UX-001〜003、2067-AC21 |
| registry / OTel / privacy | FR-OBS-007、NFR-OBS-001、NFR-PRV-001〜002、2067-AC16 secondary |
| persistence / harness | FR-HAR-004、NFR-DET / REL / MNT |

## 非目標

- rollback、Intent reopen、decision effect再実行、artifact変更。
- self-fix / self-featureの自動起動、新Intent自動作成。
- terminal live completion、PR / GitHub、runner / supervisor。
- credential / raw evidenceの保存・表示。
