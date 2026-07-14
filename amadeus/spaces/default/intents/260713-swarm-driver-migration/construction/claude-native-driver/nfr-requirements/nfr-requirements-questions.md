# Claude Native Driver NFR Requirements Questions

## 判定

`business-logic-model.md`と`business-rules.md`は、Claude Agent Teams／Ultra Codeのprobe、launch、capture、evidence、confidentiality、cleanup、live proofを具体化している。共通`requirements.md`はnative proof、credential非保存、false success 0、macOS live proofを確定し、brownfield `technology-stack.md`はlive `Task`／Dynamic WorkflowとBun/TypeScriptの既存基盤を示す。追加の製品判断は不要である。

## 確定済み回答

### Q1. latencyとtimeoutをどう区別するか

[Answer]: provider batch runtimeやtoken消費にSLOは置かない。probeだけは上流どおりCLI 5秒、auth 10秒、handshake/hook 30秒、総45秒のdeadlineを持つ。これはavailability判定の上限であり、native Unit完了時間の保証ではない。

### Q2. 1 batchで何processを起動するか

[Answer]: selected modeのbatch/waveごとにcoordinatorをexactly 1 process起動する。Agent Teamsはinteractive PTYの`claude`、Ultra Codeはheadless `claude -p`を使う。Agent Teamsはexpected Unitごとにexactly 1 teammate、Ultra Codeはexactly 1 workflow workerを作り、lead/coordinator自身のUnit実装や余分なplanner/verifier agentを認めない。

### Q3. Agent TeamsとUltra Codeを何でnativeと証明するか

[Answer]: Agent Teamsは予約済みsession-derived team/task provider-stateとTask/Teammate stream、Ultra Codeはprofile-bound workflow run/task/agent provider-stateとworkflow/Subagent streamをANDで要求する。flag、version、xhigh、通常Agent tool、prompt/assistant自己申告、floorは代替証拠にしない。

### Q4. credential、prompt、provider stateをどこまで保存するか

[Answer]: credential値、auth detail、stdin prompt、workflow script、task description、message、assistant result、transcript、生stdout/stderr、home絶対pathは保存しない。永続化するのはallowlist fieldから作るID/enum/digest/Unit/countとversioned surface profileだけである。

### Q5. session/path collisionをどう扱うか

[Answer]: Agent Teamsは最大256件のdeterministic candidateを直接計算し、user-scoped lockとteam/task両exact pathの不存在を確認して予約する。root scan、既存pathの削除・再利用は行わない。候補枯渇、symlink、ownership/liveness不明はprovider起動0件で停止する。

### Q6. version/schema drift時にどうdegradeするか

[Answer]: exact version rangeと`ClaudeSurfaceProfile`に一致しないevent/pathは推測しない。explicit modeはhard errorまたは、Ultraのpublic state mappingを発見できなければU-03をparkする。`auto`のfallbackはdispatch前だけで、dispatch後はfailed-resumableとし別mode/floorへ切り替えない。

### Q7. testとplatformの完了条件は何か

[Answer]: macOSで各mode 2 Unit以上のcredentialed live proofを必須にし、GitHub Actions Linuxはdeterministic fake suiteを通す。auth不足、skip、unknown schema、fixture/floorだけをpassにしない。Windowsは保証対象外である。

## 曖昧性分析

- Agent Teams／Ultra Codeの「有効」はflag受理ではなく、独立sourceのAND evidenceとして定量化されている。
- probe deadlineとprovider runtime SLOを分離しており、上流の「実行時間/token SLOなし」と矛盾しない。
- provider固有child mappingはU-03、attempt/process/referee lifecycleはU-02/C-11が所有し、責務が重複しない。
- Ultra Codeのstate surfaceが確定できない場合は成功条件を弱めずparkするため、未解決schemaを暗黙に補完しない。
