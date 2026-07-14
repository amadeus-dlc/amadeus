# Release & Migration Closure Performance Requirements

## 上流と測定境界

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はrelease input digest、registry/docs/projection/receipt/live/Issue/coverage validation、driver別transport/capture/resource receipt、finding集約、report sealである。build、test、provider live、GitHub networkのwall-clock時間とtoken消費には数値SLOを設定しない。

`f`をrelease manifest file数、`b`をその総byte数、`r`をreceipt/evidence row数、`q`をFR coverage mapping数、`i`を完全列挙したIssue search result数、`p`を取得したsearch page数とする。

## Quantified requirements

| ID | Metric | Target | 条件 | 検証 |
|---|---|---:|---|---|
| U06-PERF-01 | release input file digest |各manifest file最大1 streaming read/hash、time `O(b + f log f)`以下、追加memory `O(f + buffer)`以下 |順序変形・file size変形 | I/O/byte/operation count |
| U06-PERF-02 | receipt/live/coverage validation |各receipt/coverage rowを最大1回projectionし、time `O((r+q) log(r+q))`以下、memory `O(r+q)`以下 |全domain | operation/object count |
| U06-PERF-03 | finding aggregation |全findingをdropせず`O(k log k)` canonical sort | multiple red | deterministic digest test |
| U06-PERF-04 | production registry lookup | 4 public driverを各exactly 1回`forDriver`解決 | happy/red fixtures | call count |
| U06-PERF-05 | generated write/check | generation 1回の直後にsame-tree read-only check 1回以上 | package/promotion | receipt trace |
| U06-PERF-06 | Issue create |完全検索でmarker 0件時にpublisher最大1回、open 1件時0回、create後に全page再検索1回 | issue matrix | API spy |
| U06-PERF-07 | duplicate network mutation | page/limit打切り、件数不一致、schema不明、multi/closed/conflict時create/reopen/delete exactly 0件 | failure matrix | publisher spy |
| U06-PERF-08 | report determinism |同一canonical inputのstatus/finding/report digest一致100% | shuffled input | property test |
| U06-PERF-09 | Issue search completeness |各page最大1回取得、全`i`件をcanonical化してtime `O(i log i + p)`以下、memory `O(i)`以下、列挙件数とauthoritative total countが提供される場合は100%一致 | multi-page/limit/schema fixture | page/API spy |

## Resource and contention constraints

- receipt/report/provider summary/machine-local runtimeをinput tree digestへ含めず、self-rehash loopを作らない。
- full repository scanではなくfixed release manifest、packager discovery、docs manifestを正本にする。
- receipt/artifactのraw PTY/JSONL/provider payloadやfull CI logをmemoryへ読み込まず、driver別のclosed summary/digestだけを扱う。
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
7. Issue検索を途中pageで打ち切る、列挙件数とauthoritative total countの不一致をgreenにする、未知schemaから完全性を推測する。

## 非目標

CI所要時間、provider journey時間、GitHub応答時間、package compression速度のSLOやparallelizationはU-06のperformance targetではない。speedのためにsame-tree binding、all-domain AND、read-only drift checkを省略しない。
