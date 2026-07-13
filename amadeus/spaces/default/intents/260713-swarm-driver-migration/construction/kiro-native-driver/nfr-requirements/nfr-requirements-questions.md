# Kiro Native Driver NFR Requirements Questions

## 判定

`business-logic-model.md`と`business-rules.md`は、balanced wave、Kiro V2 headless、runtime agent trust、session capture、Unit-role-child証跡、wave gate、CLI/IDE/live proofを測定可能な契約まで確定している。共通`requirements.md`は最大4並列、Unit drop 0、機密性、Kiro native proofを要求し、brownfield `technology-stack.md`はlive subagent surfaceとBun/TypeScript基盤を示す。追加の製品判断は不要である。

## 確定済み回答

### Q1. Kiroのcapacityをどう表すか

[Answer]: waveごとのUnit数を2〜4、wave数を`ceil(n/4)`、最大wave差を1以下とする。全waveを連続sliceでbalanced splitし、順序、集合、件数を完全保持する。waveはserialに進み、前waveのC-08とconductor-recorded C-11 resultが両方greenになるまで次をarmしない。

### Q2. latencyとprobe deadlineをどう区別するか

[Answer]: Unit実行時間やtoken消費にSLOは置かない。capability probeだけを1 resolve scope 1回、総45秒以内とする。CLI/help各5秒、auth/config各10秒、handshake 30秒は総deadlineの残りbudget内の上限である。

### Q3. native Kiro subagentを何で証明するか

[Answer]: 各waveでexactly 1 V2 parent process/session、expected Unitごとのdistinct child session、parent relation、runtime worker role、terminal completed、process exit/turn terminal、capture sealをANDで要求する。session file存在、summary、prompt、default agent、IDE/CLI floor自己申告は代替にしない。

### Q4. trustとwrite boundaryをどう制限するか

[Answer]: parentはread/thinking/subagentだけ、workerはread/write/thinkingだけとする。parent trusted/available agentはwaveの2〜4 role集合とexact matchし、worker read/write pathは担当prepared worktreeだけに限定する。`--trust-all-tools`、shell、AWS、MCP、nested subagentを禁止する。

### Q5. runtime config/session dataをどう扱うか

[Answer]: runtime agent configは予約済みproject-local pathへexclusive createし、digest/ownerをarm前checkpointする。sessionはbaseline後の`.json`/`.jsonl`だけをallowlist projectionし、raw prompt/message/summary/tool I/Oを保存しない。terminal/capture seal後にowner一致でconfigをcleanupし、失敗時はsuccess/check/次waveを禁止する。

### Q6. version/schema drift時にどうするか

[Answer]: `kiro-cli 2.x`、`--agent-engine v2`、versioned session profileへ閉じ、V3へsilent retryしない。parent relationまたはcompleted terminalをlive fixtureで機械取得できない、stdin ingestionを実証できない場合はU-05をparkし、floor/default agentで代替しない。

### Q7. platformとrelease proofは何を必須にするか

[Answer]: macOSでKiro CLI/Kiro IDE conductorの2 Unitと5 Unit live fixtureを必須にする。5 Unitは3+2、parent 2、child 5、wave間gate、全check/finalizeを証明する。Linuxはfake/profile/package検査、Windowsは対象外とし、auth不足/skip/unknown profileをpassにしない。

## 曖昧性分析

- 「最大4並列」はwave内Unit数であり、全Unitを同時実行する意味ではない。
- probe 45秒とprovider runtimeを分離し、上流の実行時間/token SLOなしと矛盾しない。
- Kiro固有wave/session/trustはC-07、process/captureはU-02、native verdictはC-08、成果収束はC-11が所有する。
- unknown V3/session schemaは成功条件を弱めずparkするため、未確認surfaceを推測しない。
