# Business Rules — candidate-evidence-inventory

上流入力（consumes全数）は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`である。U-02はFR-POP-1/3、FR-EVT-1〜5、FR-OUT-3、FR-TEST-1〜2、NFR-1〜3/5〜7のcandidate側を実現する。

## Inventory rules

| Rule | Contract |
|---|---|
| BR-CAN-01 Complete classification | 9 familyの対象eventはacceptedまたはrejectedへ必ず1回入る |
| BR-CAN-02 Unknown events | 9 family外のaudit rowはcandidateではない。candidate countへ混ぜず、legacy measured inputからも削除しない |
| BR-CAN-03 Attribution-only dedup | canonical wire duplicateは最初の1行だけをdecodeし、duplicate countへ加える |
| BR-CAN-04 Duplicate separation | wire duplicateを`duplicate-start`/`duplicate-terminal`にしない。dedup後に残る同group複数boundaryだけをlifecycle duplicateとする |
| BR-CAN-05 One group, one outcome | candidate IDはacceptedまたはrejectedのどちらか一方へちょうど1回入る |
| BR-CAN-06 Outer failure unit | innerをdecodeできないenvelopeはouter 1件をcountし、未知inner数を推定しない |

## Explicit evidence rules

- intentはnormalized rowのintentまたは同一canonical envelopeのexplicit origin intentだけを使う。
- stageはeventの`Stage slug`/`Stage`または同一canonical envelopeのexplicit origin stageだけを使う。
- grouping/candidate identityには明示stageまたは専用missing-stage tokenを必ず含める。別stage groupを合流せず、missing-stage memberをtarget stage groupへ補完しない。
- target stage windowが時間的に重なる、同じtimestampを持つ、`Duration ms`を持つという事実はintent/stage/identityの証拠にならない。
- candidate intentがeligible windowのintent集合に存在しなければ`intent-mismatch`、欠落なら`missing-intent`。
- candidate stageがtarget stageと異なれば`stage-mismatch`、欠落なら`missing-stage`。
- accepted intervalは単一window IDを持たない。明示intent、stage、family、category、identity、intervalをflatに保持し、U-03が同一intent/stage window全体へclipする。

## Lifecycle cardinality rules

- startとterminalは各1件だけが正常である。
- startが2件以上なら`duplicate-start`、terminalが2件以上なら`duplicate-terminal`。
- 0件ならそれぞれ`missing-start`、`missing-terminal`。
- timestampはvalidなUTC instantからlosslessにinteger secondへ変換できなければ`invalid-timestamp`。rounding、local timezone変換、`Duration ms`による端点補完をしない。
- `start >= terminal`は`non-positive-interval`。boundary接触を1秒へ膨らませない。
- 複数terminal vocabularyが同じgroupに現れた場合、種類が違っても`duplicate-terminal`である。

## Event Set rules

- execution、unit-pool、loop-monitor、transaction envelopeはpayload存在→JSON形→schema/digest→event-set ID→inner eventの安全な依存順で検査する。ただしprimaryは検査順ではなく収集できた全findingへ17値precedenceを適用して決める。
- digestは保存されたcanonical representationと同じalgorithm/bytesで再計算し、decoded objectのproperty orderから独自digestを作らない。
- 同一`EventSetId`がcanonical wire dedup後に複数outer envelopeへ現れた場合、最初も採用せず関係envelopeを`duplicate-event-set-id`としてfail-closedにする。
- unsupported schemaでは既知schemaに似たfieldをbest-effort decodeしない。
- inner eventのintent/stageがouterの値と矛盾する場合はそれぞれ`intent-mismatch`/`stage-mismatch`。inner明示値をouterで上書きしない。
- objectまでparseできる場合はunsupported schemaとdigest mismatchを両方検出でき、primary=`digest-mismatch`、secondary=`unsupported-event-set-schema`とする。malformedで安全に評価不能なfindingは推定しない。
- loop-monitor/transactionの現supported schemaはattribution用start/terminal対を持たないため、完全inventory後にmissing boundaryとしてrejectする。event名の類似やtransaction commit timestampからboundaryを合成しない。

## Closed event classifier

- exact `EXECUTION_EVENT_SET_COMMITTED`、`UNIT_POOL_EVENT_SET_COMMITTED`、`LOOP_MONITOR_EVENT_SET_COMMITTED`をdirect prefixより先に分類する。
- `SENSOR_*`、`SWARM_*`、`BOLT_*`、`SUBAGENT_*`、`LOOP_MONITOR_*`、`MERGE_DISPATCH_*`はprefix内の全eventを対応familyへ入れる。
- boundary tableにないprefix eventは`evidence-only`で、identity groupへ保持するがstart/terminal件数へ加えない。
- 既出familyに一致しない`*_TRANSACTION_COMMITTED`をtransaction-envelopeへ入れる。
- exact/prefix/transactionのいずれにも一致しないeventだけをnon-candidateとする。

## Rejection precedence

primaryは次の17値の最初の成立reasonであり、入力順に左右されない。

`malformed-event-set → digest-mismatch → unsupported-event-set-schema → duplicate-event-set-id → missing-intent → intent-mismatch → missing-stage → stage-mismatch → missing-identity → duplicate-start → duplicate-terminal → missing-start → missing-terminal → invalid-timestamp → non-positive-interval → outside-window → empty-after-idle`

U-02が生成するのは先頭15 reasonまでである。`outside-window`と`empty-after-idle`はU-03がaccepted candidateのpost-accounting dispositionとして生成する。U-02はこの2値を先取りしない。

複合findingではprimary以外をcandidate ID付きsecondary diagnosticへ残す。例としてmissing stage + duplicate start + missing terminalはprimary=`missing-stage`、secondary=`duplicate-start`,`missing-terminal`である。

## Family and category rules

family/categoryは次の1対1 mapping以外を許可しない。

| Family | Category |
|---|---|
| sensor | sensor-execution |
| swarm | swarm-lifecycle |
| bolt | bolt-lifecycle |
| subagent | subagent-lifecycle |
| loop-monitor | loop-monitor-lifecycle |
| merge-dispatch | merge-dispatch-lifecycle |
| execution-event-set | execution-lifecycle |
| unit-pool-event-set | unit-pool-lifecycle |
| transaction-envelope | transaction-lifecycle |

## Forbidden behavior

- input `ScannedCorpus.records`をsort、splice、dedup、置換しない。
- current runtime graph、worktree、state checkboxから欠落stage/intentを補わない。
- event-set writer/repository/replayをdecodeのために実行しない。
- missing attributeをunknown catch-all familyとして黙って落とさない。
- renderer label、format、statistics、idle/clipロジックをU-02へ持ち込まない。
- candidate rejectionをthrowまたはCLI exit 1へ変換しない。

## Verification rules

`tests/unit/t486-stage-attribution-candidates.test.ts`は少なくとも次を固定する。

- pair-capableなsensor、swarm、bolt、subagent、merge-dispatch、execution、unit-poolの完全pairとmissing identity/stage/start/terminal。現schemaでpairを持たないloop-monitor/transactionは完全inventoryとmissing-start/missing-terminal rejectionを検証する。
- 各prefixの補助/未知eventがevidence-onlyとして黙って消えず、boundary cardinalityも増やさないこと。
- sensorの`Fire id` pairingと3 terminal vocabulary。
- execution/unit-poolの正常Event Set、payload欠落、不正JSON、unsupported schema、digest mismatch、duplicate ID、malformed inner。
- canonical wire duplicateがcandidate/lifecycle duplicateへ加算されないこと。
- duplicate start/terminalと全複合findingのprimary/secondary分離。
- same timestampの別intent/stageを合流しないこと。
- 同一intent/family/identityをtarget stageと別stageで再利用してもgroup/candidate IDが非交差であること。missing-stage memberも別groupになること。
- unsupported schema + digest mismatchでprimary/secondaryがfixed precedenceどおりになること。
- input permutationに対するinventoryの決定性をproperty-basedに検査すること。
- 229 shard・136,011 row以上相当fixtureでO(n) memory、再実行結果一致、input配列不変を確認すること。
