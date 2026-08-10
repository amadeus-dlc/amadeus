# Logical Components — population-interval-accounting

## Scope and upstream applicability

本設計はpresent consumeの `business-logic-model.md` を、C-04のin-process pure library境界へ写像する。`security-requirements.md`と`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentであり、NFR Requirements由来のdeclared IDは存在しない。Requirements AnalysisのNFR statementとaccepted Application Designはcontext evidenceとしてだけ参照する。`performance-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`はlibrary kindの本Unitで非適用で、対応outputもengineがpruneしている。

C-04はC-02 domain contractだけへ依存し、event field、C-03 decoder内部、C-05 statistics、renderer、filesystemへ到達しない。新しいdeployable、AWS resource、network service、database、queue、daemonは作らない。

## Logical component inventory

| Component | Responsibility | Input | Output | Isolation rule |
|---|---|---|---|---|
| Population Invariant Gate | window/candidate ID、net、safe integer、集合一意性を検査 | windows + intervals | validated population view | 部分accounting開始前にfail-closed |
| Idle Index Builder | intent別idle intervalをunionしcanonical順へ正規化 | readonly idle spans | invocation-local `IdleIndex` | 別intentのidleを共有しない |
| Window Matcher | candidateとsame intent/stageのwindowを決定的順で選ぶ | validated candidate/windows | eligible pairs | timestamp containmentでintentを推定しない |
| Interval Algebra | clip、union、subtract、secondsをpure実行 | safe integer intervals | positive canonical fragments | 入力collectionを変更しない |
| Disposition Ledger | candidateごとに1 statusと0..n contributionを構成 | raw clips + fragments | accounted/rejected disposition | candidate ID全単射を維持 |
| Window Bucket Accumulator | category union、global union、overlap、residual、rateを計算 | accounted contributions | canonical `WindowAttribution` | statistics/rendererを持たない |
| Invariant Transaction | 全window値とpopulation bijectionを最終検査しatomic return | staged windows/dispositions | complete accountingまたはtyped err | partial resultを公開しない |

これらは単一 `amadeus-stage-attribution-intervals.ts` 内のlogical responsibilityで、別processやpublic serviceへ分割しない。内部staging collectionはInvariant Transactionのcommit前にmodule外へ露出しない。

## Dependency and data flow

```mermaid
flowchart LR
    IN["Typed windows / candidates / idle"] --> GATE["Population Invariant Gate"]
    GATE --> IDLE["Idle Index Builder"]
    GATE --> MATCH["Window Matcher"]
    IDLE --> ALG["Interval Algebra"]
    MATCH --> ALG
    ALG --> LEDGER["Disposition Ledger"]
    LEDGER --> BUCKET["Window Bucket Accumulator"]
    BUCKET --> TX["Invariant Transaction"]
    TX -->|ok| OUT["Complete accounting"]
    TX -->|err| FAIL["No partial result"]
```

<!-- Text fallback: typed populationを入口で検査し、intent別idle indexとsame intent/stage matchingからinterval algebraを実行する。candidate単一disposition、window bucketをstagingし、最後のInvariant Transactionだけが完全結果またはerrorを返す。 -->

component間はreadonly valueを渡す。Disposition Ledgerは同一candidateが複数windowへpositive fragmentを持つ場合も1つの`accounted` disposition内へcontributionを集約し、Window Bucket Accumulatorはそのcontributionをwindow/categoryへ投影する。

## Failure domains and blast radius

| Failure | Failure domain | Result | Unaffected surface |
|---|---|---|---|
| expected outside/idle-empty | 1 candidate | explicit rejected disposition | 他candidate/window |
| invalid window/candidate population | population transaction | typed invariant err、結果なし | input values、audit corpus |
| arithmetic/identity/bijection violation | population transaction | typed invariant err、結果なし | legacy measured branch |
| programmer defect in exhaustive contract | process invocation | fail-fast | persisted dataは存在しない |

正常なcandidate rejectionは局所化する一方、不変条件違反はreport全体をfail-closedにする。window単位で成功済みの値もInvariant Transaction完了前には公開せず、rendererがpartial accountingを観測できない。

## Shared resources and capacity

- process外のshared mutable resourceは0件。IdleIndex、pair list、fragment buckets、Disposition Ledger、staged windowsはinvocation-localで返却後に破棄する。
- window数w、candidate数c、fragment数kに対しO(cw + k log k)、memory O(w+c+k)を上限とする。
- 全corpus intervalを単一配列へ集めずwindow/category bucketへ局所化する。
- cache、connection pool、thread pool、queue、horizontal scaling、autoscalingは非適用である。
- parallel mutationを導入せず、canonical orderとatomic resultを維持する。

## Isolation strategy

- **Identity isolation:** intentとstageの完全一致前にclipしない。
- **Idle isolation:** idle indexをintent keyで分離し、別intent spanを差し引かない。
- **Category isolation:** category内unionとglobal unionを別component stepとして計算する。
- **Failure isolation:** expected dispositionとaccounting invariantを別unionで運ぶ。
- **Branch isolation:** C-04結果をlegacy measured window constructionへ戻さない。
- **Format isolation:** median/P95、outlier、Markdown/CSV/JSONを計算しない。

## NFR allocation and verification seams

NFR Requirements stageがskipされたため、以下の各design decisionに対応するdeclared requirementはすべてmissingである。Requirements Analysisの行参照はcontext evidenceであり、NFR Design用IDの代用ではない。

| Logical design decision | Declared NFR requirement | Context evidence | Verification seam |
|---|---|---|---|
| 単一source file内の7 logical component境界 | Missing (`tech-stack-decisions.md` absent) | `requirements.md:303-305`、`business-logic-model.md`全体 | public export census、component別unit test |
| Population Invariant Gateがaccounting開始前に集合一意性を検査 | Missing | `requirements.md:283-293` | duplicate window/candidate、unsafe integer fixture |
| Idle Index Builderをintent keyで分離 | Missing | `requirements.md:283-293` | 別intent idle非干渉PBT |
| Window Matcherをsame intent/stageへ限定 | Missing | `requirements.md:291-293` | timestamp重複する別intent/stage fixture |
| Interval Algebraがcopy sortと半開区間だけを使う | Missing | `requirements.md:283-289`、`:307-309` | boundary/union/subtract PBT、input snapshot |
| Disposition Ledgerがcandidateごとにちょうど1 statusを持つ | Missing | `requirements.md:283-293` | candidate/disposition全単射assert |
| Window Bucket Accumulatorがcategory/global unionを分離 | Missing | `requirements.md:283-285` | overlapとresidual恒等式PBT |
| Invariant Transactionだけが完全結果を公開 | Missing | `requirements.md:291-293` | 任意1 invariant failureでpartial result 0件 |
| expected rejectionをcandidate局所、invariantをpopulation全体へ閉じるfailure domain | Missing | `requirements.md:291-293` | outside/idle-empty継続とinvariant停止の対比fixture |
| external shared resource 0件、全staging stateをinvocation-localにする | Missing | `requirements.md:307-309` | forbidden importとglobal mutable state inspection |
| O(cw + k log k)、O(w+c+k)、window/category bucket | Missing | `requirements.md:299-305` | scale fixtureとbucket cardinality計測 |
| Identity isolation | Missing | `requirements.md:291-293` | intent/stage mismatchのcontribution 0件 |
| Idle isolation | Missing | `requirements.md:283-293` | cross-intent idle差引 0件 |
| Category isolation | Missing | `requirements.md:283-285` | category sumとglobal observableを別assert |
| Failure isolation | Missing | `requirements.md:291-293` | disposition unionとtyped invariant unionのexhaustive test |
| Branch isolation | Missing | `requirements.md:307-309` | legacy measured input/output snapshot |
| Format isolation | Missing | `requirements.md:303-305` | C-04 import/export censusでstatistics/renderer不在 |
| pipe drain、exit ladder、process retryをC-04へ置かない | Missing | `requirements.md:295-297`はC-01 shell ownerに適用 | C-04にprocess/stdout importがないことを検査 |

circuit breaker、retry/backoff、health check、failover、backupはexternal dependencyとpersistent stateがないため非適用である。invariant errorをretryして推定値へ変換せず、callerへ一度だけ返す。
