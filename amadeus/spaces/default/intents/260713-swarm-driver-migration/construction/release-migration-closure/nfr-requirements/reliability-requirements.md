# Release & Migration Closure Reliability Requirements

## 上流とreliability model

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-06はrelease serviceのuptimeを保証せず、all-match closure、same-tree provenance、immutable report、single Issue publisher、redacted native indexでfalse release closureを0件にする。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U06-REL-01 | red/missing/stale/extra domain receiptを含むclosed report | exactly 0件 | all failure matrix |
| U06-REL-02 |同一canonical inputのstatus/finding/report digest一致 | 100% | shuffled/repeated property |
| U06-REL-03 | 3 provider/4 driver/2-1-1以外のregistry success | exactly 0件 | composition fixtures |
| U06-REL-04 | source/generated drift、orphan、hand editのgreen receipt | exactly 0件 | projection fixtures |
| U06-REL-05 | FR-01〜FR-26のcoverage欠落 | exactly 0件 in closed | coverage map test |
| U06-REL-06 | 4 native driver live欠落をfake/skip/floor/legacyで代替 | exactly 0件 | evidence matrix |
| U06-REL-07 | marker一致Issue重複または誤reference | exactly 0件 in closed | publisher race/state test |
| U06-REL-08 | credential/prompt/raw provider/session/pathのreport/index漏えい | exactly 0件 | canary scan |

availability SLA、backup、multi-regionはlocal/CI closure checkerにN/Aである。recoveryはblocked domainをsame-tree replacement receiptで再収集する。input treeが変わった場合はRPO的な部分再利用を行わずnew candidateとして全receiptを再評価する。

## Failure behavior and recovery

| Failure | Required result | Recovery |
|---|---|---|
| registry incomplete/fake/unavailable | blocked、該当U-01〜U-05へ戻す | same-tree correction/test |
| projection/docs drift | blocked | source修正→generate→read-only check |
| macOS/Linux receipt missing/red/stale | blocked |同一candidateで再実行 |
| native live missing/redacted failure | blocked、provider Unitへ戻す | sealed replacement summary |
| coverage missing/skip/unimplemented | blocked | valid test/live ID追加 |
| Issue open 0 | single publisher create + re-search | valid reference seal |
| Issue open複数/closed-only/create競合 | mutation継続0、blocked | human/external state resolution |
| tree/contract変更 |旧report immutable | new candidate全再評価 |

reportは全findingをcanonical aggregateし、first-errorで他のblockerを隠さない。blockedをwarning/partial closedへdowngradeしない。

## Durability and consistency

- release input manifestはauthored/generated inputを固定し、receipt/report/machine runtimeを除外する。
-全receiptをrepository/tree/contract/candidateへexact bindし、duplicate ID、stale SHA、別worktreeを拒否する。
- write command後のsame-tree read-only checkだけをprojection/docs/setup receiptとして受理する。
- `closed` reportはimmutable receipt digestをsealし、input tree変更時に上書きしない。
- Issueはmarker再検索でopen exactly 1、reference number/URL/body/status一致後だけsealする。

## Observability and supportability

findingはdomain/code/subject、expected/observed digestを持ち、canonical orderで全件を返す。receipt/reportはcandidate、repository/tree/contract、platform/run SHA、driver/harness/profile、closed verdict/countを相関する。

provider payload、prompt、credential、raw CI log、absolute home/worktreeを診断へ入れない。missing evidenceはclosed codeでowner Unitへroutingし、U-06がprovider behaviorを再解析・修正しない。

## Regression gate and review

次をmerge blockerにする。

1. registry/projection/docs/platform/live/Issue/coverage deterministic suiteの失敗またはskip。
2. macOS/Linux receipt、macOS 4-driver live、FR-01〜FR-26 coverageの欠落。
3. same-tree/contract binding、read-only drift check、closed immutabilityの破壊。
4. Issue duplicate/closed/conflict時の追加mutation、0.2.0削除のscope内実装。
5. raw/secret evidence保存、fake/skip/floor/legacyのlive昇格、Windows成功表明。

### Review

必須のarchitecture reviewerが本節へ結果を追記する。

#### Iteration 1

- Verdict: **READY**
- Blocking findings: **0**

build、test、provider live、GitHub networkのwall-clock時間とtoken消費には数値SLOを設定せず、固定release manifestのfile digest、receipt／coverage検証、finding集約を線形memoryかつ`O(n log n)`以下へ限定している。receipt、report、provider summary、machine-local runtimeをrelease input digestから除外し、self-rehash loopを作らない。

production registryはClaude／Codex／Kiroの3 provider、4 native driver、cardinality 2／1／1をproduction composition rootとpublic `forDriver`でexact検証する。distributionは4 harness／4 distを同じframework正本から生成し、self-installは既存のClaude／Codex targetだけを対象としてKiro／Kiro IDE targetを新設しない。writeによる生成直後のsame-tree read-only checkがgreenになるまでreceiptを受理しない。

closureはregistry、projection、docs、platform、live、Issueの6 domainをall-matchし、FR-01〜FR-26を各1件以上の有効なtestまたはlive evidenceへ逆引きする。全receipt／index／reportをsame repository、release input tree、contract、candidateへ束縛し、stale／duplicate／別worktree／red／missing／extra／unknownをblocked findingとして全件集約する。closed reportはimmutableで、authored／generated input変更時はnew candidateとして全receiptを再評価する。

release matrixはmacOSとGitHub Actions Linuxのdeterministic suite、ローカルmacOSの4-driver credentialed live、Windows対象外で上流要求と一致する。provider Unitのsealed allowlist summaryだけを読み、raw stream／session／state、prompt、credential、summary text、生pathをindex／reportへ保存しない。

0.2.0 migration Issueはfixed repository／markerに対するsingle publisherだけが、open 0件時に最大1件作成する。create後にmarkerを再検索し、open exactly 1件かつnumber／URL／body digest／status一致を確認する。open複数、closed-only、create後競合では追加create、reopen、deleteを行わない。U-06はprovider behavior、parser、selector、checkpoint、C-08／C-11 refereeを再実装せず、既存Bun／TypeScript ESM、Git、GitHub Actions、package／self-install scripts、`bun:test`、標準APIを維持し、新service／SDK／database／runtime dependencyを追加しない。
