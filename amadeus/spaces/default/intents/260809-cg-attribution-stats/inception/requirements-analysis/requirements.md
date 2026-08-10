# Requirements — CG 観測可能区間と帰属不能残余

## Intent analysis

本Intentは、`stage-stats` が構築する対象stage windowのうち、既存audit event自身がstage、開始、終端、identityを決定的に証明できる区間だけを観測可能時間として集計し、それ以外を帰属不能残余として明示する。目的は「実装・検証・レビュー・PR収束」などの意味カテゴリへ時間を推定配分することではなく、現行計装で説明できる範囲と追加計装が必要な範囲を再実行可能な証拠として示すことである。

要求の正本は [intent-statement.md](../../ideation/intent-capture/intent-statement.md) と [scope-document.md](../../ideation/scope-definition/scope-document.md) であり、Issue [#2695](https://github.com/amadeus-dlc/amadeus/issues/2695) の完了条件1〜10を縮小せず継承する。Brownfieldの技術根拠は `business-overview.md`、`architecture.md`、`code-structure.md` の最新Reverse Engineering断面、作業規範は `team.md` のteam-practicesを含むorg/team/project rulesである。

要求の種類は既存CLIへのself-feature、影響範囲はjournal scan、stage window、Event Set decoder、interval algebra、semantic report、3 renderer、focused testsにまたがるmulti-component、複雑度はStandardである。engineが解決したDepth Standardと強い不一致はない。

## Functional requirements

### Population and target stage

### FR-POP-1: 既存corpusの決定的走査

システムはactive space配下のper-intent audit shardを既存journal contractで正規化し、決定的な順序で走査しなければならない。既存measured分岐は現行`scanCorpus`の入力列をそのまま使い、cross-shard canonical dedupを新設しない。attribution candidate分岐だけが`journalRecordKey`相当のcanonical wire duplicateをlifecycle grouping前に除去する。

- **Priority**: Must
- **Source**: CAP-01、CAP-02、Reverse Engineering `amadeus-journal.ts`
- **Acceptance criteria**:
  - Given v1/v2 shardと同一canonical candidate recordの複製がある、When同じcorpusを複数回集計する、Thenattribution candidateは1件として評価され、reportの件数、秒数、並び順が一致する。
  - Givencanonical `STAGE_STARTED` / `STAGE_COMPLETED` rowのcross-shard複製がある、Whenmeasured windowを構築する、Then変更前と同じ現行`scanCorpus → buildWindows → subtractIdle`結果を保ち、attribution candidate側のdedupをstage/idle window入力へ逆流させない。
  - Given unreadable shardがある、When 集計する、Then 既存partial-sweep契約を維持し、読めたcorpusを出力してexit 1を返す。

### FR-POP-2: 対象stageの選択

システムはattribution targetを`--stage <safe-slug>`で選択し、省略時は`code-generation`を使わなければならない。対象stageの選択は既存の全stage duration統計をfilterしてはならない。

- **Priority**: Must
- **Source**: CAP-07、後方互換条件9
- **Acceptance criteria**:
  - Given `--stage`なし、When CLIを実行する、Then attribution targetは`code-generation`になる。
  - Given安全でないslugまたは値欠落、When CLIを実行する、Then usageを示してexit 2を返しreportを生成しない。

### FR-POP-3: measured populationの非退行

システムは既存の`scanCorpus → buildWindows → subtractIdle`で得るmeasured populationとstage duration統計の意味を維持し、attributionのために既存windowを削除・再分類してはならない。

- **Priority**: Must
- **Source**: CAP-04、完了条件9
- **Acceptance criteria**:
  - Given変更前後で同一fixture、When stage duration、sensor、model、reviewBucketsを比較する、Then既存fieldの値と既存focused testは一致する。
  - Givenidle差引後netが0のwindow、When measured統計を生成する、Then既存measured populationの扱いは変わらない。
  - Givenduplicate stage rowを含むfixture、When変更前後を比較する、Thenmeasured windowの件数・raw/net秒・既存除外件数は一致し、attribution側のwire dedupだけがcandidate件数の二重計上を防ぐ。

### FR-POP-4: attribution eligibilityの分離

システムは`netSeconds > 0`かつ一意なwindow identityを持つ対象stage windowだけをattribution populationへ含めなければならない。

- **Priority**: Must
- **Source**: CAP-04、Issue population/window identity rule
- **Acceptance criteria**:
  - Givenidle差引後netが0、When attribution populationを作る、Then`zero-net-attribution`として除外・計数する。
  - Given同一intent×stageでFIFO対応が衝突または閉じない、When attribution populationを作る、Then関係windowを`ambiguous-window-identity`としてfail-closedに除外・計数し、window containmentで補完しない。

### Candidate inventory and lifecycle evidence

### FR-EVT-1: candidate familyの完全inventory

システムは`SENSOR_*`、`SWARM_*`、`BOLT_*`、`SUBAGENT_*`、`LOOP_MONITOR_*`、`MERGE_DISPATCH_*`、`UNIT_POOL_EVENT_SET_COMMITTED`、`EXECUTION_EVENT_SET_COMMITTED`、transaction envelopeをcandidate familyとして列挙しなければならない。

- **Priority**: Must
- **Source**: CAP-02、Issue event eligibility
- **Acceptance criteria**:
  - Givencorpusに各familyのeventがある、When inventoryを生成する、Then採用件数と理由別不採用件数をfamilyごとに出す。
  - Given必要属性がないfamily、When集計する、Then候補自体を黙って捨てず不採用理由へ計上する。

### FR-EVT-2: Event Setの展開と検証

システムはtransaction、execution、unit-poolのouter envelopeからinner Event Setを展開し、schema、digest、event-set identity、inner lifecycle fieldを検証しなければならない。

- **Priority**: Must
- **Source**: CAP-02、Reverse Engineering decoder debt
- **Acceptance criteria**:
  - Given正常なencoded Event Set、When展開する、Theninner eventをcandidate inventoryへ供給する。
  - Given欠落payload、不正JSON、不正schema、digest mismatch、duplicate envelope、When展開する、Thenintervalを作らず共通rejection taxonomyへ理由別計上する。

### FR-EVT-3: 明示intent・stage identity

システムはnormalized eventまたは同一canonical envelopeのintentがwindowのintentと完全一致し、かつevent自身または同一canonical envelopeが持つ対象stage属性がtarget stageと完全一致する場合だけeligible candidateとしなければならない。

- **Priority**: Must
- **Source**: CAP-03、Issue explicit evidence rule
- **Acceptance criteria**:
  - Givenintentとstage属性がwindow intent・target stageに一致するcandidate、When他のlifecycle条件も満たす、Thenそのintentのwindowだけで採用候補になる。
  - Givenintentがないまたはwindowと異なる、When評価する、Then1 candidate group単位で`missing-intent`または`intent-mismatch`として不採用にし、同時刻に重なる別intentのwindowへ配布しない。
  - Givenstage属性がない、異なる、またはwindow内timestampだけが一致するcandidate、When評価する、Then`missing-stage`または`stage-mismatch`として不採用にし、window containment、同一timestamp、`Duration ms`から推定しない。

### FR-EVT-4: 決定的lifecycle pairing

システムはcategoryごとに定義した明示identityでstartとterminalを一意に対応付け、両端のevent timestampからintervalを作らなければならない。

- **Priority**: Must
- **Source**: CAP-03、Issue lifecycle rule
- **Acceptance criteria**:
  - Given`SENSOR_FIRED`と同一`Fire id`の`SENSOR_PASSED|FAILED|BUDGET_OVERRIDE`が各1件、When評価する、Thenそのtimestamp対をSensor intervalにする。
  - Givenexecution operation/attemptまたはunit-pool attemptのstart/terminal identityが一意かつstageを証明できる、When評価する、Then対応categoryのintervalにする。

### FR-EVT-5: lifecycle rejection taxonomy

システムはcandidate rejectionのclosed vocabularyとprimary reason precedenceを全family・全formatで共通にしなければならない。primary reasonは次の順で最初に成立した1件とする: `malformed-event-set → digest-mismatch → unsupported-event-set-schema → duplicate-event-set-id → missing-intent → intent-mismatch → missing-stage → stage-mismatch → missing-identity → duplicate-start → duplicate-terminal → missing-start → missing-terminal → invalid-timestamp → non-positive-interval → outside-window → empty-after-idle`。他の成立reasonはsecondary diagnosticsとして保持するがprimary件数へ重複計上しない。

- **Priority**: Must
- **Source**: CAP-03、CAP-08
- **Acceptance criteria**:
  - Given各失敗形状を1件ずつ含むfixture、When集計する、Then各decoded lifecycle identity groupはちょうど1つのcanonical primary reasonへ計上され、decoderがidentity groupを作れないenvelope failureはouter envelope 1件を計数単位にする。
  - Givenmissing stage・duplicate start・missing terminalが同時成立するcandidate group、When分類する、Thenprimary reasonは`missing-stage`、残りはsecondary diagnosticsとなる。
  - Givenmalformed payloadとintent/stage欠落が同時成立するouter envelope、When分類する、Thenprimary reasonは`malformed-event-set`となり、未知のinner candidate数を推定しない。
  - Givenduplicate canonical wire row、Whenjournal重複排除する、Thenそれ自体をlifecycle duplicateと誤計上せず、重複排除後に残る競合だけをduplicate lifecycleとして扱う。

### Interval algebra and accounting

### FR-INT-1: 半開区間とwindow clip

システムはinteger-secondの半開区間`[start,end)`を使用し、candidate intervalを対象stage windowとの共通部分へclipしなければならない。

- **Priority**: Must
- **Source**: CAP-05、完了条件1
- **Acceptance criteria**:
  - Given境界に接するが重ならない2区間、Whenunionする、Then共有秒を生成しない。
  - Givenwindow外へはみ出すinterval、Whenclipする、Thenwindow内部分だけを保持し、0以下の結果は除外理由へ送る。

### FR-INT-2: idle spanのinterval差引

システムは既存approval、park、session idle spanとcandidate intervalの交差を除去しなければならない。

- **Priority**: Must
- **Source**: CAP-05、完了条件1
- **Acceptance criteria**:
  - Giveninterval中央にidle span、When差し引く、Then前後の最大2区間へ分割しidle秒をobservableに含めない。
  - Giveninterval全体がidle、When差し引く、Thenpositive intervalを生成しない。

### FR-INT-3: category内union

システムは同一window・同一categoryのnested、parallel、overlap intervalをunionし、category durationを二重計上してはならない。

- **Priority**: Must
- **Source**: CAP-05、完了条件1・6
- **Acceptance criteria**:
  - Given入れ子・同一・部分重複interval、Whencategory unionを計算する、Then被覆秒は1回だけ数える。
  - Given離れたinterval、Whenunionする、Then各区間を保持しdurationは各長さの合計になる。

### FR-INT-4: 全category unionと残余恒等式

システムはcategory間の重複を許容した個別軸とは別に全category unionを計算し、`observableSeconds`と`unattributableSeconds`を導出しなければならない。

- **Priority**: Must
- **Source**: CAP-06、完了条件2
- **Acceptance criteria**:
  - Given全eligible window、When集計する、Then`observableSeconds + unattributableSeconds = netSeconds`かつ残余は0以上になる。
  - Given全eligible window、When比率を計算する、Then値はfiniteで`coverage + unattributableRate = 1`になる。

### Statistics and diagnostic output

### FR-STAT-1: category統計の母集団

システムはcategory durationの中央値/P95をpositive category duration集合から、category shareの中央値/P95をzeroを含むattribution-eligible全windowから計算しなければならない。

- **Priority**: Must
- **Source**: CAP-06、Issue statistics rule
- **Acceptance criteria**:
  - Givencategory durationが`0, 10, 20`の3window、When統計を作る、Thenduration populationは`10,20`、share populationは3windowになる。
  - Givenpositive durationが0件、When出力する、Then`n=0`と`n/a`を用いNaN/Infinityを出さない。

### FR-STAT-2: coverageとoverlap統計

システムはwindow単位およびaggregateのobservable、unattributable、coverage、unattributable rate、category重複と全category unionの差を報告しなければならない。

- **Priority**: Must
- **Source**: CAP-06、完了条件2・3・4
- **Acceptance criteria**:
  - Givencategory間で同じ秒を覆うinterval、When集計する、Thencategory duration合計は100%を超え得るがobservableは全category unionだけを数える。
  - Given対象stageのeligible population、When出力する、Thencoverage median/P95とunattributable rate median/P95が同じwindow集合を表す。

### FR-OUT-1: measurement referenceとmethodology

システムはtarget stage、scan scope、measured population、attribution population、window除外、candidate採否規則、interval規則、統計母集団をmeasurement referenceとmethodologyに出さなければならない。

- **Priority**: Must
- **Source**: CAP-08、完了条件8
- **Acceptance criteria**:
  - Given任意format、Whenreportを読む、Then第三者が同じcorpusとargvで母集団と規則を再現できる情報がある。
  - Givenzero-netまたはambiguous window、When出力する、Thenmeasured件数とattribution件数の差を理由別に説明できる。

### FR-OUT-2: 決定的outlier

システムは`unattributableSeconds`降順で上位N windowを出し、tieを`intent → startedAt → completedAt`昇順で解決しなければならない。

- **Priority**: Must
- **Source**: CAP-07、CAP-08、完了条件5
- **Acceptance criteria**:
  - Given`--outliers 0`、When出力する、Thenoutlier行は0件だが集計値は変わらない。
  - Given同じ帰属不能秒の複数window、When出力する、Thentie順序は全formatで一致する。

### FR-OUT-3: missing instrumentation候補

システムはcandidate family×rejection reason、`unattributableRate > 0.5`のwindow件数、exact lifecycleのterminal欠落をmissing instrumentation evidenceとして報告しなければならない。

- **Priority**: Must
- **Source**: CAP-08、完了条件4・7
- **Acceptance criteria**:
  - Givenstageやterminalを欠く既存event、When出力する、Thenobserved factとして件数を示し意味カテゴリへの時間配分は行わない。
  - Given`candidateBoundary`仮説、When出力する、Thenobserved factと異なるfield/sectionに分離し、仮説を観測値として扱わない。

### FR-OUT-4: 3 rendererのsemantic parity

システムは1つのcanonical `StageStatsReport` semantic modelからMarkdown、CSV、JSONを生成し、母集団、規則、除外件数、category、coverage、overlap、outlier、missing instrumentationを一致させなければならない。

- **Priority**: Must
- **Source**: CAP-09、完了条件8・9
- **Acceptance criteria**:
  - Given同じargvとcorpus、When3formatを生成する、Thenformat固有の表現差を除き同じsemantic valuesを持つ。
  - Given既存report consumer、Whenappend-only sectionを追加する、Then既存top-level field/sectionの意味と既存testsを壊さない。

### CLI and failure behavior

### FR-CLI-1: `--outliers` validation

システムは`--outliers <N>`を10進整数0〜100として受け付け、省略時10を使わなければならない。

- **Priority**: Must
- **Source**: CAP-07、完了条件5
- **Acceptance criteria**:
  - Given0、10、100、Whenparseする、Then各値を受理する。
  - Given-1、101、小数、非数値、値欠落、Whenparseする、Thenusageを示してexit 2を返す。

### FR-CLI-2: 空母集団・exit ladder・read-only

システムは安全なtarget stageのattribution populationが0でも正常空reportを返し、既存のexit ladderとread-only性を維持しなければならない。

- **Priority**: Must
- **Source**: CAP-07、完了条件5・9
- **Acceptance criteria**:
  - Given対象stageのeligible windowが0、When実行する、Thenexit 0、`n=0`、比率`n/a`を全formatで返す。
  - Given正常入力、WhenCLIを実行する、Thenintent state、audit shard、codekbその他project fileを変更しない。

### Verification and compatibility

### FR-COMP-1: 既存公開契約のappend-only互換

システムは既存stage duration、sensor、model、reviewBuckets、`--json` alias、format選択、stdout drainの契約を維持しなければならない。

- **Priority**: Must
- **Source**: CAP-10、完了条件9、Issue #2700 follow-up
- **Acceptance criteria**:
  - Given既存t486/t487、When変更後に実行する、Then全件passする。
  - Givenproducer stdoutをpipe consumerへ接続する、When大容量出力を生成する、Then`process.exit()`による未drain終了を再導入しない。

### FR-TEST-1: 合成fixtureによる閉じた仕様証明

システムはintent/stage identity、lifecycle identity、欠落/重複start/terminal、複合欠陥precedence、duplicate stage/candidate row、FIFO衝突、zero-net、half-open境界、clip、idle、nested/parallel/overlap、category/global union、argv境界を合成fixtureで検証しなければならない。

- **Priority**: Must
- **Source**: CAP-10、完了条件1〜6
- **Acceptance criteria**:
  - Given各規則の最小fixture、Whenunit/PBT/integration testを実行する、Then採否理由、秒数、恒等式、順序を個別にassertする。
  - Given別stageの同一timestamp event、When集計する、Thentarget stageへ誤帰属しない。
  - Given同じtarget stageのwindowが複数intentで時間重複し、一方のintentだけにeligible lifecycleがある、When集計する、Thenintervalは一致するintentのwindowだけへ計上される。

### FR-TEST-2: 実corpus相当の再実行証明

システムは実corpus相当fixtureまたは固定snapshotで、採用/不採用件数、coverage、帰属不能率、上位outlierを`--stage code-generation --outliers 10`から再実行可能にしなければならない。

- **Priority**: Must
- **Source**: CAP-10、完了条件7
- **Acceptance criteria**:
  - Given固定corpus、When同じcommandを複数回実行する、Then件数、統計、outlier順序が一致する。
  - Given現行計装でterminal/stageが不足するfamily、When集計する、Then不足を黙って除外せずmissing instrumentationへ表す。

### FR-TEST-3: 全formatのoversized pipe完全性

システムは出力追加後のMarkdown、CSV、JSONそれぞれを65,536 bytes超にする決定的fixtureで、full captureとpipe consumerのbyte digest parityを検証しなければならない。

- **Priority**: Must
- **Source**: CAP-10、完了条件10、PR #2702 / #2706後の残責務
- **Acceptance criteria**:
  - Given各formatのfixture、Whenproducerをfull captureとpipeで実行する、Thenfixture precondition`bytes > 65,536`、producer/consumer exit 0、byte digest一致をassertする。
  - GivenJSON format、Whenconsumerへ渡す、Then上記に加え`jq empty`が成功する。

## Non-functional requirements

### NFR-1: Accounting correctness

全eligible windowの秒数と比率は非負・finiteであり、秒と率の恒等式を満たさなければならない。整数秒の丸め規則は全category・全rendererで共通にする。

### NFR-2: Determinism and reproducibility

同じcorpus、argv、tool versionからは同じ母集団、統計、並び順、semantic outputを生成しなければならない。filesystem列挙順、shard順、Map insertion順に結果を依存させない。

### NFR-3: Fail-closed evidence policy

stage、start、terminal、identity、window identityのいずれかが決定不能なcandidateを観測時間へ含めてはならない。不足は明示的な理由と件数として可観測にする。

### NFR-4: Pipe and process reliability

3formatのstdoutはconsumerがEOFまで読み切れるようdrainされなければならない。usage error、partial sweep、normal completionのexit codeは既存契約どおり2、1、0とする。

### NFR-5: Current-corpus scale

少なくともReverse Engineeringで測定した229 shard・136,011 audit row規模を、追加の外部serviceやruntime dependencyなしで処理できなければならない。具体的な時間上限は本Issueで規定せず、correctnessを犠牲にする最適化は行わない。

### NFR-6: Maintainability and testability

interval algebra、candidate decoding、semantic report、rendererはpure seamでunit/PBT可能にし、既存Biome complexity ceiling 15を新規関数で超えない。generated `dist/`やself-install surfaceをsource of truthとして編集しない。

### NFR-7: Read-only and data safety

集計CLIは入力corpusを読み取るだけで、audit、intent state、memory、codekbを変更しない。malformed inputを修復・上書きせずreport上の診断へ変換する。

## Constraints

- Issue #2695記載範囲と完了条件1〜10を本Intent内で全て満たし、timelineや実装都合による縮小をしない。
- 新規audit eventまたは既存event emissionの変更を導入しない。既存eventが持つ証拠だけを使う。
- stage帰属をwindow containment、同一timestamp、`Duration ms`、周辺eventから推定しない。
- 帰属不能残余を「実装」「検証」「レビュー」「PR収束」等へ推定配分しない。
- モデル/ハーネス軸の帰属、特定lifecycleの効率化、stage window identity自体の修正は行わない。
- Bun-only TypeScript ESM monorepo、既存journal/Event Set codec、既存test frameworkを使用し、runtime dependencyを増やさない。
- framework sourceは`packages/framework/core/`を正本とし、生成物`dist/`およびself-install surfaceをcommit対象にしない。

## Assumptions

| ID | Assumption | Rationale / validation owner |
|---|---|---|
| A-1 | Sensorは現corpusで最初に完全採用可能なcategoryである | `Fire id`、`Stage slug`、start/terminalが揃う。Application Designで契約を再確認する |
| A-2 | Execution/Unit-poolは全family inventoryに含めるが、現corpusの不足属性を補完しない | Reverse Engineeringでexecution terminal 0、unit-pool stage 0を実測。Functional Designでreason taxonomyを確定する |
| A-3 | `--stage`はattribution targetだけを選び、既存全stage統計を維持する | 後方互換条件9と既存report contractに基づく。Application Designでschemaを固定する |
| A-4 | 現corpus値は移動し得るため、要求の正本は値そのものではなく再実行手順と恒等式である | Construction開始前にorigin/mainへ再接地しfixture/snapshotを更新する |

## Out of scope

- 新規audit eventまたは計装変更
- 帰属不能残余の意味カテゴリへの推定配分
- 観測された特定lifecycleのperformance改善
- モデル/ハーネス軸の帰属（Issue #2518）
- `STAGE_STARTED → STAGE_COMPLETED` window identity自体の改修

上記以外をOutへ追加する場合はIssue #2695のscope変更として扱い、本Intentの通常設計判断では行わない。

## Open questions

Requirements Analysisを変える未解決質問はない。Q1はsemi autonomyの`AUTO_DECIDED`でAに確定した。後続stageでは次の実装設計を確定する。

- interval algebra、candidate decoder、semantic model、rendererを分離するmodule seam
- 現origin/mainへ再接地したときのline evidence、real-corpus値、test file採番

## Traceability summary

| Scope capability | Requirements |
|---|---|
| CAP-01 | FR-POP-1〜4、FR-OUT-4 |
| CAP-02 | FR-EVT-1〜2 |
| CAP-03 | FR-EVT-3〜5 |
| CAP-04 | FR-POP-3〜4 |
| CAP-05 | FR-INT-1〜3 |
| CAP-06 | FR-INT-4、FR-STAT-1〜2 |
| CAP-07 | FR-POP-2、FR-OUT-2、FR-CLI-1〜2 |
| CAP-08 | FR-OUT-1〜3 |
| CAP-09 | FR-OUT-4 |
| CAP-10 | FR-COMP-1、FR-TEST-1〜3 |

Issue #2695の完了条件1〜10は、CAP-01〜CAP-10を介して少なくとも1件のFRとacceptance criteriaへ全件追跡される。

### Issue #2695 completion criteria matrix

| 完了条件 | Requirement / acceptance evidence |
|---|---|
| 1. 合成分節 | FR-EVT-3〜5、FR-INT-1〜3、FR-TEST-1: Fire id、nested/parallel、idle、別intent/stage同秒、欠落lifecycle |
| 2. 恒等式・finite | FR-POP-4、FR-INT-4、NFR-1、FR-TEST-1: zero-net/ambiguous除外後の秒・率恒等式 |
| 3. 重複秒排除 | FR-INT-3〜4、FR-STAT-2: category内unionと全category union |
| 4. fail-closed理由 | FR-POP-4、FR-EVT-3〜5、FR-OUT-1/3/4: identity/window/start/terminalを推定せず全formatへ計数 |
| 5. 実corpusとargv境界 | FR-POP-2、FR-OUT-2、FR-CLI-1〜2、FR-TEST-2: `--stage code-generation --outliers 10`と0/100/-1/101/小数/非数値 |
| 6. 50%超不足境界 | FR-OUT-3、FR-TEST-2: `unattributableRate > 0.5`をobserved factと別Issue候補として報告 |
| 7. 赤くなるtest | FR-TEST-1〜2、NFR-1〜3: 分節・precedence・恒等式を壊すfixture/PBT/integration |
| 8. 3形式parity | FR-OUT-4、FR-EVT-5: 同じsemantic model、母集団、規則、primary除外件数 |
| 9. 既存契約非退行 | FR-POP-2〜3、FR-COMP-1: stage duration、sensor、model、reviewBuckets、focused tests |
| 10. oversized pipe | FR-TEST-3、NFR-4: 各format >65,536 bytes、consumer/full capture digest parity、JSON `jq empty` |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-09T14:00:03Z
- **Iteration:** 1
- **Scope decision:** none

顧客価値と大半のscopeは明確だが、集計値を左右する3つの決定契約が未確定であり、0質問判定のまま実装へ進めない。

### Findings

- BLOCKER | FR-EVT-3/FR-INT-1はstage一致とwindow clipを規定する一方、architectureが必要条件として明示する「eventまたはcanonical envelopeのintentがwindowのintentと一致すること」を要件化していない。同一target stageのwindowが複数intentで時間重複し、一方のintentにだけeligible lifecycleがあるfixtureでは、そのintervalを元intentのwindowだけに計上するか、重なる全windowへ計上するかを判定できず、observableSecondsとoutlierが実装依存になる。intent一致、intent欠落・不一致時のfail-closed理由、計数単位をacceptance criteriaへ追加する必要がある。
- BLOCKER | FR-EVT-5は各candidateを「ちょうど1つのcanonical primary reason」へ計上すると要求するが、missing stage・missing terminal・duplicate identity・malformed Event Set等が同時成立するときのprecedenceとcanonical reason vocabularyをOpen questionsへ未確定のまま残している。この選択はcandidate×reason、missing instrumentation、3形式parity、実corpus snapshotという公開report値を変えるため、単なる内部設計ではない。重複欠陥を含むfixtureごとのprimary reason precedenceと理由集合を要件または明確化回答で固定する必要がある。
- BLOCKER | FR-POP-1のcanonical dedupとFR-POP-3の既存measured population非退行の適用境界が確定していない。Reverse Engineeringでは現scanCorpusにcross-shard canonical dedupがなく、architectureのデータフローはdedup後の列を既存stage/idle再構成にも渡している。canonical STAGE_STARTED/STAGE_COMPLETEDの複製を含むcorpusでは、dedupをwindow構築前に行えば既存measured件数が変わり得る一方、attribution候補だけに適用すればFR-POP-1のreport母集団安定性の読みと衝突する。measured層とattribution層それぞれのdedup入力、後方互換の比較対象、duplicate stage-row fixtureの期待値を明文化する必要がある。
- FOLLOW-UP | Traceability summaryはCAP-01〜CAP-10からFRへの対応だけで、Issue #2695の完了条件1〜10それぞれをどのFR・acceptance criterionが証明するかを直接示していない。「全件追跡される」という総括を、完了条件番号→FR/ACの行別matrixへ展開するとscope縮小と検証漏れを後続gateで機械的に検出しやすい。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-09T14:06:11Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の3件のBLOCKERとFOLLOW-UPは解消され、Issue #2695の全scope、testability、traceability、1問への修正を満たしている。

### Findings

- None
