# Release & Migration Closure NFR Requirements Questions

## 判定

`business-logic-model.md`と`business-rules.md`は、registry、projection、docs、platform tests、native live、migration Issueのall-match closure、同一tree binding、coverage、redaction、platform matrixを確定している。共通`requirements.md`はFR-22〜FR-26とNFR-06/08/09/11/12、brownfield `technology-stack.md`はBun/TypeScript、package/self-install、GitHub Actionsを示す。追加の製品判断は不要である。

## 確定済み回答

### Q1. closureの性能を何で測るか

[Answer]: build/test/live journeyのwall-clock SLOは置かない。checkerはfixed release manifestのfile/receipt数に対し線形〜準線形、各inputを最大1回projection、findingをcanonical sortし、同じinputから同じreport digestを100%生成することで測る。

### Q2. releaseをclosedにする最小条件は何か

[Answer]: 3 provider/4 driver registry、4 distとClaude/Codex self-install、docs contract、macOS/Linux deterministic、macOS 4 native driver live、valid open migration Issue、FR-01〜FR-26 coverageをすべて同一repository/tree/contractへ束縛する。1件でもmissing/red/staleならblockedである。

### Q3. generated artifactとreceiptの自己参照をどう防ぐか

[Answer]: release input digestは固定manifestのauthored sourceとgenerated targetから計算し、receipt/report/provider summary/machine-local runtimeを除外する。source edit→generate→read-only check→最終tree sealの順を固定し、write command成功だけをreceiptにしない。

### Q4. credentialed live evidenceをどこまで保存するか

[Answer]: provider Unitがsealしたallowlist summaryだけをindex化し、driver/harness/platform/profile、ID/file digest、transport/capture/resource receipt、必要なbinding/control/process terminal/terminal-retained-evidence digest、Unit/child/wave count、C-08/C-11 verdictを保持する。prompt、raw PTY/JSONL/session/provider state、credential、absolute homeを拒否し、U-06でraw payloadを再parseしない。

### Q5. migration Issueをどう冪等化するか

[Answer]: fixed markerの全検索結果をpaginationで終端まで取得し、列挙件数をauthoritative total countが提供される場合はそれとも照合する。完全な結果集合がopen 1件なら再利用、0件ならsingle publisherが日本語Issueを1件作成して同じ完全検索を再実行する。open exactly 1件かつ作成number一致を要求し、page/limit打切り、件数不一致、schema不明、複数、closed-only、create競合では再open/削除/追加作成せずblockする。

### Q6. platformの完了条件は何か

[Answer]: macOSとGitHub Actions Linuxでtypecheck/lint/complexity、unit/integration/failure/security、deterministic E2E、package/dist/self-install/setupを必須にする。credentialed native liveはmacOS 4 driver、Windowsは対象外で、Linux skip/fakeをlive proofへ昇格しない。

### Q7. scaleやdriver追加時にどうするか

[Answer]:現scopeは3 provider、4 driver、4 harness、2 deterministic platform、4 live driverのclosed setである。追加はrelease manifest、registry cardinality、docs semantic IDs、platform/live matrix、coverage mapを同時変更する別Intentとし、dynamic discoveryで迂回しない。

## 曖昧性分析

- closureの「速さ」ではなく、fixed inputの一回評価、計算量、決定性、stale receipt 0で定量化する。
- 6 release domainにcoverage validationを追加でANDしており、coverageを第7の外部domainとして曖昧に数えない。
- liveはmacOS、deterministicはmacOS/Linuxという非対称matrixを明示し、Windows成功を推測しない。
- Agent Teamsのinteractive PTY、Ultra Codeのexact headless stdio、Codexのhook-only、Kiroのevent-bound captureを相互代替せず、ready signalだけをprocess成功へ昇格しない。
- Issue作成は唯一の外部writeであり、single publisherと完全な再検索で未取得pageを含む重複をfail-closedにする。
