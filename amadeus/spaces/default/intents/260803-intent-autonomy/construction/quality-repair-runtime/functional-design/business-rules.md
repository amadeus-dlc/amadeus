# Business Rules — quality-repair-runtime

## 上流入力と適用範囲

本規則は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`からU2 `quality-repair-runtime`の不変条件を抽出する。#2096のfirst-party Quality Repair Loop Pluginだけを扱い、generic Monitor、grant、gate / question認可、PR、runner / supervisorの規則を含めない。

## Activation・contribution規則

| ID | 規則 | 違反時 |
|---|---|---|
| QRP-A01 | `semi / full`はstage副作用前にfirst-party contributionを必須activationする | fail-closed |
| QRP-A02 | `none`は既定offとし、real `VerifiedHumanTurn`に束縛したopt-inだけを受理する | disabled / provenance error |
| QRP-A03 | headless起動、過去session、standing grantをopt-in provenanceに変換しない | activation拒否 |
| QRP-A04 | `none`のopt-inはquality repair以外のgate / question / permissionを拡張しない | contract error |
| QRP-A05 | source trust、content digest、schema、Monitor / provider / instruction / route referenceをcompileでexact resolveする | compile全体中止 |
| QRP-A06 | initial `required_outputs[]`は空とし、Issueにないartifactを必須化しない | contribution拒否 |
| QRP-A07 | 将来のrequired outputはstable output ID、stage selector、verifierを必須とする | malformed |
| QRP-A08 | contributionのevidence provider、Judge instruction、route rule、required outputはtyped descriptorで表し、ID配列だけでcompileしない | compile全体中止 |

## Evidence規則

| ID | 規則 |
|---|---|
| QRP-E01 | obligation sourceはvalidated reviewer BLOCKER / NOT-READY、blocking指定sensor、required produces、宣言済みverification / completion conditionに限る |
| QRP-E02 | advisory sensorをblockingへ暗黙昇格しない |
| QRP-E03 | blocking sensorのnon-zero、signal、exception、incompleteをpassに変換しない |
| QRP-E04 | reviewerの`NOT READY`表記差はwire `NOT-READY`へ正規化する |
| QRP-E05 | `Request Changes`はquality obligationへ変換せず、non-progress countを変えない |
| QRP-E06 | snapshotはIntent、Monitor、stage / Bolt、graph revision、obligation IDs、source category、failure kind、artifact、verifier、fingerprintへ束縛する |
| QRP-E07 | obligationをstable IDでsort / dedupeし、resolved / added / retainedを集合差で決める |
| QRP-E08 | audit数、session数、編集回数、表層文面、plan文面・digest変化をprogressに数えない |
| QRP-E09 | 必須field不足はstable `evidence-incomplete`のnon-progress obligationへfail-closedで正規化する |
| QRP-E10 | cross-Intent / Monitor / stage / revision evidenceを同一quality epochへ混入させない |
| QRP-E11 | normalization inputはnullable previous snapshotとterminal `QualityObservation[]`を持ち、deltaをID配列だけから推測しない |
| QRP-E12 | obligationは`sourceCategory`と`failureKind`の二軸でwire表現し、`evidence-incomplete`を自然言語だけにしない |

## Progress・threshold規則

| ID | 規則 |
|---|---|
| QRP-P01 | strict progressは`U(n)`が`U(n-1)`の真部分集かつaddedが空の場合に限る |
| QRP-P02 | strict progressはconsecutive countとreplan flagをresetするが、T+1比較窓の過去を即座消去しない |
| QRP-P03 | recent snapshotsは最大T+1、Tはcompiled Monitorの正の整数とする |
| QRP-P04 | T-1まではJudgeを呼ばずdeterministic `repair`を続ける |
| QRP-P05 | fixed pointは同snapshot fingerprintのT回連続とする |
| QRP-P06 | churnはstrict progressなしでfingerprintが変化し、obligation集合が単調縮小しないT窓とする |
| QRP-P07 | regression cycleは最新fingerprintがT+1窓の過去と再一致し、中間に異なるsnapshotがある場合とする |
| QRP-P08 | 同率、判定不能、evidence不足はnon-progress `undetermined`とし、成功を創作しない |
| QRP-P09 | 初回Tは`allowedRoutes=[replan]`、replan後のnon-progress Tは`[repair-stalled]`のsingletonとする |
| QRP-P10 | plan digestやdistinct plan数をprogressにせず、strict progressのみがreplan flagをresetする |
| QRP-P11 | Quality Repair全体へ固定retry capを設けない |

## Replan・reviewer handoff規則

- `replan`はcanonical Judge resultと`ReplanReservation`のcommit後にだけ開始する。
- replanはIntent、scope、norm、quality epoch、trigger snapshotを維持する。新規要件へ拡張しない。
- plan digest、agent / context identity、basis、scopeをauditし、raw promptや秘密を保存しない。
- 新しいlocal `reviewCycleId`は`H(qualityEpochId + judgeInvocationId + replanFingerprint + cycleIndex)`から決め、iteration 1から始める。`previousReviewCycleId`はlinkage専用でidentityに含めない。quality epoch、T+1 history、replan flagをresetしない。
- `reviewer_max_iterations`は局所cycle内で守り、上限後のvalidated unresolved BLOCKERをQuality evidenceへhandoffする。
- rejected / tampered / unvalidated reviewer resultをquality obligationへ昇格せず、reviewer protocol errorとしてfail-closedする。

## Stall・resume規則

| ID | 規則 |
|---|---|
| QRP-R01 | `repair-stalled`だけが`parked / REPAIR_STALLED`とIntent-level suspendedを生成する |
| QRP-R02 | U2はgrantを終了・revoke・発行しない。`full`のactive、`none / semi`のnullを保持する |
| QRP-R03 | latchはevidence fingerprint、pattern、replan basis、resume conditionへ束縛する |
| QRP-R04 | 同一fingerprintの起動はJudge / LLM / repairを呼ばず同じparked resultを返す |
| QRP-R05 | evidence changeはlatched Uの真部分集または同一obligation verifierの新成功証拠に限る |
| QRP-R06 | human retryはcondition identityに一致するreal `VerifiedHumanTurn`を要求する |
| QRP-R07 | latch clear、quality resume、workflow unparkを同一M07 transactionでcommitする |
| QRP-R08 | transaction失敗時にlatchだけ、workflowだけ、quality epochだけを更新しない |
| QRP-R09 | `REPAIR_STALLED`のresume conditionは`any-of[evidence-change, human-retry]`とし、両方を同時にstatus / resultへ表示する |
| QRP-R10 | resumeは新しいepoch start eventからquality epoch IDを発行し、window / count / replan / review cycle / latchを初期化する |

## Audit・status・replay規則

- M07だけがcanonical eventをappendし、M03 / M06 / M08は`AuditEventPlan`を返す。
- activation、opt-in / out、snapshot、progress、replan、review cycle、stalled、resumeをreplay可能にする。
- 同一event / transaction identityの再送は同じreceiptまたはno-opとする。
- malformed event、unknown route、scope mismatch、fingerprint conflictをskip-successにしない。
- scratch projection消失後もcanonical auditから同じquality projection / route / latchを再構築する。
- human / machine statusはpattern、threshold、obligation IDs、evidence fingerprint、stop reason、resume condition、mode別grant説明を表示できる。
- raw reviewer prose、raw prompt、credential、secretをstatus / auditに保存しない。

## Harness portability規則

- 現行contract / live対象はClaude Code、Codex、Cursor、OpenCode、Kimi Codeである。
- Quality evidence正規化、progress判定、route制約、resume reducerをharness directoryへ複製しない。
- native adapterは既存のharness event / model invocation / live authorizationを共通contractへ写像するだけとする。
- 将来harnessの追加はregistry row、adapter、共通fixture、opt-in live scenarioの追加で閉じる。
- Kiro / Kiro IDEはpackage projectionに残すが、本Intentの5 harness live success集合に数えない。

## Failure classification

| Failure | Classification | Workflow effect | Recovery |
|---|---|---|---|
| contribution欠落・破損 | activation error | state変更なし | composition修復後に再起動 |
| evidence不足 | quality incomplete | non-progress | verifier修復 / evidence収集 |
| duplicate snapshot | benign replay | no-op | 元receipt |
| cross-scope evidence | contract conflict | projection不変 | 正しいscopeで再配送 |
| unknown Judge route | contract error | projection不変 | constraint / adapter修復 |
| first non-progress threshold | productive escalation | running / replan | fresh contextでrepair plan |
| post-replan threshold | non-productive loop | parked / `REPAIR_STALLED` | evidence change / human retry |
| same latch fingerprint | expected stop | 同じparked result | resume condition充足 |
| live credentialなし | external capability absence | deterministic work継続 | 認可環境でopt-in実行 |

## 要件・AC追跡

| 規則群 | 要件 / AC |
|---|---|
| activation / contribution | FR-QRP-001〜003、12、2096-AC01〜05 |
| evidence | FR-QRP-004〜008、13、2096-AC06〜08 |
| progress / replan | FR-QRP-009〜011、2096-AC09〜10 |
| stall / resume / status | FR-LMC-010、FR-STP-003〜006、2096-AC11〜15 |
| harness / replay | FR-HAR-001〜007、NFR-DET / REL / PERF、2096-AC16〜18 |

## 非目標

- generic Loop Monitor、autonomy grant / decision、gate / question認可。
- external Plugin manifest、新stage、固定総retry cap、新規必須artifact。
- PR / GitHub、外部runner / scheduler、常駐supervisor、時間・費用budget。
