# Release & Migration Closure Performance Design

## 入力契約と測定境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。対象はrelease input digest、registry/docs/projection/platform/live/Issue/coverage validation、driver別transport/capture/resource receipt、finding集約、report sealである。build/test/provider live/GitHub networkのwall-clockとtoken消費にSLOを置かない。

`f`をmanifest file数、`b`を総byte数、`r`をreceipt/evidence row数、`q`をcoverage mapping数、`k`をfinding数、`i`を完全列挙したIssue result数、`p`を取得page数とする。

## Processing pipeline

| Component | Processing | Time | Additional memory | External mutation |
|---|---|---:|---:|---:|
| `ReleaseInputDigester` | path stable sort、各file 1 streaming read/hash | `O(b + f log f)` | `O(f + buffer)` | 0 |
| `ProductionRegistryClosureCheck` | 4 driverを各1回resolve | fixed `O(1)` | `O(1)` | 0 |
| projection/docs/platform validator | manifest/receipt key index | `O(r log r)`以下 | `O(r)` | 0 |
| `NativeLiveIndexValidator` | sealed row、driver別transport/capture/resource variant、versioned invocation contract/canonical argv digestをexact match | `O(r log r)` | `O(r)` | 0 |
| `RequirementCoverageValidator` | FR key index + evidence reference検証 | `O(q log q)` | `O(q)` | 0 |
| `FindingAggregator` |全finding dedupe + canonical sort | `O(k log k)` | `O(k)` | 0 |
| `MigrationIssueEnsurer` |全page列挙、件数照合、canonical sort、必要時create後に完全再検索 | `O(i log i + p)` + network | `O(i)` | create最大1 |
| `ClosureReportSealer` | canonical domain/receipt/finding projection | output線形 | output線形 | immutable write 1 |

## Scan and digest decisions

- full repository heuristic scanを行わず、release input manifest、packager discovery、docs manifestを正本にする。
- 各manifest fileはcandidate生成で最大1回read/hashし、domain checker間でdigest tableをimmutable共有する。
- receipt/report/provider summary/machine runtimeをinput digestへ含めず、report generationによるself-rehashを防ぐ。
- receipt/live rowはclosed summaryだけを読み、raw PTY/JSONL/provider payload/full CI logをmemoryへロードしない。
- checkerは最初のredで停止せず全domain/findingを評価するが、同じsubject/domain keyは重複評価しない。

## Generation and Issue operation bounds

projection/setup/docsはgeneration 1回の直後にsame-tree read-only check 1回以上を記録する。write successだけのgreen receiptを作らない。

Issue ensureはcreate前後ともpaginationを終端まで取得し、authoritative total countが提供される場合は列挙件数と照合する。完全検索でopen marker 0件ならpublisher最大1回、open 1件ならcreate 0とする。page/limit打切り、件数不一致、schema不明、multi/closed/conflictではcreate/reopen/deleteを0件にする。検査のうちIssue publisher以外はread-onlyである。

## Verification seams and regression gate

| Requirement | Seam | Verification |
|---|---|---|
| U06-PERF-01/02 | byte/read/hash/operation/object counters | shuffled manifest/receipt/file-size ladder |
| U06-PERF-03/08 | canonical aggregator/sealer | repeat/shuffle digest 100% |
| U06-PERF-04 | registry spy | public `forDriver` count 4 |
| U06-PERF-05 | generation receipt trace | write→same-tree check order/count |
| U06-PERF-06/07/09 | GitHub search/publisher spy | 0/1/multi-page/limit/total-count/schema/closed/race matrix |

input順でdigest変化、receipt自己参照、write-only green、quadratic rescan、Issue検索打切り／件数不一致／未知schemaのgreen化、Issue複数mutation、early-return finding dropをmerge blockerにする。cache、database、queue、parallel distributed workerは非適用である。
