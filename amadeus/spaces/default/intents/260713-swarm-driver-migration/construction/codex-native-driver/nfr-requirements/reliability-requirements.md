# Codex Native Driver Reliability Requirements

## 上流とreliability model

本成果物はU-04の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-04はCodex serviceのuptimeを保証せず、runtime model resolution、single parent delegation、hook/collaboration correlation、sandbox isolation、referee handoffでfalse native successを0件にする。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U04-REL-01 | xhigh/max/説明文/feature flag/自己申告だけのUltra success | exactly 0件 | negative matrix |
| U04-REL-02 | expected Unit-role-childの欠落・余分・重複をsuccess化 | exactly 0件 | generated cases |
| U04-REL-03 | model-handshake、stream collaboration、hookの片系欠落success | exactly 0件 | source failure matrix |
| U04-REL-04 | thread/model/seed/final/nonce/binding不一致のsuccess | exactly 0件 | correlation fixture |
| U04-REL-05 | provider arm後のfloor/別driver fallback | exactly 0件 | process/evidence failure |
| U04-REL-06 | model toolへのauth/correlation露出またはevidence root access | exactly 0件 | malicious sentinel |
| U04-REL-07 | credential/prompt/message/transcript/raw JSONLの永続漏えい | exactly 0件 | canary scan |
| U04-REL-08 | macOS credentialed live proof | 2 Unit以上、runtime-resolved Ultra、全gate green | opt-in release evidence |

provider runtimeのavailability/latency SLA、backup、multi-regionはN/Aである。probeはstep ceilingと総45秒deadlineを守る。recoveryはU-02のnew attemptでfresh app-server、handshake、role、captureを使い、旧thread/agent/hookを再利用しない。

## Failure behavior and recovery

| Failure | Required result | Recovery |
|---|---|---|
| CLI/auth/catalog Ultra/multi-agent/hook unavailable | explicit hard error、`auto`だけpre-dispatch floor | fresh probe |
| official collaboration/hook/env isolationをprofile化不能 | U-04 park、floor alias禁止 | Intent scopeへ戻す |
| stdin/EOF/process/JSONL/capture failure | native success 0、fallbackなし | failed-resumable |
| model/thread/role/child/collab binding不一致 | evidence failure | failed-resumable |
| terminal collab errored/interrupted/status欠落 | child completedにしない | failed-resumable |
| model toolがsecret/evidenceへaccess可能 | pre-dispatch unavailableまたはpost-dispatch failure | profile修正までnative不可 |
| main/担当外worktree/protected spec違反 | C-11 finalize failure | U-02/C-11 recovery |
| C-08 green、C-11 red | batch/Intent success 0 | referee verdictどおり |

resumeは同じexecution IDへnew attempt/nonce/role/captureを発行し、旧provider/hook group停止とcapture joinを証明してからfresh probeへ進む。referee確定済みconverged Unitだけを再検証して再利用する。

## Evidence durability and consistency

- mode proofはsame-connection config/catalog/hook seed、model未pin handshake、bound model、本run exact model SessionStartのANDとする。
- child startはterminal spawn collaboration receiverとSubagentStart ID/role、child stopはSubagentStopとterminal collaboration/`agentsStates=completed`のANDとする。
- single parent thread IDをcollaboration senderと全hook session IDへexact bindする。
- capture identity、ProbeBinding、tool-env/sandbox digestをcheckpointしてからarmし、group terminalとhook wait後にsealする。
- C-08はnative lifecycleだけ、C-11はworktree成果/protected spec/convergence/mergeだけを判定し、両方greenまでsuccessを出さない。

## Observability and supportability

診断はCLI/profile/catalog row digest、resolved model/mode identifier、closed failure/status、parent/child/role digest、expected/observed count、unknown item countを持つ。email、account、token、endpoint、prompt、message、reasoning、command、transcript、生pathを持たない。

live evidence summaryでruntime-resolved model、parentと2件以上のchild、hook+terminal collaboration、Unit成果digest、C-11 envelope digestを相関する。auth不足、skip、unknown schema、untrusted hook、fake/floorだけをlive passにしない。

## Regression gate and review

次をmerge blockerにする。

1. fake app-server/exec/hook suite、failure injection、security sentinel、macOS live proofの失敗またはskip。
2. one parent、Unit-role-child全単射、terminal collab + hook、exact model bindingの破壊。
3. provider/tool env分離、evidence sandbox、capture-before-arm/terminal-before-sealの破壊。
4. runtime model slugの固定、xhigh/floor/自己申告によるUltra代替、unknown profileの推測。
5. C-08/C-11責務混合、native evidenceだけのbatch success。

### Review

必須のarchitecture reviewerが本節へ結果を追記する。

#### Iteration 1

- Verdict: **READY**
- Blocking findings: **0**

CLI／app-server／config各5秒、catalog／auth／hook各10秒、behavior handshake 30秒は、すべてcandidate総45秒budgetの残時間を上限にする個別ceilingとして定義されている。30秒handshakeを別budgetとして加算せず、Codex native batchのwall-clock時間、model latency、token消費には数値SLOを設定していない。

modelは実装定数やdisplay nameへ固定せず、same-connectionのeffective config、catalog、hook profileをProbeBinding seedへ束縛し、model未pin handshakeのSessionStartからruntime exact IDを解決する。そのcatalog rowのliteral `ultra`を確認した後だけ本runへexact modelをpinし、actual SessionStartのmodel、seed／final binding、nonce一致までmode-confirmedを発行しない。xhigh、max、floor、feature flag、説明文、自己申告は代替証拠にならず、required collaboration／hook／env-isolation profileを確定できない場合はU-04をparkする。

native topologyはbatchごとの`codex exec --json` parent 1件、expected Unit／dynamic role／distinct childの全単射である。child start／stopはterminal collaborationのsender／receiver／status／`agentsStates`とSubagentStart／SubagentStopのsession／agent／roleをAND結合し、model handshake、single parent thread、process terminal、capture sealを合わせてC-08が判定する。capture identity、ProbeBinding、tool-env／sandbox digestをcheckpointしてからproviderをarmし、provider group terminalとhook waitの後だけjoin／seal／normalizeする。

provider parent／static hookへ渡す5 correlation keyと、`inherit="none"`からsafe PATH／scratch HOME／localeだけを構築するmodel-tool envは分離されている。evidence rootはcwd、prepared worktree、`--add-dir`、scratch HOME、sandbox tempの外に置き、model toolのread／write／listを拒否する。credential、prompt、message、reasoning、command、transcript、生path、raw JSONLは永続化せず、closed projectionとdigestだけを残す。

release matrixはmacOS credentialed live proof、GitHub Actions Linuxのcredential不要fake／failure／package検査、Windows対象外で上流要求と一致する。C-06はCodex固有probe／launch／projection、U-02はprocess／capture lifecycle、C-08はnative evidence、C-11はworktree成果／protected spec／収束／mergeを所有し、conductorがC-01とC-11を媒介する。Bun／TypeScript ESM、`bun:test`、fast-check、Node標準APIという既存stackを維持し、SDK、Responses API、daemon、runtime dependencyを追加しない。
