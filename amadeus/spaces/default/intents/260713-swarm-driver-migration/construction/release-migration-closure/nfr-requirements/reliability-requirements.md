# Release & Migration Closure Reliability Requirements

## 上流とreliability model

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-06はrelease serviceのuptimeを保証せず、all-match closure、same-tree provenance、immutable report、single Issue publisher、driver別transport/capture/resource receipt、process terminal後のredacted native indexでfalse release closureを0件にする。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U06-REL-01 | red/missing/stale/extra domain receiptを含むclosed report | exactly 0件 | all failure matrix |
| U06-REL-02 |同一canonical inputのstatus/finding/report digest一致 | 100% | shuffled/repeated property |
| U06-REL-03 | 3 provider/4 driver/2-1-1以外のregistry success | exactly 0件 | composition fixtures |
| U06-REL-04 | source/generated drift、orphan、hand editのgreen receipt | exactly 0件 | projection fixtures |
| U06-REL-05 | FR-01〜FR-26のcoverage欠落 | exactly 0件 in closed | coverage map test |
| U06-REL-06 | 4 native driver live欠落をfake/skip/floor/legacyで代替 | exactly 0件 | evidence matrix |
| U06-REL-07 |未取得pageを含むmarker一致Issue重複、不完全検索、誤reference | exactly 0件 in closed | multi-page/publisher race/state test |
| U06-REL-08 | credential/prompt/raw provider/session/pathのreport/index漏えい | exactly 0件 | canary scan |
| U06-REL-09 | transport/capture/resource、binding/control、process terminal、terminal-retained evidenceの必須組合せを欠くclosed report | exactly 0件 | driver別receipt matrix |

availability SLA、backup、multi-regionはlocal/CI closure checkerにN/Aである。recoveryはblocked domainをsame-tree replacement receiptで再収集する。input treeが変わった場合はRPO的な部分再利用を行わずnew candidateとして全receiptを再評価する。

## Failure behavior and recovery

| Failure | Required result | Recovery |
|---|---|---|
| registry incomplete/fake/unavailable | blocked、該当U-01〜U-05へ戻す | same-tree correction/test |
| projection/docs drift | blocked | source修正→generate→read-only check |
| macOS/Linux receipt missing/red/stale | blocked |同一candidateで再実行 |
| native live missing/redacted failure | blocked、provider Unitへ戻す | sealed replacement summary |
| transport/capture/resource receipt不一致、ready signal単独、process未terminal | blocked、該当provider Unitへ戻す | terminal後のsealed replacement summary |
| coverage missing/skip/unimplemented | blocked | valid test/live ID追加 |
| Issue open 0 | single publisher create + re-search | valid reference seal |
| Issue open複数/closed-only/create競合 | mutation継続0、blocked | human/external state resolution |
| Issue search page打切り/件数不一致/schema不明 | mutation 0、blocked |完全検索可能な状態で再実行 |
| tree/contract変更 |旧report immutable | new candidate全再評価 |

reportは全findingをcanonical aggregateし、first-errorで他のblockerを隠さない。blockedをwarning/partial closedへdowngradeしない。

## Durability and consistency

- release input manifestはauthored/generated inputを固定し、receipt/report/machine runtimeを除外する。
-全receiptをrepository/tree/contract/candidateへexact bindし、duplicate ID、stale SHA、別worktreeを拒否する。
- write command後のsame-tree read-only checkだけをprojection/docs/setup receiptとして受理する。
- `closed` reportはimmutable receipt digestをsealし、input tree変更時に上書きしない。
- Issueはpaginationを終端まで取得し、authoritative total countが提供される場合は列挙件数と照合してopen exactly 1、reference number/URL/body/status一致後だけsealする。

## Observability and supportability

findingはdomain/code/subject、expected/observed digestを持ち、canonical orderで全件を返す。receipt/reportはcandidate、repository/tree/contract、platform/run SHA、driver/harness/profile、transport/capture/resource receipt、必要なbinding/control/process terminal/terminal-retained-evidence digest、closed verdict/countを相関する。

provider payload、prompt、credential、raw CI log、absolute home/worktreeを診断へ入れない。missing evidenceはclosed codeでowner Unitへroutingし、U-06がprovider behaviorを再解析・修正しない。

## Regression gate and review

次をmerge blockerにする。

1. registry/projection/docs/platform/live/Issue/coverage deterministic suiteの失敗またはskip。
2. macOS/Linux receipt、macOS 4-driver live、FR-01〜FR-26 coverageの欠落。
3. same-tree/contract binding、read-only drift check、closed immutabilityの破壊。
4. Issue duplicate/closed/conflict時の追加mutation、0.2.0削除のscope内実装。
5. raw/secret evidence保存、fake/skip/floor/legacyのlive昇格、Windows成功表明。
6. Agent Teamsのready signal単独での成功化、Ultra Code headless stdioとinteractive PTYの代替、Codex/Kiro capture variantの取り違え。
7. Issue検索のpage/limit打切り、件数不一致、未知schemaを完全な結果集合として扱う。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-14T11:03:24Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `performance-requirements.md` U06-PERF-06/U06-PERF-07、`scalability-requirements.md` U06-SCALE-06、Issue workflow | marker検索はopen 0/1/複数を正しく分類する前提だが、検索結果`i`を定義した後に全page走査、APIの`total_count`照合、結果上限到達時のfail-closedを要求していない。`search exactly 1回以上`はAPI call回数しか拘束せず、2件目が未取得pageにある場合にopen 1件と誤認し、single publisher／Issue一意性のproofがfalse greenになり得る。 | create前とcreate後の両検索で、marker一致の全結果集合をpaginationまたは信頼できるtotal-countで完全取得し、取得件数・total count・canonical result-set digestを照合する。page/limit打切り、結果不完全、検索schema不明は`blocked`とし、`i`に対する走査量とAPI page数の検証条件を追加する。 |
| 2 | Minor | `performance-requirements.md` U06-PERF-01、`scalability-requirements.md` U06-SCALE-01 | file内容のhash時間をfile数`f`だけで`O(f log f)`と表している。各fileを1回読む制約は妥当だが、総byte数に依存するhash I/Oを定数扱いするため、巨大fileを含む入力では記載したtime boundを満たさない。 | 総入力byte数`b`を導入し、streaming hash + path canonical sortを`O(b + f log f)`、追加memoryを`O(f + buffer)`として測定する。file read/hash 1回というcall-count条件は併記する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `required-sections` | PASS（5/5成果物） | performance、security、scalability、reliability、tech-stackの各成果物が必須H2構造を満たす。 |
| `upstream-coverage` | PASS（5/5成果物） | 5成果物すべてが`business-logic-model`、`business-rules`、`requirements`を参照し、brownfield `technology-stack`も反映している。 |
| `linter` / `type-check` | N/A | 対象成果物はMarkdownのみで、TypeScript/JavaScript outputはない。 |

### Summary

Critical 0件、Major 1件、Minor 1件のためreviewer基準ではREADYとする。CLIをservice uptime/latency SLOとして扱わず、6 domainとcoverageのall-match、same-tree provenance、macOS native/Linux deterministic/Windows対象外、driver別transport・capture・resource receipt、ready signal単独成功禁止、raw/credential非保存は上流と整合している。Issue検索完全性はfalse closureを防ぐため実装前に受入条件へ反映すること。

### Post-review remediation

- Major: create前後のIssue検索をpagination終端までの完全列挙、authoritative total countが提供される場合の件数照合、page/limit打切り・件数不一致・schema不明時のmutation 0／blockedへ具体化した。
- Minor: release inputの総byte数`b`を導入し、streaming hashの時間境界を`O(b + f log f)`、追加memoryを`O(f + buffer)`へ修正した。
- Iteration 2の上限到達後の是正であり、追加review iterationは実施しない。最終センサーは是正後の成果物へ再実行する。
