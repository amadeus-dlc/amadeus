# Release & Migration Closure Performance Requirements

## 上流と測定境界

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はrelease input digest、registry/docs/projection/receipt/live/Issue/coverage validation、finding集約、report sealである。build、test、provider live、GitHub networkのwall-clock時間とtoken消費には数値SLOを設定しない。

`f`をrelease manifest file数、`r`をreceipt/evidence row数、`q`をFR coverage mapping数、`i`をIssue search result数とする。

## Quantified requirements

| ID | Metric | Target | 条件 | 検証 |
|---|---|---:|---|---|
| U06-PERF-01 | release input file digest |各manifest file最大1 read/hash、time `O(f log f)`以下、memory `O(f)`以下 |順序変形 | I/O/operation count |
| U06-PERF-02 | receipt/live/coverage validation | time `O((r+q) log(r+q))`以下、memory `O(r+q)`以下 |全domain | operation/object count |
| U06-PERF-03 | finding aggregation |全findingをdropせず`O(k log k)` canonical sort | multiple red | deterministic digest test |
| U06-PERF-04 | production registry lookup | 4 public driverを各exactly 1回`forDriver`解決 | happy/red fixtures | call count |
| U06-PERF-05 | generated write/check | generation 1回の直後にsame-tree read-only check 1回以上 | package/promotion | receipt trace |
| U06-PERF-06 | Issue create | marker 0件時にpublisher最大1回、open 1件時0回、create後search exactly 1回以上 | issue matrix | API spy |
| U06-PERF-07 | duplicate network mutation | multi/closed/conflict時create/reopen/delete exactly 0件 | failure matrix | publisher spy |
| U06-PERF-08 | report determinism |同一canonical inputのstatus/finding/report digest一致100% | shuffled input | property test |

## Resource and contention constraints

- receipt/report/provider summary/machine-local runtimeをinput tree digestへ含めず、self-rehash loopを作らない。
- full repository scanではなくfixed release manifest、packager discovery、docs manifestを正本にする。
- receipt/artifactのraw provider payloadやfull CI logをmemoryへ読み込まず、closed summary/digestだけを扱う。
- all-match checkerは最初のfindingで停止せず全findingを集約するが、同じsubjectを重複評価しない。
- Issue publisher以外の検査はread-onlyとし、network service、database、cacheを追加しない。

## Regression gate

次をmerge blockerにする。

1. input順でfinding/report digestが変わる。
2. receipt/reportをinput digestへ含めて自己参照する。
3. generated write成功だけでread-only checkなしのgreen receiptを作る。
4. source/receipt/resultを複数回scanしてquadraticになる。
5. Issue ensureが1 invocationで2件以上create/reopen/deleteする。
6. red domainをearly returnで隠し、全findingを報告しない。

## 非目標

CI所要時間、provider journey時間、GitHub応答時間、package compression速度のSLOやparallelizationはU-06のperformance targetではない。speedのためにsame-tree binding、all-domain AND、read-only drift checkを省略しない。
