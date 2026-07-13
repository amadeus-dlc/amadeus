# Claude Native Driver Reliability Requirements

## 上流とreliability model

本成果物はU-03の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-03はClaude serviceのuptimeを保証せず、adapter/capture/evidence boundaryでnative false success、wrong-session adoption、secret leakage、post-dispatch fallbackを0件にする。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U03-REL-01 | flag/version/xhigh/floor/自己申告だけによるnative success | exactly 0件 |全negative fixture |
| U03-REL-02 | expected Unitとnative child/taskの欠落・余分・重複をsuccess化 | exactly 0件 | Teams/Ultra generated cases |
| U03-REL-03 | provider-stateまたはstream/hook片系だけのsuccess | exactly 0件 | source failure matrix |
| U03-REL-04 | wrong session/run/path/profile adoption | exactly 0件 | collision/schema/path fixture |
| U03-REL-05 | dispatch後の別mode/floor fallback | exactly 0件 | process/evidence failure |
| U03-REL-06 | credential/prompt/raw response/absolute pathの永続漏えい | exactly 0件 | secret canary scan |
| U03-REL-07 | capture-before-arm、terminal-before-join順序 | 100% | lifecycle trace/failure injection |
| U03-REL-08 | macOS credentialed live proof | 2 modeそれぞれ2 Unit以上、全gate green | opt-in release evidence |

provider runtimeのavailability/latency SLA、backup、multi-regionはN/Aである。probeだけは5/10/30秒、総45秒の上流deadlineを守る。recoveryはU-02のresumeでfresh probe/session/captureから開始し、旧Claude stateを再利用しない。

## Failure behavior and recovery

| Failure | Required result | Recovery |
|---|---|---|
| CLI/auth/mode/capture unavailable | explicit hard error、`auto`のみdispatch前fallback | input/environment修正後fresh probe |
| prefix lock/path collision/枯渇 | provider process 0、既存path不変 | fresh attempt/別candidate |
| capture identity/binding/snapshot欠落 | native success 0 | failed-resumable |
| team/member/task不足または不一致 | evidence failure | failed-resumable、fallbackなし |
| Ultra run/path/profile unknown | discovery時park、実行後はevidence failure | profile確定までnative不可 |
| child stop/idle/background workflow不完了 | coordinator exit 0でもsuccess 0 | failed-resumable |
| hook/observer stopAndWait不能 | scratch隔離、success 0 | U-02 group/capture recovery |
| C-08 green、C-11 red | batch/Intent success 0 | U-02/C-11 verdictどおり |

resumeではfresh resolve scope、UUID/session ID、prefix reservation、evidence dir、probeを必須にする。旧team config、task directory、workflow run、snapshot、probe result、self-reportをsuccess evidenceへ再利用しない。

## Evidence durability and consistency

- Agent Teamsはprovider-state members/tasksとTaskCreated/Completed/TeammateIdleをID/token/ownerでAND結合する。
- Ultra Codeはprofile-bound workflow run/task/agentとworkflow marker/SubagentStart/Stopをrun/session/agent IDでAND結合する。
- provider arm前にcapture plan/identityをcheckpointへ束縛し、group terminal後にcapture joinとlast valid atomic snapshotを確定する。
- normalized evidenceにはexecution/attempt/nonce/plan/wave correlationを含め、raw source同士から同じeventを二重生成しない。
- native evidence後もconductor媒介のC-11 check/finalizeとC-01 record request/resultを全Unitで必須にする。

## Observability and supportability

診断はdriver/mode、CLI/profile version、closed failure code、unknown event count、execution/attempt/run/path digest、expected/observed child countを持つ。credential、prompt、script、description、message、assistant result、transcript、生pathは持たない。

live evidence indexでsource/marker、Unit/child count、check/finalize verdictを追跡し、auth不足、skip、unknown schema、fixture/floorだけをpassにしない。GitHub Actions Linuxのfake suiteとmacOS live proofを区別して表示する。

## Regression gate and review

次をmerge blockerにする。

1. deterministic fake suite、architecture edge check、secret canary、macOS両mode live proofの失敗またはskip。
2. capture-before-arm/terminal-before-join、session reservation、state+stream ANDの破壊。
3. Unit-child全単射、mode marker、background workflow 0、referee gateのいずれか欠落。
4. unknown schema/versionを推測、またはUltraをxhigh/floor/通常Agent toolで代替する変更。
5. global settings mutation、raw evidence保存、credential漏えい。

### Review

必須のarchitecture reviewerが本節へ結果を追記する。

#### Iteration 1

- Verdict: **READY**
- Blocking findings: **0**

probeの5秒／10秒／30秒／総45秒はCLI、auth、handshake／hookの能力検査deadlineとして限定され、providerのUnit実行時間、model latency、token消費のSLOとは明確に分離されている。

Agent TeamsとUltra Codeはいずれもprovider-stateとstream／hookの独立二系統をIDでAND結合し、batch／waveごとのcoordinator process 1件、expected Unitとnative child／taskの全単射を要求する。flag、version、xhigh、floor、通常Agent tool、prompt／assistantの自己申告だけではnative successにならず、missing／extra／duplicate child、片系証拠、post-dispatch fallbackをfail-closedにしている。

capture plan／identityのcheckpoint束縛後にcaptureを開始してからproviderをarmし、provider group terminal後にstopAndWait／joinしてlast valid snapshotを確定する順序が、performance、reliability、tech-stackの各成果物で一致している。Agent Teamsのsession prefixは256候補に限定し、予約済みteam／task exact pathだけを直接検査してroot scan、既存path削除、再利用を禁止する。Ultra Codeのrun／task／agent surfaceまたはexact-path導出を確定できない場合はU-03をparkし、同名driverを代替surfaceで成立させない。

credential、prompt、script、message、assistant result、transcript、raw provider data、生pathは永続化対象外であり、allowlist projectionとdigestだけを残す。検証matrixはmacOSの両mode credentialed live proof、GitHub Actions Linuxのcredential不要fake suite、Windows対象外で上流要求と一致する。C-05はpure adapter／normalizerに限定され、capture／process lifecycleはU-02、収束判定はconductor媒介のC-11に残る。Bun／TypeScript ESM、`bun:test`、fast-check、標準APIという既存stackを維持し、runtime dependency、SDK、API client、daemonを追加しない。
