# Business Rules — population-interval-accounting

上流入力（consumes全数）は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`である。U-03はFR-EVT-3/5、FR-INT-1〜4、FR-STAT-2のper-window値、FR-OUT-3のpost-accounting reason、FR-TEST-1〜2、NFR-1〜6を実現する。

## Interval rules

| Rule | Contract |
|---|---|
| BR-INT-01 Half-open | 全区間は`[start,end)`。`start < end`のsafe integer secondだけ |
| BR-INT-02 Clip | `max(start)`から`min(end)`まで。0以下は`null` |
| BR-INT-03 Union | nested/identical/overlap/adjacentをmergeし、離れた区間だけを保持 |
| BR-INT-04 Subtract | exclusionsをunionしてから差し引き、positive fragmentだけを返す |
| BR-INT-05 Duration | union済みdurationをsafe integerで加算し、負数、NaN、Infinity、overflowを拒否 |
| BR-INT-06 Purity | input array/objectをsort・splice・mutateしない |

## Eligibility and identity rules

- U-03へ渡せるwindowは`netSeconds > 0`かつ一意`AttributionWindowId`を持つattribution-eligible windowだけである。zero-net/ambiguous除外はU-04が事前に行う。
- それでもU-03はdefense-in-depthとしてwindow ID重複、non-positive/non-safe netをtyped invariant errorにする。
- candidate IDも入力内で一意でなければならない。
- candidateは明示intentとstageが完全一致するwindowだけへclipする。timestamp containmentをidentity evidenceへ昇格させない。
- `AttributionWindow.netSeconds`は`measuredInterval - same-intent idle union`の秒数と一致しなければならない。
- idle indexに別intentのintervalがあってもcandidate/windowから差し引かない。

## Disposition rules

- accepted input candidate 1件につきdispositionはちょうど1件。
- raw clipが全eligible same-intent/stage windowで0件なら`outside-window`。
- raw clipは1件以上あるがidle差引後のpositive fragmentが全windowで0件なら`empty-after-idle`。
- positive fragmentが1件以上あれば`accounted`。outside/empty reasonを同時に持たない。
- accountedはcandidateのfamily/categoryを変換せず保持し、1件以上のcontributionを持つ。
- contributionは存在するwindow IDだけを参照し、1windowにつき最大1件、fragmentsは1件以上でpositive。
- U-02 rejected candidateは入力されないため、decode reasonとpost-accounting reasonを同一candidateへ二重計上しない。

## Window accounting rules

canonical category 9値を全windowに必ず出し、0秒categoryを省略しない。

各windowで次を満たす。

```text
0 <= categorySeconds <= netSeconds
0 <= observableSeconds <= netSeconds
categorySumSeconds = sum(categorySeconds)
overlapSeconds = categorySumSeconds - observableSeconds >= 0
unattributableSeconds = netSeconds - observableSeconds >= 0
observableSeconds + unattributableSeconds = netSeconds
coverage = observableSeconds / netSeconds
unattributableRate = unattributableSeconds / netSeconds
coverage + unattributableRate = 1
```

秒数はsafe integer、率はfinite numberかつ0〜1である。floating additionの丸めにより最後の恒等式を再計算で比較せず、`unattributableRate = 1 - coverage`として同じdenominatorから導出し、両値をfinite/range検査する。

category間の同秒被覆を許すため`categorySumSeconds`とcategory share合計はnet/100%を超え得るが、global union由来のobservable/coverageは超えてはならない。

## Population invariants

- input candidate ID集合とdisposition candidate ID集合は全単射。
- input window ID集合とwindow result ID集合は全単射。
- accounted contribution candidate ID/window IDはそれぞれinput集合に属する。
- 全candidateがrejectedでも全eligible windowを0 accountingとして返す。
- eligible window 0件でも成功し、window結果0件、candidateごとにoutside-window dispositionを返す。
- どのpermutationでも同じcanonical resultになる。

## Forbidden behavior

- U-03でwindowをzero-net/ambiguous理由へ分類しない。
- candidateのintent/stage/family/category/reasonをdecode・補完・変更しない。
- measured population、window selection、statistics、outlier、methodology、rendererを計算しない。
- category durationを単純加算してunionの代わりにしない。
- all-category observableをcategory seconds合計から導出しない。
- invariant failureでpartial success、NaN/Infinity、negative residualを返さない。
- expected post-accounting rejectionをthrow/exitへ変換しない。

## Verification rules

`tests/unit/t486-stage-attribution-intervals.test.ts`はexample testとfast-checkで次を固定する。

- half-open境界、clip、nested/identical/parallel/adjacent/overlap union。
- interval中央/両端/全体idle、複数overlap exclusions、positive fragmentだけの差引。
- 同一timestampの別intent/stage windowへcontributionができないこと。
- eligible window 0/1/複数、candidate 0/1/複数window交差、全idle。
- candidate/disposition、window/resultの全単射とduplicate IDのtyped error。
- category unionとglobal unionの差、100%超category sum、全秒/率恒等式。
- input permutation・nested interval生成に対するdeterminism/idempotence。
- zero candidate/window、229 shard・136,011 row以上相当のfragment規模、全number finite、入力不変。
