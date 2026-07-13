## Interpretations

- 2026-07-13T16:17:58Z — U-06はprovider behaviorを持たないrelease-only Unitとし、production registry、distribution、docs、platform deterministic、macOS native live、0.2.0 Issueの6 domainを同一treeへ束縛するfail-closed closureとして設計した。
- 2026-07-13T16:17:58Z — U-03 reviewで確定したdriver-keyed `DriverAdapterSet`を最終generic contractとし、U-06ではproduction composition rootの3 provider/4 driver/cardinality 2-1-1とunavailable/fake 0件を実objectから検証する。
- 2026-07-13T16:17:58Z — C-12の現行manifest discoveryはClaude/Codex/Kiro/Kiro IDEの4 dist treeを対象とし、dogfood self-installは現行どおりClaude/Codexだけを検査する; Kiro用self-install targetは要求外なので新設しない。
- 2026-07-13T16:08:30Z — U-05 Iteration 1 reviewを受け、C-01/C-07/C-08とC-11の直接import/callを禁止した; harness conductorがnative evidenceとcheck resultを別々のversioned envelopeとして往復させ、二相finalizeも個別callで媒介する。
- 2026-07-13T15:59:19Z — U-05はlocal `kiro-cli 2.12.1`のdefault V2 engineをrelease profileとし、V3 Early Accessへsilent retryしない; 上流のagent-v1 JSON、`toolsSettings.subagent`、headless、persisted session契約を同一profileへ閉じた。
- 2026-07-13T15:59:19Z — Kiro waveは`ceil(n/4)`個へ均等な連続sliceで分け、Unit-role-child sessionをattempt固有agent名で全単射にする; prompt/summary本文は割当証跡に使わない。
- 2026-07-13T15:59:19Z — non-interactive parentはread/thinking/subagent、workerは担当worktree限定read/write/thinkingだけとし、shell/nested delegation/MCPを与えない; convergence commandはC-11が外部実行する。
- 2026-07-13T15:42:41Z — U-04 Iteration 1 reviewを受け、model解決をpending/boundの`ProbeBindingV1`へ変更した; alias/default handshakeはmodelをpinせず、同じseed/config/nonceで得たSessionStart modelをseed済みcatalogへ照合し、本runだけexact modelへpinする。
- 2026-07-13T15:42:41Z — provider/static-hook envとmodel-tool envを分離し、attempt相関をexact 5 keyへ閉じた; tool側は`shell_environment_policy.inherit="none"`、safe scratch HOME/PATH/localeだけとし、evidence rootはcwd/worktree/add-dir/temp外でread/list/write拒否をlive fixtureに要求する。
- 2026-07-13T15:42:41Z — SubagentStopは完了証跡ではないため、hook start/stopと公式collaboration terminal itemのsender/receiver、tool status、child `agentsStates.status=completed`をANDする; C-08はnative lifecycleだけ、worktree成果/protected spec/convergenceはC-11だけが判定する。
- 2026-07-13T15:21:22Z — Codex Ultraを`model_reasoning_effort=ultra`単独ではなく、app-server catalogのUltra capability、effective override、SessionStart resolved model、実SubagentStart/Stop委譲のANDとして定義した; local 0.144.0では`gpt-5.6-sol`がUltra/automatic task delegationを公開している。
- 2026-07-13T15:21:22Z — Unit-child割当はattempt固有`amadeus_u_<assignmentToken>` custom agent roleを使い、hook `agent_type`から全単射で証明する; role configはgeneric workerを共有し、model/effortをpinせずparent Ultra設定を継承する。
- 2026-07-13T15:21:22Z — Codex captureはprovider-stateを読まず、JSONL streamとattempt専用SessionStart/SubagentStart/SubagentStop hook recordsのfixed-path二channelとしてU-02のcapture-before-arm/join-after-terminal lifecycleへ接続する。
- 2026-07-13T15:03:27Z — Iteration 1 reviewを受け、単一`RegistrationSlot.available.adapter`をdriver-keyed `DriverAdapterSet`へ訂正した; Claudeは2 immutable mode view、Codex/Kiroは各1 cardinalityをgeneric build時に検証し、provider mappingは変えない。
- 2026-07-13T15:03:27Z — provider-state captureをadapter内部の隠れたI/Oにせず、pure `EvidenceCapturePlan`をU-02 supervisorへ渡し、capture identity checkpoint、provider arm前start、group terminal後joinを共通lifecycleへ組み込んだ。
- 2026-07-13T15:03:27Z — C-01とC-11の直接edgeを排除し、Claude harness conductorだけがprepare/check、record-finalize request、finalize、record-finalize resultをversioned JSONで二相媒介する。
- 2026-07-13T14:47:48Z — Claude Code 2.1.178以降のAgent Teamsは任意team名ではなくsession-derived nameを使うため、execution/attempt/wave由来UUIDを`--session-id`へ渡して上流の一意team要件を満たす; deprecated `team_name`へ依存しない。
- 2026-07-13T14:47:48Z — Claude Code 2.1.203以降のUltra Code起動契約を`--effort ultracode`とし、xhigh単独、keyword受理、通常subagentをnative successへ読み替えない。
- 2026-07-13T14:47:48Z — C-05の「1 adapter/2 mode」と共通`DriverAdapter.driver`の単一値は、1 provider module/class familyから2つのimmutable mode-bound viewを生成し、resolve scope内だけcommon probeを共有する形で両立する。
- 2026-07-13T13:25:32Z — U-01はclosed contractと純粋selection policyだけを所有し、process、filesystem、audit、checkpoint、provider event parseは後続Unitへ渡す; unit-of-workの具体的境界をapplication-designの広いcomponent配置より優先した。
- 2026-07-13T13:25:32Z — Constructionで新しいproduct decisionを必要とする未決事項はなく、functional-design-questions.mdは上流で確定済みの回答と曖昧性分析を記録する; 不要なユーザー質問を増やさない。
- 2026-07-13T13:25:32Z — C-03の公開seamにwave分割が記載されていても、Kiro balanced waveの具象policyはU-05が所有する; U-01はregistrationとUnit順序保持contractだけを定義する。
- 2026-07-13T13:38:30Z — wire/schemaのclosed literal unionとdomain behaviorを同じ型名へ押し込まず、literal IDを包むfrozen value objectだけにinstance methodを持たせる; Iteration 1 reviewer指摘を反映した。
- 2026-07-13T13:50:46Z — U-02のprobing checkpointはbehavior probe完了後、attempted/selectedをaudit-first materializeする短命staging stateとする; probe中断はselection前かつ副作用0なのでFR-20のresume対象外と解釈した。
- 2026-07-13T13:50:46Z — floor/legacyの全Unit結果検証も共通のevidence-verified stateへ置くが、VerifiedExecutionResultの判別unionでnative evidenceと明確に分離する。
- 2026-07-13T14:11:34Z — Iteration 1 reviewを受け、直前のprobing解釈を訂正した; probingは初回/resumeともprobe前で、SelectionInputSnapshotだけを持ち、fresh probe後のSelectedContextはselected以後だけに置く。
- 2026-07-13T14:11:34Z — checkpointより先に残るATTEMPTEDは通常transitionへ偽装せず、ABSENT pre-digestを持つbegin intentとして、side effect不在確認後にabandonする専用reconciliationへ分けた。
- 2026-07-13T14:11:34Z — claimed/reasonsはcheck loop後に確定するため、既存record-finalize subcommandをrequest/resultの二相へ精緻化し、request相でcheckpoint binding、C-11 finalizeでrequest recordをそれぞれ副作用前に固定する。
- 2026-07-13T14:23:44Z — request recordは入力immutabilityしか保証しないため、C-11へprocess identity/lease/fencing付きFinalizeClaimとfenced progressを置き、同一invocationの単一writerを保証する。
- 2026-07-13T14:23:44Z — 現行merge-backを再照合し、amadeus-bolt complete --mergeはAIDLC state/audit/runtime統合、amadeus-worktree mergeは実code統合という別primitiveとして、既存順序と部分成功reconcileを設計へ明記した。
- 2026-07-13T14:31:11Z — finalize claim takeoverはowner processだけでなく進行中merge wrapper/child groupの停止またはarmなし終了も証明し、各不可逆primitive substepがcurrent claimを再検証する契約へ強化した。
- 2026-07-13T14:31:11Z — protected spec baselineをworker後HEADから作業前prepared baseのgit blobへ訂正し、HEADへcommit済みの同一改ざんも検出対象にした。

## Deviations

- 2026-07-13T16:17:58Z — U-06もUIを持たないがengine directiveのproducesに含まれるため、frontend-components.mdへN/A根拠とrelease checker/Issue feedback contractを記録した。
- 2026-07-13T15:59:19Z — U-05もUIを持たないがengine directiveのproducesに含まれるため、frontend-components.mdへN/A根拠とKiro CLI/Kiro IDE共通feedback contractを記録した。
- 2026-07-13T15:21:22Z — U-04もUIを持たないがengine directiveのproducesに含まれるため、frontend-components.mdへN/A根拠とCodex Ultra CLI feedback contractを記録した。
- 2026-07-13T14:47:48Z — U-03もUIを持たないがengine directiveのproducesに含まれるため、frontend-components.mdへN/A根拠とCLI feedback contractを記録した。
- 2026-07-13T13:25:32Z — stage定義ではfrontend-components.mdはUIを含むUnitだけの条件付き成果物だが、engine directiveのproducesに含まれるため、UI非適用の根拠とCLI引き渡し境界を記したN/A成果物を生成した。
- 2026-07-13T13:50:46Z — U-02もUIを持たないがengine directiveのproducesに含まれるため、frontend-components.mdへN/A根拠とCLI feedback contractを記録した。

## Tradeoffs

- 2026-07-13T16:17:58Z — Linuxのlive skipをrelease proofへ数える方式より、macOSの4 driver credentialed indexとLinux deterministic receiptを別domainにした; provider credentialなしCIを維持しつつnative保証を弱めない。
- 2026-07-13T16:17:58Z — GitHub APIをCIの恒常依存にする方式より、Code Generationでmarker一意のIssueをensureして検証済みreferenceをsealし、CIはlocal reference contractを検査する方式を選んだ。
- 2026-07-13T16:08:30Z — C-01とC-11がshared domain objectや直接callを持つ簡略形より、conductorがwire envelopeを検証して順序付ける既存境界を選んだ; call数は増えるが、driver lifecycleと成果収束の責務およびresume fencingを分離できる。
- 2026-07-13T15:59:19Z — 既存の単一`amadeus-developer-agent`を全Unitで共有する方式より、runtime Unit固有role configを選んだ; agent nameで割当を証明できる一方、exclusive materialize/digest/cleanupが必要になる。
- 2026-07-13T15:59:19Z — workerへblanket shell trustを与える方式より、担当worktree限定writeとC-11外部convergenceを選んだ; child自身のtest実行柔軟性より非対話trust境界とsession/evidence保護を優先する。
- 2026-07-13T15:59:19Z — Kiroの人向けstdoutやsummary自己申告より、capture-before-armしたsession metadataとprocess terminalのANDを選んだ; version固有fieldを実証できない場合はU-05をparkする。
- 2026-07-13T15:42:41Z — config aliasを事前にresolved modelとみなす方式より、catalog snapshotとmodel未pin handshakeを同じProbeBindingへ束縛する方式を選んだ; probeは増えるが、本runとのmodel同一性を機械検証できる。
- 2026-07-13T15:42:41Z — provider envをそのまま全subprocessへ継承する方式より、static hookだけに相関keyを渡しmodel toolを無継承にする方式を選んだ; 現行Codex profileで両立を実証できない場合は近似せずU-04をparkする。
- 2026-07-13T15:42:41Z — Unit成果存在からsubagent successを推定する方式より、hookとcollaboration stateのANDを選んだ; native delegation proofとC-11の成果/収束責務を分離する。
- 2026-07-13T15:21:22Z — `--dangerously-bypass-hook-trust`で非対話実行を強制する方式より、hooks discoveryとbehavior sentinelを要求して未trustedならfail-closedにした; attempt外の未知hookまで無条件実行する危険を避ける。
- 2026-07-13T15:21:22Z — model slugのhard-codeやconfig値の自己申告より、app-server `model/list`/`config/read`と実SessionStart modelを照合する方式を選んだ; 利用者のresolved modelを維持しつつxhigh-onlyを排除する。
- 2026-07-13T15:21:22Z — persistent Codex rolloutを証跡正本にする方式より`--ephemeral`と最小hook recordを選んだ; resumeはfresh thread/attemptとし、prompt/message/transcriptをAmadeusへ保存しない。
- 2026-07-13T15:03:27Z — session prefix衝突を確率的に無視したり既存task directoryを削除する方式より、bounded deterministic counter、user-scoped atomic reservation、team/task exact-path不存在検査を選んだ; 既存provider stateを再利用せずdispatch前に閉じる。
- 2026-07-13T15:03:27Z — 全provider-state locationをarm前に固定する方式ではUltraのrun ID生成後pathを扱えないため、Agent Teams fixed-pathとUltra stream-bound CaptureBindingのclosed variantを選んだ; bindingをaudit-first保存するまでdirectoryを読まない。
- 2026-07-13T14:47:48Z — Agent Teams/Ultra Codeのprovider stateだけ、またはstream自己申告だけを使う方式より、execution固有pathへ限定したprovider-stateとstream/hookのANDを選んだ; cleanup raceをobserverで閉じ、raw payloadは保存しない。
- 2026-07-13T14:47:48Z — Dynamic Workflowの未公開run/task fieldを推測実装する方式より、credentialed entry discoveryでversioned surface profileを確定し、取得不能ならU-03をparkする方式を選んだ; floor代替で受入を偽らない。
- 2026-07-13T13:25:32Z — generic plugin registryより、4 native driverを全単射で検証するversioned closed registrationを選んだ; 今回scopeの決定性、fail-closed、重複selector防止を優先し、要求外の拡張seamを作らない。
- 2026-07-13T13:25:32Z — redaction後の除去より、allowlist schemaでsecret-like fieldを構築不能にする方式を選んだ; 生値が一時的にも共有outcomeへ入らない。
- 2026-07-13T13:38:30Z — optional fieldをsmart constructorだけで守るopaque設計より、DriverRequestとharness別LegacySelectionの判別unionを明示する方式を選んだ; invalid state排除を型とレビューで直接確認できる。
- 2026-07-13T13:50:46Z — spawn後に親がidentityを保存する単純実装より、identity-firstの短命launch wrapperを選んだ; 任意crash境界で孤児processをattemptへ相関でき、常駐daemonは増やさない。
- 2026-07-13T13:50:46Z — referee stdoutだけを受ける方式より、事前bindingしたattempt-local envelopeと同一invocation再検証を選んだ; finalize後record前crashの二重mergeを防ぐ。
- 2026-07-13T14:11:34Z — identity fileだけを待つwrapperより、identity確立後もdurable one-time armを待つwrapperを選んだ; 親crashがidentity前後のどちらでも旧provider起動を0件にできる。
- 2026-07-13T14:11:34Z — C-01/C-11の直接依存や新subcommandより、同じrecord-finalizeのclosed二相をconductorが媒介する方式を選んだ; 既存component dependencyと公開subcommand数を維持する。
- 2026-07-13T14:23:44Z — C-11がgit/state mergeを再実装する方式より、既存2 primitiveへoperation IDとexpected pre-stateを渡し、各deep moduleが自身の部分成功を再調停する方式を選んだ。
- 2026-07-13T14:31:11Z — finalize parentだけをfenceする方式より、armed child supervisionとsubstep CASを併用した; parent crash後に旧childと新claimが同じtargetを更新するsplit-brainを防ぐ。

## Open questions

- 2026-07-13T15:59:19Z — Kiro 2.12.1 credentialed native fixtureでpersisted childのparent relation、agent name、completed terminalをどのexact field pathから取得できるか未確定; Code Generation entryでprofile化し、取得不能ならU-05をparkする。
- 2026-07-13T15:59:19Z — 公式Headless modeはAPI keyを標準とする一方、localはbrowser login済みで`KIRO_API_KEY`未設定である; 同じV2 no-interactive behavior handshakeが成立するか実証し、認証種別の自己申告だけでavailableにしない。
- 2026-07-13T15:59:19Z — runtime nested local agent configのdiscovery、path-scoped non-interactive write、stdin manifest ingestionが2.12.1で同時成立するか未実証; malicious fixtureを含むentry gateで確認する。
- 2026-07-13T15:42:41Z — Codex 0.144 credentialed fixtureで、static hookだけがattempt相関5 keyを受け取り、model toolはenv非継承かつevidence root read/list/write拒否となるか未実証; 分離不能ならU-04をparkする。
- 2026-07-13T15:42:41Z — 公式`collabToolCall`意味と0.144 generated schemaの`collabAgentToolCall`を実JSONL pathへ投影し、hook `agent_id`とreceiver child thread IDをexact相関できるか未実証; 取得不能ならU-04をparkする。
- 2026-07-13T15:21:22Z — Codex catalog/config surfaceはlocalで確認済みだが、credentialed `codex exec`でUltra overrideと3 hook eventが同時成立するlive handshakeは未実施; U-04 Code Generation entryで実証し、取得不能ならU-04をparkしてIntent scopeへ戻す。
- 2026-07-13T14:47:48Z — Dynamic Workflowのrun/task/agent state field pathは公式公開契約で確定できない; U-03 Code Generation entryのcredentialed macOS discoveryでprofile化し、機械取得不能ならこのUnitだけをparkする。
- 2026-07-13T13:25:32Z — なし; U-01の成果物生成を止める未確定事項はない。
