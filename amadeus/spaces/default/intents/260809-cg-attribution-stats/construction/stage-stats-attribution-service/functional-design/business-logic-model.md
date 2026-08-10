# Business Logic Model — stage-stats-attribution-service

上流入力（consumes全数）は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`である。本Unitは既存Stage Statistics CLIを互換façadeとして維持し、U-01〜U-03を単一processで統合する。

## Service orchestration

```mermaid
sequenceDiagram
    actor Operator
    participant CLI as C-01 Stage Stats CLI
    participant Legacy as Existing measured pipeline
    participant Report as C-05 Attribution report
    participant Candidate as C-03 Candidate inventory
    participant Interval as C-04 Population accounting
    participant Renderer as Selected renderer

    Operator->>CLI: argv
    CLI->>CLI: parse TargetStage / OutlierLimit before I/O
    CLI->>CLI: read corpus once
    CLI->>Legacy: original records, unchanged
    Legacy-->>CLI: legacy StageStatsReport + measured windows + idle index
    CLI->>Report: selectAttributionWindows(measured, evidence, targetStage)
    Report-->>CLI: one eligible window selection
    CLI->>Candidate: attribution-only corpus + same eligible windows
    Candidate-->>CLI: inventory + flat explicit intervals
    CLI->>Interval: eligible windows + accepted intervals + idle index, once
    Interval-->>CLI: accounting or typed invariant error
    CLI->>Report: selection + inventory + accounting + outlier limit
    Report-->>CLI: canonical attribution section or typed invariant error
    CLI->>Renderer: one StageStatsReport
    Renderer-->>Operator: complete stdout; natural drain; exit 0/1
```

<!-- Text fallback: CLIはargvをI/O前に検証し、corpusを1回読む。original recordsでlegacy reportを作り、window selectionを先に確定して同じeligible集合をcandidate decoderとinterval accountantへ渡す。accountingは1回だけ呼び、成功時だけ1 semantic reportを選択rendererへ渡してstdoutをdrainする。 -->

`composeReportWithAttribution`の固定順は次のとおりである。

1. existing `composeReport`でlegacy reportを値として作る。
2. `selectAttributionWindows`を1回呼ぶ。
3. original recordsのreadonly copyからU-02 `buildAttributionCorpus`と`decodeCandidateInventory`を各1回呼ぶ。
4. selectionの同じ`eligible`配列とinventory.acceptedをU-03 `accountAttributionPopulation`へ1回渡す。
5. U-03が`err`なら短絡し、legacy reportもrenderしない。
6. legacy reportの`scanScope`とcorpusの`unreadableShardCount`を明示的なscan referenceとして、selection/inventory/accountingとともに`composeAttributionReport`へ渡し、cross-component invariantを再検証する。
7. attribution sectionをlegacy reportへappend-onlyで付加する。

C-05はU-03を呼ばず、rendererもselection、union、ratio、statistics、sortを再計算しない。

## Compatible measured-window evidence

`buildWindowsWithEvidence(records)`は既存FIFO window constructionと同じ1 passで、legacy outputとは別のparallel evidenceを作る。

- `legacy.windows`と`legacy.buckets`は変更前`buildWindows(records)`と同じ順序・件数・秒数・exclusionである。
- existing `buildWindows(records)`は`.legacy`だけを返すため公開shapeを変えない。
- evidence correlation keyは`intent × stage × startedAt × completedAt`のlength-prefixed canonical tuple。
- keyがmeasured windowへ1対1対応すればstable `AttributionWindowId`、0/複数対応、duplicate start/complete、FIFO collisionがあればambiguous evidenceを持つ。
- evidenceは既存windowの採否を変えず、attribution selectionだけが消費する。

`subtractIdle`後の`MeasuredWindow`とevidenceは同じcanonical tupleでjoinする。join missing/multipleも`ambiguous-window-identity`であり、containmentや配列indexで補完しない。

## Attribution window selection

`selectAttributionWindows`は全measured windowを保持したまま、`window.stage === targetStage`だけをattribution候補にする。

候補ごとのexclusive decision order:

1. identity evidenceがuniqueでなければ`ambiguous-window-identity`。
2. uniqueだが`netSeconds <= 0`なら`zero-net-attribution`。
3. uniqueかつ`netSeconds > 0`なら`AttributionWindow`。

したがって同時成立はambiguousへ1回だけ数え、次を満たす。

```text
measuredWindowCount = legacy measured population across all stages
targetMeasuredWindowCount = eligibleWindowCount
                          + zeroNetAttributionCount
                          + ambiguousWindowIdentityCount
```

target stage選択はlegacy `StageStatsReport.stages`をfilterしない。eligible windowは`intent → start → end → windowId`順である。

`composeAttributionReport`のFunctional Design signatureは次のinputを要求する。上流の責務・呼出順は変えず、partial corpus再現情報をC-01からC-05へ明示的に通す。

```typescript
composeAttributionReport({
  selection,
  inventory,
  accounting,
  outlierLimit,
  scanReference: {
    scanScope: legacyReport.scanScope,
    unreadableShardCount: corpus.unreadableShardCount,
  },
});
```

## Cross-component reconciliation

`composeAttributionReport`は次をfail-closedに検証してからreportを作る。

- selection eligible window IDsとaccounting window IDsが全単射。
- inventory accepted candidate IDsとaccounting disposition candidate IDsが全単射。
- inventory rejected IDsとaccepted/disposition IDsが非交差。
- accounted/rejected dispositionのcandidate familyがinventoryと一致する。
- accountingのper-window秒・率恒等式が全件成立する。
- candidate totalについて`inventory observed = accounted + decode/lifecycle rejected + post-accounting rejected`。

違反時は`accounting-invariant`を返し、重複candidateを複数reasonへ数えず正常reportを出さない。

## Statistics

`nearestRankSummary(values)`は入力を変更せずfinite値だけを許し、数値昇順copyから次を返す。

- `n=0`: `{n:0, median:null, p95:null}`。
- odd median: 中央値。
- even median: 中央2値の算術平均。
- p95: index `ceil(n * 0.95) - 1`のnearest-rank値。

categoryごとのduration summaryは`seconds > 0`のwindowだけ、share summaryはeligible全windowの0を含む。coverage、unattributable rate、observable/unattributable/overlap secondsのsummaryはすべてeligible全windowを同一母集団にする。空母集団で0やNaNを統計値として偽装しない。

aggregate totalはwindow値のsafe integer sumで、coverage aggregateをwindow coverageの平均として再定義しない。per-window distribution summaryとaggregate seconds/rateを別fieldに置く。

## Candidate evidence and missing instrumentation

final candidate reportは9 familyをclosed orderで常に出す。

- `observed`: U-02 family population。
- `accounted`: U-03 accounted dispositions。
- `rejected`: U-02 primary rejection + U-03 post-accounting rejection。
- reason matrix: 9 family × 17 primary reasonを全行出し、0 countも保持する。

U-02 rejected IDsとU-03 rejected disposition IDsを非交差unionし、candidate 1件を1 primary reasonへだけ加える。`missingTerminalCandidateCount`はprimaryまたはsecondaryに`missing-terminal`を持つcandidate IDをdedupして数える。`highUnattributableWindowCount`は厳密に`unattributableRate > 0.5`のeligible window数である。

これらは`observedFacts`へ置く。`candidateBoundary`など追加計装案は`instrumentationHypotheses`へ文章とstatus=`hypothesis`で置き、秒・採用件数へ使わない。

## Deterministic outliers

`sortOutliers`は全eligible `WindowAttribution`のcopyを次でsortする。

1. `unattributableSeconds`降順。
2. intent identity code-point昇順。
3. `measuredInterval.start`昇順。
4. `measuredInterval.end`昇順。
5. window ID code-point昇順。

`outlierLimit`で先頭N件をsliceするのは全statistics/aggregate/candidate countを確定した後である。N=0はoutlier行だけを0件にし、母集団を変えない。

## Canonical report and renderers

既存`StageStatsReport`へoptional `attribution` fieldを末尾追加する。existing `composeReport`単独の戻り値はfieldを持たず、既存render byte sequenceを維持する。CLIの正常/partial pathは`composeReportWithAttribution`を使うため常にcanonical attribution sectionを持つ。

| Semantic area | Markdown | CSV | JSON |
|---|---|---|---|
| reference/population | `## Attribution reference`にscan scope/unreadable shardを含む | `attribution_ref` rowsに`scan_scope`/`unreadable_shard_count`を含む | `attribution.reference.scanScope`/`unreadableShardCount`を含む |
| category statistics | fixed-order table | `attribution_category` rows | `attribution.categories[]` |
| coverage/overlap | fixed-order table | `attribution_coverage` rows | `attribution.coverage` |
| exclusions | 2 reason rows | `attribution_window_exclusion` rows | `attribution.windowExclusions[]` |
| candidates/reasons | family and 9×17 reason tables | `attribution_candidate` rows | `attribution.candidates` |
| outliers | sorted table | `attribution_outlier` rows | `attribution.outliers[]` |
| methodology | labelled prose/list | `attribution_methodology` rows | `attribution.methodology[]` |

Markdown/CSVはexisting safe/csv escapingを再利用し、null summaryを`n/a`、JSONは`null`で表す。rendererはfinite check済みsemantic numberだけを受け、format別の計算をしない。

## CLI and process lifecycle

`parseArgs`は既存`--project-dir`、`--space`、`--format`、`--json`を維持し、`--stage`default=`code-generation`、`--outliers`default=10を追加する。usage failureはscan前にstderr + exit 2、stdoutなし。

normal/emptyはrender後0、partial corpusは読めた結果をrenderし、attribution referenceにも同じ`scanScope`とpositive `unreadableShardCount`を保持してstderr diagnostic + 1、accounting invariantはstdoutなしでstderr typed diagnostic + 1である。usageが最優先、次にinvariant、最後にpartial statusを適用する。

top-levelは既存どおり`process.exitCode = main(...)`を使い、`process.exit()`を呼ばない。rendererの完全UTF-8 payloadを`process.stdout.write`へ1回渡し、自然なevent-loop drainに任せる。

## Issue #2695 completion closure

| 完了条件 | Functional Design evidence |
|---|---|
| 1 合成分節 | U-02 inventory + U-03 clip/idle/union fixtureをU-04 integrationで結合 |
| 2 恒等式・finite | cross-component reconciliationとzero/empty semantic model |
| 3 重複秒排除 | category/global union値を単一reportへそのまま掲載 |
| 4 fail-closed理由 | 9×17 reason、window exclusion、typed invariant |
| 5 実corpusとargv | default stage/outlier、0/100/invalid、fixed snapshot |
| 6 50%超不足境界 | strict `> 0.5` observed factとhypothesis分離 |
| 7 赤くなるtest | provider pure tests + t486 report + t487 integration/snapshot |
| 8 3形式parity | 1 semantic modelとfield mapping |
| 9 既存非退行 | legacy branch/input/outputのappend-only characterization |
| 10 oversized pipe | Markdown/CSV/JSON各>65,536 bytes、各producer/consumer exit 0、full/pipe digest、JSON `jq empty` |

## Complexity

report compositionはwindow/candidate行数にO(n)、statistics/outlierはO(n log n)、reason matrixは固定153行である。scale integrationは入力fixtureまたは実corpusについて`shardCount >= 229`かつ`lineCount >= 136_011`を実行前conditionとしてassertし、その同じ入力を単一processで最後まで完走させる。runtime dependency、disk cache、network、sampling、approximationを追加しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-09T23:58:12Z
- **Iteration:** 1
- **Scope decision:** none

主要な統合契約は整合するが、measurement referenceのpartial再現情報、oversized JSONの規定検証、current-corpus規模の証明が設計から欠落しており、全scopeを閉じていない。

### Findings

- BLOCKER | FR-OUT-1とservices.mdのPartial corpus契約はscan scopeとunreadableShardCountをmeasurement referenceへ含めることを要求するが、StageAttributionReport.referenceにはtargetStage、outlierLimit、window件数しかなく、composeAttributionReportの入力にもscan診断を渡す経路がない。既存legacy fieldに存在すると仮定するだけでは3形式のattribution referenceでpartial母集団を再現できず、normal/partialのsemantic差も閉じないため、orchestration入力、canonical reference、3renderer mappingへscanScopeとunreadableShardCountを明示的に通す必要がある。
- BLOCKER | FR-TEST-3のJSON acceptance criteriaは各formatのfixtureが65,536 bytes超であること、producerとconsumerがともにexit 0であること、full captureとpipeのdigest一致に加えて`jq empty`成功を要求する。U04はgenericなJSON parse成功とexit一致だけへ弱めており、両processが非0でも一致すれば通り得るうえ`jq empty`証拠がない。Markdown・CSV・JSONそれぞれについてbytes precondition、producer/consumer exit 0、digest parityを固定し、JSONでは`jq empty`も明記する必要がある。
- BLOCKER | NFR-5は229 shard・136,011 audit row以上を処理できることを要求するが、U04のverificationは「current-corpus相当snapshot」とだけ記し、fixtureまたは実corpusのshard数・row数を事前assertする契約がない。Complexity節の宣言だけでは下限未満の小型snapshotでもtestが通るため、integration evidenceに229 shard以上かつ136,011 row以上のpreconditionと単一process完走を明示する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:02:18Z
- **Iteration:** 2
- **Scope decision:** none

前回3件のBLOCKERはすべて解消され、scan referenceのC-01→C-05経路と3renderer parity、全3formatのoversized pipe証明、229 shard・136,011 line以上の単一process scale証明が上流契約と矛盾なく固定され、Issue #2695のscope縮小もない。

### Findings

- None
