# Domain Entities — stage-stats-attribution-service

上流入力（consumes全数）は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`である。U-04 entityは既存`StageStatsReport`へのappend-only semantic sectionとorchestration valueである。

## Window evidence and selection

```typescript
type WindowIdentityEvidence =
  | {
      readonly type: "unique";
      readonly correlationKey: string;
      readonly windowId: AttributionWindowId;
    }
  | {
      readonly type: "ambiguous";
      readonly correlationKey: string;
      readonly collisionMemberCount: number;
    };

type StageWindowEvidence = {
  readonly intent: IntentIdentity;
  readonly stage: TargetStage;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly identity: WindowIdentityEvidence;
};

type AttributionWindowExclusionReason =
  | "zero-net-attribution"
  | "ambiguous-window-identity";

type AttributionWindowExclusionCount = {
  readonly reason: AttributionWindowExclusionReason;
  readonly count: number;
};

type AttributionWindowSelection = {
  readonly targetStage: TargetStage;
  readonly measuredWindowCount: number;
  readonly targetMeasuredWindowCount: number;
  readonly eligible: readonly AttributionWindow[];
  readonly exclusions: readonly AttributionWindowExclusionCount[];
};
```

`exclusions`は上記union順で常に2件、0を含む。`eligible.length`がeligible countの正本で、target count equationをconstructorが保証する。evidenceはlegacy windowを変更するfieldではなくparallel valueである。

## Statistical values

```typescript
type NullableDistributionSummary = {
  readonly n: number;
  readonly median: number | null;
  readonly p95: number | null;
};

type CategoryAttributionSummary = {
  readonly category: AttributionCategory;
  readonly durationSeconds: NullableDistributionSummary;
  readonly share: NullableDistributionSummary;
};

type CoverageAttributionSummary = {
  readonly windowCount: number;
  readonly netSecondsTotal: number;
  readonly observableSecondsTotal: number;
  readonly unattributableSecondsTotal: number;
  readonly overlapSecondsTotal: number;
  readonly aggregateCoverage: number | null;
  readonly aggregateUnattributableRate: number | null;
  readonly observableSeconds: NullableDistributionSummary;
  readonly unattributableSeconds: NullableDistributionSummary;
  readonly overlapSeconds: NullableDistributionSummary;
  readonly coverage: NullableDistributionSummary;
  readonly unattributableRate: NullableDistributionSummary;
};
```

eligible 0件ではtotalは0、aggregate ratesは`null`、全distributionはn=0/nullである。eligible > 0ではtotalsはsafe integer、aggregate coverage=`observable total / net total`、unattributable rate=`1 - aggregate coverage`でfinite 0〜1となる。

## Candidate and instrumentation values

```typescript
type CandidateFamilySummary = {
  readonly family: CandidateFamily;
  readonly observed: number;
  readonly accounted: number;
  readonly rejected: number;
};

type CandidateReasonCount = {
  readonly family: CandidateFamily;
  readonly reason: CandidateRejectionReason;
  readonly count: number;
};

type ObservedInstrumentationFacts = {
  readonly missingTerminalCandidateCount: number;
  readonly highUnattributableWindowCount: number;
};

type InstrumentationHypothesis = {
  readonly id: "candidateBoundary";
  readonly status: "hypothesis";
  readonly statement: string;
};
```

family summaryは9件、reason countは9×17=153件をcanonical nested orderで持つ。全countはnon-negative safe integer。hypothesisにseconds/count estimateを持たせない。

## Outlier and methodology values

```typescript
type AttributionOutlier = {
  readonly windowId: AttributionWindowId;
  readonly intent: IntentIdentity;
  readonly stage: TargetStage;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly netSeconds: number;
  readonly observableSeconds: number;
  readonly unattributableSeconds: number;
  readonly unattributableRate: number;
  readonly overlapSeconds: number;
};

type AttributionMethodology = {
  readonly evidencePolicy: string;
  readonly intervalPolicy: string;
  readonly populationPolicy: string;
  readonly statisticsPolicy: string;
  readonly hypothesisNotice: string;
};
```

methodology stringsはcanonical semantic modelの値であり、rendererごとに別文章を生成しない。既存`HYPOTHESIS_NOTICE`を保持し、net working timeが未検証仮説であることを削らない。

## Canonical attribution section

```typescript
type AttributionReference = {
  readonly scanScope: string;
  readonly unreadableShardCount: number;
  readonly targetStage: TargetStage;
  readonly outlierLimit: OutlierLimit;
  readonly measuredWindowCount: number;
  readonly targetMeasuredWindowCount: number;
  readonly eligibleWindowCount: number;
};

type StageAttributionReport = {
  readonly reference: AttributionReference;
  readonly categories: readonly CategoryAttributionSummary[];
  readonly coverage: CoverageAttributionSummary;
  readonly windowExclusions: readonly AttributionWindowExclusionCount[];
  readonly candidateFamilies: readonly CandidateFamilySummary[];
  readonly candidateReasons: readonly CandidateReasonCount[];
  readonly observedFacts: ObservedInstrumentationFacts;
  readonly instrumentationHypotheses: readonly InstrumentationHypothesis[];
  readonly outliers: readonly AttributionOutlier[];
  readonly methodology: AttributionMethodology;
};

type StageStatsReport = LegacyStageStatsReport & {
  readonly attribution?: StageAttributionReport;
};
```

`LegacyStageStatsReport`は既存field集合の説明名であり、実装では既存`StageStatsReport` interfaceのfieldをそのまま残してoptional `attribution`を追加する。CLIの成功/partial reportではattributionが必須だが、existing `composeReport`とそのunit consumerはfieldなしのlegacy valueを作れる。

`reference.scanScope`はexisting legacy reportの同値、`unreadableShardCount`は同じinvocationでscanしたcorpusの値である。normal/emptyでは0、partialではpositiveとなり、Markdown/CSV/JSONすべてが同じattribution referenceへ投影する。scan scopeをrendererで再構成せず、unreadable countをstderrだけへ閉じ込めない。

## Report invariants

- `reference.eligibleWindowCount = coverage.windowCount = selection.eligible.length`。
- `reference.scanScope = legacyReport.scanScope`かつ`reference.unreadableShardCount = corpus.unreadableShardCount >= 0`。
- category rowsは9、candidate family rowsは9、reason rowsは153。
- category share/coverage summariesのnはeligible count。duration nだけpositive window数。
- familyごとに`observed = accounted + rejected`。
- all-family observedはU-02 inventory total、accountedはaccounting accounted disposition total、rejectedはU-02 rejected + accounting rejected。
- outliers lengthは`min(outlierLimit, eligibleWindowCount)`以下でcanonical sort済み。
- empty populationでも全closed rows、zero count、null summary、methodologyを保持する。
- semantic valueにNaN/Infinity、negative count/seconds/rate、unescaped presentation rowを持たない。

## Result lifecycle

```text
LegacyStageStatsReport
  + valid selection/inventory/accounting -> StageStatsReport(attribution present)
  + cross-component invariant failure   -> AttributionResult.err

StageStatsReport(attribution present)
  -> exactly one renderer -> complete UTF-8 payload
```

renderer用row/entityをdomain modelへ逆流させない。JSON object、CSV row、Markdown lineはpresentation projectionであり正本ではない。

## Dependency boundary

U-04 façadeは既存journal/measurement modulesとU-01〜U-03 public seamをimportできる。U-04からprovider Unitのprivate helperへ依存せず、U-03 accountingをC-05内から呼ばない。source of truthは`packages/framework/core/`で、generated `dist/`/self-install surfaceを直接編集しない。
