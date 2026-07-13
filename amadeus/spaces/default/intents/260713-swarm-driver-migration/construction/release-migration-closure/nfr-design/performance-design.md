# Release & Migration Closure Performance Design

## 入力契約と測定境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。対象はrelease input digest、registry/docs/projection/platform/live/Issue/coverage validation、finding集約、report sealである。build/test/provider live/GitHub networkのwall-clockとtoken消費にSLOを置かない。

`f`をmanifest file数、`r`をreceipt/evidence row数、`q`をcoverage mapping数、`k`をfinding数とする。

## Processing pipeline

| Component | Processing | Time | Additional memory | External mutation |
|---|---|---:|---:|---:|
| `ReleaseInputDigester` | path stable sort、各file 1 read/hash | `O(f log f)` | `O(f)` | 0 |
| `ProductionRegistryClosureCheck` | 4 driverを各1回resolve | fixed `O(1)` | `O(1)` | 0 |
| projection/docs/platform validator | manifest/receipt key index | `O(r log r)`以下 | `O(r)` | 0 |
| `NativeLiveIndexValidator` | sealed rowをdriver keyでexact match | `O(r log r)` | `O(r)` | 0 |
| `RequirementCoverageValidator` | FR key index + evidence reference検証 | `O(q log q)` | `O(q)` | 0 |
| `FindingAggregator` |全finding dedupe + canonical sort | `O(k log k)` | `O(k)` | 0 |
| `MigrationIssueEnsurer` | bounded search/create/re-search | API call count bound | bounded | create最大1 |
| `ClosureReportSealer` | canonical domain/receipt/finding projection | output線形 | output線形 | immutable write 1 |

## Scan and digest decisions

- full repository heuristic scanを行わず、release input manifest、packager discovery、docs manifestを正本にする。
- 各manifest fileはcandidate生成で最大1回read/hashし、domain checker間でdigest tableをimmutable共有する。
- receipt/report/provider summary/machine runtimeをinput digestへ含めず、report generationによるself-rehashを防ぐ。
- receipt/live rowはclosed summaryだけを読み、raw provider payload/full CI logをmemoryへロードしない。
- checkerは最初のredで停止せず全domain/findingを評価するが、同じsubject/domain keyは重複評価しない。

## Generation and Issue operation bounds

projection/setup/docsはgeneration 1回の直後にsame-tree read-only check 1回以上を記録する。write successだけのgreen receiptを作らない。

Issue ensureはopen marker 0件ならpublisher最大1回、create後search 1回以上、open 1件ならcreate 0、multi/closed/conflictならcreate/reopen/delete 0とする。検査のうちIssue publisher以外はread-onlyである。

## Verification seams and regression gate

| Requirement | Seam | Verification |
|---|---|---|
| U06-PERF-01/02 | read/hash/operation/object counters | shuffled manifest/receipt size ladder |
| U06-PERF-03/08 | canonical aggregator/sealer | repeat/shuffle digest 100% |
| U06-PERF-04 | registry spy | public `forDriver` count 4 |
| U06-PERF-05 | generation receipt trace | write→same-tree check order/count |
| U06-PERF-06/07 | GitHub publisher spy | 0/1/multi/closed/race matrix |

input順でdigest変化、receipt自己参照、write-only green、quadratic rescan、Issue複数mutation、early-return finding dropをmerge blockerにする。cache、database、queue、parallel distributed workerは非適用である。
