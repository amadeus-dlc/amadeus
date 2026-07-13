# Kiro Native Driver Business Rules

## 上流トレーサビリティ

本成果物は`unit-of-work.md`のU-05、`unit-of-work-story-map.md`のKiro slice、`requirements.md`のKiro native/fallback/resume要求、`components.md`のC-07/C-08/C-11、`component-methods.md`のwave/adapter/event契約、`services.md`のKiro process/session境界を規則へ変換する。

## Registrationとprobe

| ID | ルール | 違反時 |
|---|---|---|
| KXR-01 | Kiro provider slotは`kiro-subagent` adapterをexactly 1件持ち、他provider mappingを変更しない | registry起動拒否 |
| KXR-02 | probeはbatch/attempt resolve scope内1回、attempt外cacheなし、総45秒以内である | capability failure |
| KXR-03 | CLI versionだけでavailableにせず、CLI/help/auth/agent validation/behavior/session surfaceをANDする | pre-dispatch unavailable |
| KXR-04 | release profileは`kiro-cli 2.x` + `--agent-engine v2`とし、V3へsilent retryしない | mode failure |
| KXR-05 | behavior handshakeは本runと同じcwd/config/headless shapeで、非対話session作成とexit 0を実証する | native surface unavailable |
| KXR-06 | headless auth classの名前ではなく実behaviorを判定し、email/token/account detailを破棄する | confidentiality failure |
| KXR-07 | parent relationとcompleted terminalのversioned fieldをlive fixtureで確定できなければU-05をparkする | floor alias禁止 |

## Balanced wave

| ID | ルール | 違反時 |
|---|---|---|
| KXR-08 | native入力は2 Unit以上である | explicit hard error / auto preflight fallback |
| KXR-09 | `waveCount=ceil(n/4)`、`base=floor(n/waveCount)`、余りを先頭waveへ1件ずつ配る | input rejection |
| KXR-10 | 全waveは2〜4件、件数差1以下である | plan rejection |
| KXR-11 | flatten後のUnit順・集合・cardinalityを入力とexact matchする | Unit drop/duplicate failure |
| KXR-12 | 5=3+2、9=3+3+3、13=4+3+3+3をcanonical fixtureとする | test failure |
| KXR-13 | wave digestはexecution/attempt/plan/index/ordered Unitへ束縛する | correlation failure |
| KXR-14 | C-01がC-08 evidence envelopeをconductorへ返し、conductorがC-11 check resultをC-01へ記録して両方greenになるまで次waveをarmしない | failed-resumable |

## Runtime agentとtrust

| ID | ルール | 違反時 |
|---|---|---|
| KXR-15 | waveごとに一意なparent role、Unitごとに一意なworker roleを作る | binding rejection |
| KXR-16 | parentのtoolはread/thinking/subagentだけで、write/shell/AWS/MCPを与えない | security failure |
| KXR-17 | parent `availableAgents`/`trustedAgents`はwaveの2〜4 worker role集合とexact matchする | trust failure |
| KXR-18 | workerはread/write/thinkingだけで、subagent/shell/AWS/MCPを持たない | security failure |
| KXR-19 | worker read/write allowed pathは担当prepared worktree、denied pathはmain/他worktree/evidence/runtime config/session rootである | launch拒否 |
| KXR-20 | path制約を`allowedTools: [write]`で上書きせず、`toolsSettings.write.allowedPaths`を非対話pre-approvalに使う | trust failure |
| KXR-21 | `--trust-all-tools`をlaunchへ含めない | security failure |
| KXR-22 | runtime agent configは予約pathへexclusive createし、symlink/name/global-local collisionを拒否する | provider process 0件 |
| KXR-23 | config digest/ownerをarm前checkpointし、capture seal後だけowner一致cleanupし、cleanup完了をC-01が返す前にconductorはC-11 check/次waveへ進まない | failed-resumable |

## Launchとprocess

| ID | ルール | 違反時 |
|---|---|---|
| KXR-24 | waveごとに`kiro-cli chat --agent <parent> --agent-engine v2 --no-interactive`をexactly 1 process起動する | topology failure |
| KXR-25 | executable/argvを分離し、Unit/worktree/command/spec/prompt本文をargvへ入れない | security failure |
| KXR-26 | 固定instructionだけをargv、manifestをstdinへ1回writeしEOFする | coordinator failure |
| KXR-27 | stdin manifest ingestionをbehavior fixtureで実証できなければprofile unavailableとする | park |
| KXR-28 | U-02 identity/checkpoint/one-time arm/process groupを使い、C-07独自supervisorを作らない | architecture violation |
| KXR-29 | provider envは既存認証に必要な最小集合だけで、credentialをmanifest/config/auditへ複製しない | confidentiality failure |

## Session captureとevidence

| ID | ルール | 違反時 |
|---|---|---|
| KXR-30 | session baseline、role/config digest、capture/nonce/plan/waveをprovider arm前に固定する | success禁止 |
| KXR-31 | baseline後に作成された`.json`/`.jsonl`だけを対象とし、旧sessionを再利用しない | correlation failure |
| KXR-32 | runtime parent role/cwdを持つnew parent metadataはexactly 1件である | parent mismatch |
| KXR-33 | childはparent session ID、worker agent name、terminal completedをversioned profileでexact照合する | child incomplete |
| KXR-34 | expected Unit数 = worker role数 = distinct child session数で、Unit-role-childを全単射にする | child count/binding failure |
| KXR-35 | default/未知/余分child、別parent、duplicate role、failed/interrupted/terminal欠落を拒否する | evidence failure |
| KXR-36 | session file存在、title、task prompt、summary本文、coordinator自己申告からsuccessを推定しない | false success |
| KXR-37 | process exit 0、parent turn terminal、session evidence、capture joined/sealedをANDする | coordinator failure |
| KXR-38 | raw session、prompt、message、summary、tool input/outputを永続domain/audit/checkpointへ入れない | confidentiality failure |
| KXR-39 | unknown schema/eventは件数だけ診断し、required fieldの代替にしない | post-dispatch failure |
| KXR-40 | C-08はnative lifecycleだけを判定し、worktree成果/protected spec/convergenceを入力にしない | architecture failure |
| KXR-40a | C-01/C-07/C-08とC-11は互いをimport/callせず、conductorだけがversioned evidence/check envelopeを媒介する | architecture failure |

## Failure、resume、harness互換

| ID | ルール | 違反時 |
|---|---|---|
| KXR-41 | 明示driverのpre-dispatch failureはhard error、`auto`だけが`kiro-subagent-floor`へfallbackできる | selection failure |
| KXR-42 | provider arm後のprocess/session/approval/child/referee failureから別driverへfallbackしない | failed-resumable |
| KXR-43 | resumeは同じexecution、新attempt/nonce/role/inventoryでfresh probeし、最初の未確定waveから進む | resume拒否 |
| KXR-44 | 確定済みwaveはfenced C-08 resultと、conductorがC-01へ記録したC-11 resultが両方ある場合だけ再利用する | false reuse |
| KXR-45 | 旧process生存またはcapture未joinならtakeoverしない | liveness unknown |
| KXR-45a | 旧runtime configは旧process停止/capture join/owner/fencing一致後だけcleanupし、新attemptへ再利用しない | resume拒否 |
| KXR-46 | Kiro CLI/Kiro IDEは同じC-01 contractを使い、selector/wave/parserをharness proseへ複製しない | architecture failure |
| KXR-47 | Kiro IDE `invoke_sub_agent`とCLI既存subagent fan-outはfloor/legacyで、native successへ読み替えない | audit failure |
| KXR-48 | `AMADEUS_USE_SWARM` 0.1.xのenabled/other契約と`SWARM_DEGRADED`を維持する | compatibility failure |
| KXR-49 | Windows対応を表明せず、macOS live/Linux deterministicをrelease criterionにする | release contract failure |

## Verification rules

| ID | ルール | 違反時 |
|---|---|---|
| KXR-50 | fake suiteはwave property、trust不足、approval、parent 0/2、child不足/余分、terminal failure、unknown schema、crashを含む | coverage failure |
| KXR-51 | security fixtureは担当外write、session/evidence/config access、nested delegation、raw session永続化を拒否する | security test failure |
| KXR-52 | macOS liveは2 Unitと5 Unitの両方をKiro CLI/Kiro IDE conductorからproduction registry経由で実行する | release failure |
| KXR-53 | 5 Unit liveは3+2、parent 2件、child 5件、conductor-mediated前wave gate、全checkと二相finalizeを証明する | acceptance failure |
| KXR-54 | auth不足、unknown session profile、skip、approval failureをlive passへ読み替えない | false pass |
| KXR-55 | static dependency testはC-01/C-07/C-08とC-11間の直接import/call 0件を、conductor spyは`prepare → run-wave → check → record result`と二相finalizeの順序を証明する | architecture test failure |

## Decision table

| Probe | Units | Trust/session surface | Dispatch後evidence | 結果 |
|---|---:|---|---|---|
| unavailable | 任意 | 任意 | なし | explicit hard error / auto floor |
| available | 1 | 任意 | なし | native対象外 |
| available | 2以上 | trust/profile不足 | なし | pre-dispatch unavailable |
| available | 2以上 | available | parent/child/process不一致 | failed-resumable、fallbackなし |
| available | 2以上 | available | 全waveのC-08とconductor-recorded C-11 resultがgreen | conductor-mediated finalizeへ進む |
