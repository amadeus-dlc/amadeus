# Functional Design 質問 — Swarm Execution Lifecycle

## 判定

追加のユーザー質問はない。`unit-of-work.md`と`unit-of-work-story-map.md`がU-02のstateful deep module境界を確定し、`requirements.md`がprobe-once、fail-closed、crash recovery、atomic successを要求している。`components.md`、`component-methods.md`、`services.md`はC-01、C-04、C-08〜C-11の公開method、state、transition、audit、referee envelopeを固定している。

以下はproduct判断ではなく、上流契約を実装可能な一貫した形へ具体化したarchitect判断である。未決の選択肢がないためinteraction modeの選択や回答待ちは発生しない。

## 上流で確定済みの設計確認

### Q1. probe中のcrashも同じexecutionへresumeするか

[Answer]: 再開する。入力検証はattempt前に完了するが、behavior probeの前に、selection inputだけを持ちprobe/selection/plan digestを持たない`probing` checkpointをaudit-firstでmaterializeする。probe中断はactive-attempt recoveryを経て同じexecutionの新attemptへ移り、能力検査を再実行する。初回checkpoint前に`SWARM_DRIVER_ATTEMPTED`だけが残った場合はside effect不在を検証してそのbeginをabandonし、新executionを開始する。

### Q2. child spawn直後のcrash windowで孤児processをどう特定するか

[Answer]: `component-methods.md`のprocess identityと`services.md`のorphan group回収契約を満たすため、runtime内部の短命launch wrapperとone-time arm handshakeを使う。wrapperは自分のPID/PGID/start tokenをatomic writeしてもproviderを起動せず、coordinatorが実identityをdurable checkpointへ保存した後のexact armだけをconsumeする。armなしではattempt lease期限までに自己終了する。daemonや公開componentは追加しない。

### Q3. floor/legacyにnative evidenceがないのに`evidence-verified` stateを使うか

[Answer]: 使うが意味を明記する。nativeではC-08のAND verifier、floor/legacyではplanと全Unit結果の全単射検証が完了した状態を共通の`evidence-verified`とする。floor/legacyをnative successへ読み替えず、execution modeとdigestを分離する。

### Q4. referee完了後、`record-finalize`前にcrashした場合をどう再開するか

[Answer]: native/floor/legacy結果を`evidence-verified`へ保存し、conductorのadvisory check loopでclaimed/reasonsが確定した後、既存`record-finalize` subcommandを`kind=request`で呼ぶ。C-01は`finalizeInvocationId`、expected/claimed/reasons、check/protected-spec、merge対象git identityとtarget/strategy、attempt-local request/progress/result pathをcanonical digestでcheckpointへ保存する。既存refereeの同じ`finalize`呼出しが副作用前にrequest recordをcreate-if-absentし、同一invocationでも別requestなら拒否する。envelope取得後は同じsubcommandを`kind=result`で呼ぶ。C-01とC-11は互いを呼ばず、公開subcommand数も増やさない。

同一requestの同時実行はrequest recordだけでは防げないため、C-11はowner process identity、lease、fencingを持つ`FinalizeClaim`をCAS取得する。merge-backは既存順序どおり`amadeus-bolt complete --merge`でAIDLC dataを統合した後、`amadeus-worktree merge`へbound target/strategyを渡してcodeを統合する。各primitiveはoperation IDで部分成功を再調停し、C-11はmerge mechanicsを再実装しない。

merge primitiveはarmed operation wrapperから起動し、各不可逆substepがcurrent claimをCAS再検証する。owner crash後は旧wrapper/child groupの停止またはarmなし終了を証明してからclaimをtakeoverする。protected specはworker後HEADではなくprepared manifestの共通base blobをbaselineとし、各UnitのHEAD blobとworking-tree fileの両方を照合する。

### Q5. Windowsのprocess livenessを設計するか

[Answer]: 設計しない。`requirements.md`のNFR-08〜NFR-09、`unit-of-work.md`の横断制約、`services.md`のplatform節に従い、macOS/Linuxだけを対象とする。livenessを証明できないplatformや状態は`ATTEMPT_LIVENESS_UNKNOWN`でfail-closedにする。

### Q6. provider固有のinteractive/headless差とcapture bindingをどのUnitが所有するか

[Answer]: U-02がprovider-neutralなclosed runtimeを所有する。transportは`stdio-json | pty-interactive`、captureは`fixed-provider-path | event-bound-provider-path | hook-only`に閉じる。adapterはpure `prepareResources`でprefix reservation、attempt設定、owner marker、session baseline等をclosed `AuxiliaryResourcePlan`として宣言する。U-02がmaterializeしたsetをpure `buildExecution`へ渡し、fixedはそこでarm前initial bindingを作る。event-boundだけがprovider event後に`capture-bound` self-edgeを1回使い、hook-onlyはbindingを持たない。PTYの`ready-for-graceful-exit`は終了制御だけに使い、terminal後のretained evidence検証を省略しない。U-02がresource digest checkpointとowned cleanupを行う。U-03〜U-05は自分のadapter preparation／execution plan／resolver／projectionだけを実装し、このruntime、checkpoint、resource、live-control契約を変更しない。

## 曖昧性分析

- 曖昧な回答: なし。各回答は上流の要求・state contract・Unit所有権から導出できる。
- 回答間の矛盾: なし。短命launch wrapper、closed transport/capture、durable referee envelopeは既存conductor/referee責務を移動せず、provider差とcrash safetyを共通境界へ閉じる。
- 成果物生成を止める不足情報: なし。
