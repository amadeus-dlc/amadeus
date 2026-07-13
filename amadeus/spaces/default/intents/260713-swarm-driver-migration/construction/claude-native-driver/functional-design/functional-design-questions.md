# Functional Design 質問 — Claude Native Driver

## 判定

追加のユーザー質問はない。`unit-of-work.md`と`unit-of-work-story-map.md`がU-03の2 mode、受入slice、single-writer境界を確定し、`requirements.md`がAgent Teams／Ultra Codeのnative証跡、機密性、live proofを要求している。`components.md`、`component-methods.md`、`services.md`はC-05のadapter contract、二系統evidence、process contractを固定している。

以下はproduct判断ではなく、2026-07-13時点のClaude Code公式surfaceとlocal `claude 2.1.205`を上流契約へ写像するarchitect判断である。credentialed native runは行わず、CLI flag受理と非機密auth statusだけを確認した。未解決のprovider schemaはCode Generation entryのlive discovery gateで閉じ、推測実装やfloor代替はしない。

## 上流で確定済みの設計確認

### Q1. Agent Teamsの一意team名をどう作るか

[Answer]: Claude Code 2.1.178以降は任意のteam名を使わず、team名を`session-<session UUID先頭8桁>`として自動生成する。`team_name`指定は無視され、hook payload上もdeprecatedである。adapterはexecution/attempt/waveからUUIDv5を導出し、`--session-id`へ渡す。これにより公式surfaceを改変せずexecution由来の一意team pathを事前計算できる。`~/.claude/teams/`や`~/.claude/tasks/`の列挙は行わない。

### Q2. Agent Teamsを環境変数設定や自己申告からどう区別するか

[Answer]: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`と`--teammate-mode in-process`は起動条件にすぎない。成功には、exact session-derived team configとtask directoryから得た`provider-state`、および`--include-hook-events`付きstreamに現れる`TaskCreated`、`TaskCompleted`、`TeammateIdle`をANDで要求する。member、task、teammate name、Unit assignment tokenを全単射で相関し、2 teammate以上、全Unit completed、coordinator exit 0を満たす場合だけnative successとする。

### Q3. Ultra Codeをどう起動し、xhigh単独とどう区別するか

[Answer]: Claude Code 2.1.203以降の公式surfaceである`--effort ultracode`を明示し、stdin promptでもdynamic workflowを明示要求する。`--effort xhigh`、prompt keyword受理、通常subagent呼出しだけは成功にしない。実workflow run ID、workflow task/agent ID、Unit assignment、SubagentStart/Stop stream/hook、provider workflow stateの二系統が必要である。

### Q4. Dynamic Workflowの未公開field pathを設計で固定するか

[Answer]: 推測で固定しない。公式文書はsession配下のscriptとruntime trackingを説明するが、安定したrun/task state schemaやfield pathを公開契約として列挙していない。Code Generationの最初にopt-in credentialed discoveryを行い、CLI version、`system/init.capabilities`、run/task/agent pathを非機密fixtureへ最小化して`ClaudeSurfaceProfile` v1を確定する。exact path、run ID、Unit-agent対応を機械取得できなければU-03をparkし、`claude-task-floor`やxhighへ置換しない。

### Q5. 1つのC-05と`DriverAdapter.driver`の単一値をどう両立させるか

[Answer]: Iteration 1 reviewで上流`RegistrationSlot.available.adapter`の単数形では2 viewを格納不能と判明したため、generic slotをdriver-keyed `DriverAdapterSet`へ訂正する。C-05を1つのmodule/class familyとして実装し、`claude-agent-teams`と`claude-ultracode`に束縛したimmutable viewを2つ生成してClaude setへ格納する。Claudeはexactly 2、Codex/Kiroはexactly 1をbuild時に検証し、provider mappingは変えない。各viewは公開`DriverAdapter`を満たし、同一resolve scope内では共通CLI/auth probe promiseだけを共有する。singleton cacheやattempt外cacheは作らない。

### Q6. promptとcredentialをどう隔離するか

[Answer]: Unit manifestとcoordinator指示はargvや一時ファイルへ置かず、`LaunchSpec.stdin`のbytesとして1回だけ渡してcloseする。envはruntime基本key、attempt相関key、選択済みauth transportに必要な既存keyの固定allowlistだけをin-memoryで継承する。値、prompt、raw stream、transcript path、assistant messageはcheckpoint、audit、fixture、errorへ保存しない。

### Q7. provider cleanupとresumeをどう扱うか

[Answer]: adapterは`LaunchSpec`と別にclosed `EvidenceCapturePlan`を返す。U-02 supervisorがcapture ID/plan digestをcheckpointへ保存し、observerをprovider arm前にstart、provider group terminal後にstopAndWaitし、provider-state、hook record、process streamを別channelでnormalizerへ渡す。Agent Teams configはsession終了時に削除され得るため、実行中の最後のvalid normalized snapshotをatomic保存する。process exit後に初めて読む方式は採用しない。

session prefixはUUID先頭8文字しか使われずtask directoryが永続するため、`execution/attempt/wave/counter`由来UUID候補をuser-scoped temp lockで予約し、expected team/task両pathをdirect `lstat`する。既存pathは削除せず次counterへ進み、counter、UUID、prefix、path digest、reservationをdispatch前checkpointへ束縛する。crash時はU-02のprocess group停止とfencingを使い、旧team/workflow sessionを再利用せず、同じexecutionの新attemptでfresh probeと新seedから開始する。

## 曖昧性分析

- 曖昧な回答: なし。公式surfaceにないDynamic Workflow field pathだけは意図的なCode Generation entry gateであり、推測値ではない。
- 回答間の矛盾: なし。実行由来session IDは「任意team名を使わない」と「他teamをscanしない」を同時に満たす。
- 成果物生成を止める不足情報: なし。schema discovery失敗時のstop ruleまで確定している。
