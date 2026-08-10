# Business Rules — stage-stats-attribution-service

上流入力（consumes全数）は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`である。U-04は全25 FR・全7 NFRを統合し、特にFR-POP-1〜4、FR-STAT-1〜2、FR-OUT-1〜4、FR-CLI-1〜2、FR-COMP-1、FR-TEST-1〜3を直接閉じる。

## CLI rules

| Rule | Contract | Failure |
|---|---|---|
| BR-SVC-01 Stage | omitted=`code-generation`、1〜64文字ASCII lowercase kebab-case | usage exit 2 |
| BR-SVC-02 Outliers | omitted=10、unsigned decimal integer 0〜100 | usage exit 2 |
| BR-SVC-03 Missing value | flag後に値なし、次tokenが別flag | usage exit 2 |
| BR-SVC-04 Existing formats | existing `--format markdown/csv/json`と`--json` aliasの意味・precedenceを維持 | usage exit 2 |
| BR-SVC-05 Unknown/duplicate | existing parserのunknown/duplicate flag契約を変更しない | existing usage behavior |
| BR-SVC-06 I/O ordering | argv全検証が成功するまでscan/read/renderしない | reportなし |

## Measured compatibility rules

- original `ScannedCorpus.records`をlegacy `scanCorpus → buildWindows → subtractIdle`へそのまま渡す。
- attribution-only canonical dedupをlegacy branchへ戻さない。
- `buildWindows`のpublic return shape、window順、exclusion、stage durations、sensor/model/review bucketを変えない。
- target stageはattributionだけをfilterし、legacy all-stage rowsをfilterしない。
- existing report field/key/CSV section/Markdown sectionをrename、remove、reinterpretしない。attributionは末尾append-only。
- `composeReport`単独の既存input/outputとrenderer outputを維持する。新規target/outlier fieldを受ける場合もoptionalでlegacy計算に使わない。
- `composeReportWithAttribution`はlegacy `scanScope`とcorpus `unreadableShardCount`をC-05の明示scan reference inputへ渡し、3formatのattribution referenceに同値を出す。既存global referenceに値があることだけへ依存しない。

## Selection rules

- target measured windowをunique identity、positive netの両方で選別する。
- exclusive precedenceはambiguous identity→zero net→eligible。
- missing/multiple evidence join、FIFO collision、duplicate start/completeはambiguousであり、containmentで修復しない。
- selection equationをconstructorで検証し、全countはnon-negative safe integer。
- ambiguous/zero windowはmeasured populationから削除せず、attributionだけから除外する。

## Statistical population rules

- duration seconds: categoryごとに`seconds > 0`だけ。
- category share: categoryごとにeligible全window、zeroを含む。
- coverage、unattributable rate、observable/unattributable/overlap seconds: eligible全window。
- medianはevenで中央2値平均、P95はnearest rank `ceil(0.95n)`。
- emptyは`n=0, median=null, p95=null`。
- aggregate seconds/rateとper-window distributionを混ぜない。
- summary inputにNaN/Infinityが1件でもあればtyped invariant errorで、filterして成功扱いしない。

## Candidate accounting rules

- final populationで`observed = accounted + rejected`をfamily別・全体で満たす。
- decode/lifecycle rejectedとpost-accounting rejectedのcandidate IDは非交差。
- candidateは1 primary reasonだけへ入り、secondaryはprimary countへ加えない。
- reason matrixはclosed family 9 × reason 17、canonical順、zero countを含む。
- missing-terminal observed factはprimary/secondary両方を見てcandidate ID単位でdedupする。
- `unattributableRate > 0.5`だけをhigh-unattributable countへ入れ、0.5 exactlyは入れない。
- observed factsとinstrumentation hypothesesを同じfield/labelへ置かない。

## Outlier and ordering rules

- sort keyはunattributable seconds desc、intent/start/end/window ID asc。
- `--outliers`は最後のsliceにだけ適用し、statistics/reasons/populationを変えない。
- categories/families/reasons/methodologyはclosed canonical order、windowsはstable key order。
- locale-sensitive sort、filesystem order、Map insertion orderをpublic orderingに使わない。

## Renderer parity rules

- 3 rendererは同じ`StageStatsReport.attribution` objectだけを読む。
- rendererはselection、ratio、summary、union、reason count、outlier sortを実行しない。
- Markdownはpipe/table/controlをsafe escaping、CSVはquote doubling、JSONは`JSON.stringify` escapingを使う。
- semantic `null`はMarkdown/CSVで`n/a`、JSONで`null`。0と区別する。
- 全semantic areaとcountを3formatに出し、format固有の欠落を許さない。
- existing JSON top-level keysは同値のまま、`attribution`を末尾追加する。

## Exit and output rules

| Condition | stdout | stderr | Exit |
|---|---|---|---:|
| usage | none | usage + field/range | 2 |
| accounting/report invariant | none | typed stable diagnostic | 1 |
| partial unreadable shard | complete report from readable corpus。global/attribution referenceの両方にscan scopeとpositive unreadable count | partial diagnostic | 1 |
| empty attribution population | complete report with n=0/null | none | 0 |
| normal | complete report | none | 0 |

candidate decode rejectionだけではexit 1にしない。partialとcandidate rejectionが共存すればreportを出して1。partialとaccounting invariantが共存すれば正常reportを出さず1。

`process.exit()`は禁止し、`process.exitCode`と自然drainを用いる。stdout payload途中へstderr/diagnosticを混ぜない。

## Read-only and safety rules

- audit、intent state、memory、codekb、generated surfaceへ書かない。
- malformed payloadを修復・上書き・本文echoしない。stable reason/source identityだけをdiagnosticへ出す。
- existing safe escapingをすべての新規user-controlled stringへ適用する。
- external service、database、daemon、AWS resource、runtime dependencyを追加しない。

## Verification rules

existing `tests/unit/t486-stage-stats.test.ts`は次を追加characterizeする。

- unique/zero-net/ambiguous selectionとexclusive count equation。
- positive-only duration、zero-inclusive share、nearest-rank summary、empty null。
- candidate identity非交差、9×17 reason、50% strict boundary、outlier tie/N=0。
- semantic report invariant failureがtyped errorになりpartial modelを返さないこと。
- attribution fieldなしlegacy reportの既存render byte equivalence。

existing `tests/integration/t487-stage-stats.integration.test.ts`は次を証明する。

- `--stage`default/safe/unsafe/missing、`--outliers`0/10/100/-1/101/decimal/non-number/missing。
- synthetic same timestamp別intent/stage、FIFO collision、zero-net、idle、candidate rejection/accounting。
- fixed current-corpus相当fixtureまたは実corpusについて、実行前に`shardCount >= 229`かつ`lineCount >= 136_011`をassertし、同じ入力を単一processの`--stage code-generation --outliers 10`で複数回完走してcount/statistics/outlier一致を確認する。下限未満fixtureはNFR-5 evidenceとして受理しない。
- Markdown/CSV/JSON semantic parityとexisting fields非退行。
- Markdown、CSV、JSONそれぞれのfixtureでencoded output bytesが65,536超であることを先にassertする。各formatについてproducer exit=0、pipe consumer exit=0を別々にassertし、direct full captureとpipe consumerのbyte digestを一致させる。JSONはさらにpipe/full outputへ`jq empty`を実行して成功をassertする。単なるexit code同値やgeneric parserだけでは代替しない。
- normal/partial/usage/invariant exit ladderと実行前後tracked project files不変。

provider Unitの`tests/unit/t486-stage-attribution-domain.test.ts`、`...candidates.test.ts`、`...intervals.test.ts`をU-04から編集しない。

## Scope guard

Issue #2695完了条件1〜10、FR25件、NFR7件を全数維持する。実装量、timeline、current corpusの不足を理由にcategory、family、format、test、oversized pipe、compatibilityを削らない。意味カテゴリへの推定配分、model/harness attribution、event emission変更は追加しない。
