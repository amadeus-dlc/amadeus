# Component Methods — CG 観測可能区間と帰属不能残余

## 契約方針

このmethod設計は `requirements.md`、`architecture.md`、`component-inventory.md` を入力にし、`components.md` のC-01〜C-05を実装可能なpublic seamへ落とす。user storiesは未生成であり、team-practicesのclass-free TypeScript、type alias、判別union、parse-don't-validateを適用する。

シグネチャは設計契約であり、識別子の微修正はFunctional Designで許容する。ただし責務、依存方向、closed vocabulary、error category、measured/attribution分岐境界は変更しない。

## C-02 domain types / constructors

```typescript
export type AttributionResult<T, E extends AttributionError = AttributionError> =
  | { readonly type: "ok"; readonly value: T }
  | { readonly type: "err"; readonly error: E };

export type AttributionError =
  | { readonly type: "usage"; readonly field: "stage" | "outliers"; readonly message: string }
  | { readonly type: "decode"; readonly reason: CandidateRejectionReason; readonly sourceId: string }
  | {
      readonly type: "accounting-invariant";
      readonly subject:
        | { readonly type: "window"; readonly windowId: AttributionWindowId }
        | { readonly type: "population"; readonly candidateId?: CandidateId };
      readonly invariant: string;
    };

export type CandidateFamily =
  | "sensor"
  | "swarm"
  | "bolt"
  | "subagent"
  | "loop-monitor"
  | "merge-dispatch"
  | "execution-event-set"
  | "unit-pool-event-set"
  | "transaction-envelope";

export type AttributionCategory =
  | "sensor-execution"
  | "swarm-lifecycle"
  | "bolt-lifecycle"
  | "subagent-lifecycle"
  | "loop-monitor-lifecycle"
  | "merge-dispatch-lifecycle"
  | "execution-lifecycle"
  | "unit-pool-lifecycle"
  | "transaction-lifecycle";

export type CandidateAccountingDisposition =
  | {
      readonly type: "accounted";
      readonly candidateId: CandidateId;
      readonly family: CandidateFamily;
      readonly category: AttributionCategory;
      readonly contributions: readonly CandidateWindowContribution[];
    }
  | {
      readonly type: "rejected";
      readonly candidateId: CandidateId;
      readonly family: CandidateFamily;
      readonly reason: "outside-window" | "empty-after-idle";
    };

export type CandidateWindowContribution = {
  readonly windowId: AttributionWindowId;
  readonly fragments: readonly SecondInterval[];
};

export type AttributionPopulationAccounting = {
  readonly windows: readonly WindowAttribution[];
  readonly dispositions: readonly CandidateAccountingDisposition[];
};

export const CANDIDATE_REJECTION_PRECEDENCE: readonly CandidateRejectionReason[];

export function parseTargetStage(value: string | undefined): AttributionResult<TargetStage>;
export function parseOutlierLimit(value: string | undefined): AttributionResult<OutlierLimit>;
export function parseInterval(start: number, end: number): AttributionResult<SecondInterval>;
```

### Error handling

- `usage`だけがCLI exit 2へ変換される。
- candidate由来のdecode failureはCLI failureではなくinventory診断へ変換される。
- `accounting-invariant`は内部faultであり、正常reportを返さずfail-closedにする。入力corpusの不正と実装defectを同じreasonに潰さない。

## C-01 façade methods

```typescript
export type CliOptions = {
  readonly projectDir?: string;
  readonly space?: string;
  readonly format: "markdown" | "csv" | "json";
  readonly stage: TargetStage;
  readonly outliers: OutlierLimit;
};

export function parseArgs(argv: readonly string[]): Result<CliOptions, UsageError>;

export function buildWindowsWithEvidence(
  records: readonly AttributedRecord[],
): {
  readonly legacy: { readonly windows: readonly StageWindow[]; readonly buckets: ExclusionCounts };
  readonly attributionEvidence: readonly StageWindowEvidence[];
};

export function composeReport(input: {
  readonly scanScope: string;
  readonly corpus: ScannedCorpus;
  readonly reviewBlocks: readonly ReviewBlock[];
  readonly unparseableReviewHeadingCount: number;
  readonly targetStage: TargetStage;
  readonly outlierLimit: OutlierLimit;
}): StageStatsReport;

export function composeReportWithAttribution(input: {
  readonly legacyReport: StageStatsReport;
  readonly corpus: ScannedCorpus;
  readonly evidence: readonly StageWindowEvidence[];
  readonly targetStage: TargetStage;
  readonly outlierLimit: OutlierLimit;
}): AttributionResult<StageStatsReport, AccountingInvariantError>;

export function renderMarkdown(report: StageStatsReport): string;
export function renderCsv(report: StageStatsReport): string;
export function serializeJson(report: StageStatsReport): Record<string, unknown>;
export function main(argv: readonly string[]): number;
```

### `buildWindowsWithEvidence`の互換境界

- 既存`buildWindows(records)`は`buildWindowsWithEvidence(records).legacy`だけを返し、戻り値を増やさない。
- `legacy.windows`の順序、件数、秒数、exclusionは変更前とbyte-for-byte相当の値を保つ。
- `StageWindowEvidence`はstable internal id、同一intent×stage FIFO group、collision状態を持つが、既存windowの採否を変えない。

### `composeReportWithAttribution`のorchestration境界

- C-01だけがC-03、C-04、C-05の呼出し順を所有する。既存`composeReport`はlegacy reportの互換生成だけを担い、C-04を呼ばない。
- C-01は最初にC-05の`selectAttributionWindows`を呼び、そのeligible window集合をC-03とC-04へ同じ値として渡す。次にC-03を1回、C-04の`accountAttributionPopulation`を1回だけ呼ぶ。
- C-04の単一呼出しが`err`なら短絡し、`AttributionPopulationAccounting`が得られた場合だけC-05のreport合成へ進む。
- C-05の`err`も同じ`AttributionResult`のまま`main`へ返す。`main`だけがtyped diagnosticをstderrへ写像してexit 1とし、rendererへ正常reportを渡さない。
- legacy reportを先に値として構成しても、attribution branchが`err`ならstdoutへは一切renderしない。既存public `composeReport`の戻り値互換とCLIのfail-closedを両立する。

### CLI error mapping

| Condition | Output | Exit |
|---|---|---:|
| invalid/missing `--stage` or `--outliers` | usageをstderr、reportなし | 2 |
| unreadable shardを含むpartial sweep | 読めたcorpusのreport、diagnostic | 1 |
| 正常またはattribution population 0 | report | 0 |
| accounting invariant failure | typed diagnostic、正常reportなし | 1 |

## C-03 candidate decoder methods

```typescript
export type AttributionCorpus = {
  readonly records: readonly AttributedRecord[];
  readonly canonicalDuplicateCount: number;
};

export type CandidateInventory = {
  readonly accepted: readonly ExplicitLifecycleInterval[];
  readonly rejected: readonly RejectedCandidate[];
  readonly familyCounts: readonly CandidateFamilyCount[];
  readonly secondaryDiagnostics: readonly SecondaryDiagnostic[];
};

export function buildAttributionCorpus(
  records: readonly AttributedRecord[],
): AttributionCorpus;

export function decodeCandidateInventory(input: {
  readonly corpus: AttributionCorpus;
  readonly targetStage: TargetStage;
  readonly eligibleWindows: readonly AttributionWindow[];
}): CandidateInventory;

export function decodeEventSetEnvelope(
  record: AttributedRecord,
): AttributionResult<readonly DecodedInnerEvent[], EventSetDecodeError>;

export function candidatePrimaryReason(
  findings: readonly CandidateFinding[],
): CandidateRejectionReason;

export function lifecycleIdentityOf(
  candidate: DecodedCandidate,
): AttributionResult<LifecycleIdentity, CandidateDecodeError>;
```

### `buildAttributionCorpus`

- `journalRecordKey`と同じcanonical wire identityで最初のrecordを残す。
- 決定的sort keyはcanonical journal orderingを使う。
- C-01の`ScannedCorpus.records`は変更せず、新しいreadonly配列を返す。

### `decodeEventSetEnvelope`

検査順はpayload存在→JSON形→schema version→digest→event-set id→inner events。失敗時は未知のinner件数を推定せず、outer envelope 1件をrejectionへ送る。既存execution/unit-pool contractから型語彙を再利用するが、writer/repository/runtime projectionは呼ばない。

### `decodeCandidateInventory`

1. 全familyを分類してinventoryへ入れる。
2. intent/stageの明示証拠を読む。
3. family固有identityでgroup化する。
4. start/terminal cardinalityとtimestampを検査する。
5. primary reasonを固定precedenceで1件選び、残りをsecondaryへ送る。
6. 採用候補だけを`ExplicitLifecycleInterval`へ変換する。

関数はwindow containmentで候補を別intent/stageへ割り当てない。`eligibleWindows`は明示intentが対象window集合のintentに存在するか、および明示stageがtarget stageかを検証するためだけに使う。candidateから単一windowを推定せず、accepted intervalはflatなままC-01へ返す。

## C-04 interval accountant methods

```typescript
export function clipInterval(
  interval: SecondInterval,
  window: SecondInterval,
): SecondInterval | null;

export function subtractIntervals(
  interval: SecondInterval,
  exclusions: readonly SecondInterval[],
): readonly SecondInterval[];

export function unionIntervals(
  intervals: readonly SecondInterval[],
): readonly SecondInterval[];

export function intervalSeconds(intervals: readonly SecondInterval[]): number;

export function accountAttributionPopulation(input: {
  readonly windows: readonly AttributionWindow[];
  readonly intervals: readonly ExplicitLifecycleInterval[];
  readonly idleIndex: IdleIndex;
}): AttributionResult<AttributionPopulationAccounting, AccountingInvariantError>;
```

### Method invariants

- 全入力・出力はinteger secondの半開区間。
- `unionIntervals`は入力順に依存せず、nested/parallel/adjacent/overlapを正規化する。
- `subtractIntervals`はまずexclusionをunionし、fragmentの重複や負数を作らない。
- `accountAttributionPopulation`はeligible window全体を決定的順序で1回走査し、windowごとのcategory unionと全categoryのglobal unionを別々に計算する。
- `netSeconds > 0`かつ一意identityのwindowだけを受理し、結果の全numberを`Number.isFinite`で確認する。
- C-04はC-03でacceptedとなったcandidateをcandidate identity単位でちょうど1つのdispositionへ写像する。同じ明示intent×target stageを持つ全eligible windowとのclipを評価し、clipが全windowで空なら`outside-window`、1つ以上clipできるが全windowでidle差引後fragmentが空なら`empty-after-idle`、それ以外は`accounted`とする。この順序はFR-EVT-5の末尾2reasonのprecedenceと一致する。
- `accounted.contributions`は1件以上であり、positive fragmentが残ったwindowごとに`windowId`とfragmentを持つ。同一candidateが複数windowと交差する場合もdispositionは1件のまま、contributionだけを複数持つ。window containmentは明示intent/stageの代替証拠には使わない。
- eligible window 0件でも関数は成功し、accepted candidateは各1件の`outside-window`、window結果は空配列になる。windowが1件・複数件の場合も、入力candidate数とdisposition数は常に一致し、各eligible windowは`windows`結果へちょうど1件現れる。
- C-03のprimary rejectionはC-04へ渡らないため、decode/lifecycle reasonとpost-accounting reasonは同一candidateで競合しない。C-04はC-03のreasonを上書きせず、C-05が両集合をfamily×primary reasonへ一度だけ合流する。

## C-05 report methods

```typescript
export function selectAttributionWindows(input: {
  readonly measured: readonly MeasuredWindow[];
  readonly evidence: readonly StageWindowEvidence[];
  readonly targetStage: TargetStage;
}): AttributionWindowSelection;

export function composeAttributionReport(input: {
  readonly selection: AttributionWindowSelection;
  readonly inventory: CandidateInventory;
  readonly accounting: AttributionPopulationAccounting;
  readonly outlierLimit: OutlierLimit;
}): AttributionResult<StageAttributionReport, AccountingInvariantError>;

export function nearestRankSummary(
  values: readonly number[],
): { readonly n: number; readonly median: number | null; readonly p95: number | null };

export function sortOutliers(
  windows: readonly WindowAttribution[],
): readonly WindowAttribution[];
```

### `selectAttributionWindows`

- target stageだけを選ぶが、既存`StageStatsReport.stages`はfilterしない。
- `netSeconds === 0`は`zero-net-attribution`へ、collision groupは`ambiguous-window-identity`へ計上する。
- measured count、target measured count、eligible count、window exclusion countの会計を保持する。

### `composeAttributionReport`

- category duration summaryはpositive durationだけを入力にする。
- category share、coverage、unattributable rateはeligible全windowを入力にする。
- `--outliers`はsort済みwindowのsliceだけに作用し、集計母集団を変えない。
- candidate rejectionはfamily×primary reasonで1回だけ数える。
- candidate rejectionはC-03の`inventory.rejected`とC-04の単一population結果にある`dispositions[type=rejected]`の非交差unionである。C-04はaccepted candidate数とdisposition数の一致を保証し、C-05は`candidateId`重複を`accounting-invariant`としてfail-closedにして、同一candidateを複数reasonへ数えない。
- C-05はC-04を呼ばず、受領済みaccountingの件数・window identity・恒等式を検証してsemantic reportへ合成する。
- observed factsとinstrumentation hypothesisを別fieldに置く。

## Renderer contract

| Semantic field | Markdown | CSV | JSON |
|---|---|---|---|
| population/reference | 箇条書き | `attribution_ref` section | `attribution.reference` |
| category statistics | table | `attribution_category` | `attribution.categories[]` |
| coverage/overlap | table | `attribution_coverage` | `attribution.coverage` |
| window exclusions | table | `attribution_window_exclusion` | `attribution.windowExclusions[]` |
| candidate reasons | table | `attribution_candidate` | `attribution.candidates[]` |
| outliers | table | `attribution_outlier` | `attribution.outliers[]` |
| methodology | prose | `attribution_methodology` rows | `attribution.methodology` |

rendererは表示用escaping、nullable値の`n/a`表現、section orderingだけを所有する。母集団選択、sort、union、ratio計算は行わない。

## Test seam

| Seam | Primary tests |
|---|---|
| domain constructors / precedence | table-driven unit |
| candidate/event-set decode | synthetic unit + malformed/digest PBT |
| interval algebra / population disposition | example unit + fast-check invariants。eligible window 0/1/複数、0/1/複数windowと交差するcandidate、全idleを含む |
| report population/statistics | unit fixtures |
| façade compatibility | existing t486 characterization |
| CLI/real-corpus/3 renderer parity | t487 integration |
| >65,536 byte stdout drain | formatごとのproducer/full-capture/pipe digest integration |

testはpublic seamを通し、private helperの構造を固定しない。
