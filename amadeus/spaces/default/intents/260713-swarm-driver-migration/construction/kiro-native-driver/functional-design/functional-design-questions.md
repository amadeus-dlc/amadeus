# Kiro Native Driver Functional Design Questions

## 判定

`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`で製品判断は確定済みである。ローカルでは`kiro-cli 2.12.1`、default agent engine=`v2`、Google login、`subagent` tool、`--no-interactive`、`--agent-engine`、agent-v1 JSONが確認できた。以下は新しい製品質問ではなく、承認済み境界を実装可能なcontractへ精緻化した回答である。

## 上流で確定済みの設計確認

### Q1. Kiro V2とV3のどちらをnative driverの対象にするか

[Answer]: 現行release profileは`kiro-cli 2.x`の`--agent-engine v2`を明示する。V2は上流で選んだ`chat --no-interactive`、agent-v1 JSON、`toolsSettings.subagent.availableAgents/trustedAgents`、persisted session metadataの組合せを公開している。V3はEarly Accessでsession/config/permission形式が非互換であり、classic/headless互換も同一contractとして確定していないため、このversioned profileへ混在させない。V2 behavior fixtureが成立しなければpre-dispatch unavailableとし、V3へsilent retryしない。

### Q2. 非対話実行で必要最小限のtrustをどう作るか

[Answer]: `--trust-all-tools`は使わない。U-02 supervisorがwave固有parent agent configとUnit固有worker agent configを、予約済みruntime agent pathへprovider arm前に生成する。parentはread/thinking/subagentだけを持ち、`availableAgents`と`trustedAgents`をそのwaveのworker role集合へexact限定する。workerはsubagent/shell/MCPを持たず、read/writeの`allowedPaths`を自分のprepared worktreeへ、`deniedPaths`をmain checkout、他worktree、evidence、runtime agent config、Kiro session rootへ限定する。non-interactive malicious fixtureでapproval要求0件と境界外write拒否を実証できなければparkする。

### Q3. 2〜4 Unitのbalanced waveをどう決定するか

[Answer]: `n >= 2`について`waveCount=ceil(n/4)`、`base=floor(n/waveCount)`、`remainder=n % waveCount`とし、先頭`remainder` waveを`base+1`、残りを`base`にする。入力順を連続sliceで保存する。これにより全waveは2〜4件、件数差は最大1、drop/duplicateは0件になる。5件は3+2、9件は3+3+3、13件は4+3+3+3である。1 Unit入力はnative対象外であり、空waveや1件末尾waveへ補正しない。

### Q4. Unitとchild sessionの全単射をprompt本文に依存せずどう証明するか

[Answer]: execution/attempt/wave/Unitから20文字のassignment tokenを導出し、worker agent名を`amadeus_kiro_u_<token>`とする。provider session metadataのparent session ID、child session ID、`agent_name`、terminal statusをversioned allowlist profileで読み、expected Unit ↔ role ↔ child sessionをexact matchする。task prompt、summary本文、title、assistant responseは割当根拠にせず即時破棄する。parent relationまたはcompleted stopの安定fieldをcredentialed fixtureで取得できなければU-05をparkする。

### Q5. process streamとsession metadataをどう同じwaveへ相関するか

[Answer]: provider arm前にsession inventory、runtime agent config digest、capture identity、nonce、plan/wave digestをcheckpointする。wave固有parent roleを`kiro-cli chat --agent <role> --agent-engine v2 --no-interactive`へ渡し、固定の非機密instructionだけをargv、manifest本文をstdinへwriteしてEOFする。exit 0とturn terminalをprocess channel、arm後に新規作成されたparent/child session fileだけをsession channelとしてANDする。人向けstdoutの文言やcoordinatorの自己申告はchild証跡に使わない。

### Q6. Kiro CLIとKiro IDEでselection policyを二重化しないためにはどうするか

[Answer]: 両harness conductorは同じ公開C-01へresolve/run/resume/finalize envelopeを渡し、C-07の外部`kiro-cli` coordinatorを利用する。Kiro CLIのagent JSON hooksとKiro IDEの`.kiro.hook`形式は既存projection boundaryに残し、selector、wave分割、session parserはcore正本だけに置く。Kiro IDEの既存`invoke_sub_agent`はfloor/legacyとして維持し、native `kiro-subagent`証跡へ読み替えない。

### Q7. wave途中のfailureとresumeをどう扱うか

[Answer]: waveは必ず直列にする。C-01が前waveのC-08 evidence envelopeをconductorへ返し、conductorがC-11 checkを行ってresult envelopeをC-01へ記録し、両方greenになった後だけconductorが次waveを開始する。C-01/C-07/C-08とC-11は直接import/callしない。dispatch後のapproval、process、session、child、referee failureは別driverへfallbackせずfailed-resumableにする。resumeは新attempt/nonce/agent role/session inventoryでfresh probeし、fenced checkpointに確定済みのwaveだけを再利用して最初の未確定waveから再開する。

### Q8. Kiroの自動session保存から機密情報をどう守るか

[Answer]: Kiro provider自身のsession保存は外部CLI契約として発生するが、Amadeusは`.json`/`.jsonl` raw、prompt、message、summary、tool input/outputをrecord/auditへコピーしない。allowlist parserはsession/parent/agent/status/timestampだけを短命bufferへ投影する。credential、email、account、model promptは保持しない。runtime agent configとmanifestにはcredentialを入れず、provider envは既存認証に必要な最小集合だけを継承する。

## 曖昧性分析

- balanced wave、fallback、legacy、platform、C-08/C-11境界は上流で一意に確定している。
- Kiro 2.12.1でCLI、V2 default、subagent上限4、parent付きpersisted session、agent trust surfaceは公式仕様とlocal helpで確認した。
- 未確定なのはversion固有session field pathとheadless auth behaviorであり、Code Generation entryのcredentialed discovery gateでprofile化する。取得不能時の結果はparkと確定しているため、成果物生成を止めるユーザー判断ではない。
