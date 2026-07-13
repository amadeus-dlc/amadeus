# Claude Native Driver NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、Agent TeamsとUltra Codeを実native surfaceとして証明する境界、capture順序、機密性、macOS live proofを確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. Claude providerの2 modeをどう登録するか

[Answer]: `DriverAdapterSet`に`claude-agent-teams`と`claude-ultracode`のimmutable mode-bound viewをexactly 2件登録する。共通familyはresolve scope内のCLI/auth probeだけを共有し、単一adapterのdriverを書き換えない。

### Q2. Agent Teamsの実使用を何で証明するか

[Answer]: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`、`--teammate-mode in-process`、予約済みsession UUIDに加え、exact team/task provider-stateとTaskCreated/TaskCompleted/TeammateIdle stream/hookをID・assignment tokenでAND結合する。flagや自己申告だけでは成立しない。

### Q3. Ultra Codeの実使用を何で証明するか

[Answer]: `--effort ultracode`、versioned `ClaudeSurfaceProfile`に一致するworkflow run/task/worker state、同一run/sessionのworkflow markerとSubagentStart/StopをAND結合する。xhigh、通常Agent tool、floor、自己申告は代替にしない。

### Q4. provider-state captureを誰が所有するか

[Answer]: C-05はpure `EvidenceCapturePlan`とparserを返し、U-02 supervisorがcapture identityのcheckpoint束縛、provider arm前start、group terminal後stopAndWaitを所有する。C-05にhidden polling closureやprocess ownerを置かない。

### Q5. Claudeの非公開schema driftをどう扱うか

[Answer]: credentialed macOS discoveryでfield path、type、enum、version rangeだけをredacted fixtureへ固定する。exact pathを確立できないprofile/versionはparkし、directory scanやpermissive parserで推測しない。

### Q6. session prefix collisionをどう防ぐか

[Answer]: counter 0..255のUUID候補ごとにuser-scoped lockをatomic予約し、team/task exact pathの不存在をdispatch前とarm直前に検証する。既存pathを削除・再利用せず、旧owner/groupの停止を証明したstale lockだけを回収する。

### Q7. scale patternは何か

[Answer]: waveごとにClaude coordinator processはexactly 1件とし、Unit-child全単射をnative schedulerへ要求する。C-05はUnitごとの`claude -p`、独自queue/pool、hidden concurrency limitを追加しない。

### Q8. infrastructureを新設するか

[Answer]: 新設しない。installed CLI、既存auth、短命process、attempt-owned local scratchを使用し、SDK、API client、daemon、database、queue、cloud resourceを追加しない。

## 曖昧性分析

- Agent Teams/Ultraのprompt instructionは起動要求であり、成功証拠ではない。
- provider-state、process stream、hook recordは独立sourceであり、同じraw eventから二重生成しない。
- macOS live proofはrelease evidence、GitHub Actions Linuxはcredential不要fake suiteであり、両者を同じpassへ集約しない。
- native evidence greenでもC-11 refereeとC-01 record request/resultが失敗すればbatch successではない。
