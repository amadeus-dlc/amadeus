# Security Design — kiro-acp-live

## 上流契約とtrust boundary

本設計は`business-logic-model.md:7-17`を入力とし、Kiro ACPをrun-owned untrusted childとしてC4 lifecycleへ接続する。NFR Requirementsはscope上skipされたため、存在しないsecurity requirementsやtech-stack decisionsは補作しない。

C2はGHA hard deny→strict opt-inを最初に評価し、deny時はphase evidence、probe、scratch、spawnを0回にする（`business-logic-model.md:7`）。許可後にU07所有`KiroAcpPhaseGuard`を実行し、C4/U01 public APIを変更しない（同:8）。成功後の拘束順序はC4 registrar作成→minimal scratch root/HOME/TMPDIR登録・確保→isolated preflight→project content materialize→journey spawnとする。同:9-11の「fresh project/home」は、preflight前に空のHOME/TMPDIRを確保し、preflight後にproject contentを配置する二段階として具体化する。preflight不成立も同じregistrarのcleanupへ入る。

preflightとjourneyは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`NO_COLOR`のexact envだけを共有し、`AWS_*`、source HOME、profile/config locator、ambient env spreadを拒否する（同:9-10）。native credential substrateは同じisolated envの`whoami`成功だけをcapabilityとして扱い、credential value/pathを取得・保存しない。preflightは作成済みscratch以外へwriteせず、そのscratch writeもregistrarで回収する。

## ACP transport controls

childはrun-owned supervisorの新規process groupへ直接spawnする。argvは`kiro-cli acp --agent amadeus --trust-all-tools --agent-engine v2`に固定し、scratch cwd以外を拒否する（`business-logic-model.md:11-12`）。spawn前に`KiroToolExposurePolicy`がproject-only agent manifestを検証し、server-side/built-in/MCP tool集合をexact empty、hook集合をstatus evidence helper 1件だけに固定する。未知field、追加tool、user/local agent source、manifest digest不一致はcapability不成立でspawnしない。`--trust-all-tools`がpromptを省略できる対象はこの空集合だけである。

さらにU07 C5所有の`AcpSandboxPort`を必須capabilityとする。`probe(spec)`は`{backendKind,backendVersion,filesystemDeny,execDeny,networkBroker,escapeTestDigest}`を返し、`spawn(spec)`はsandbox handleとowner identity、`terminate(handle)`は全対象残存0 receiptを返す。Linux backendはuser/mount/network namespace、read-only bind mount、seccomp exec deny、run cgroupを組み合わせ、childからcgroupfsとsource HOME/repository/credential pathを不可視にする。Darwin backendはrun固有Seatbelt profileとparent-owned loopback proxyを組み合わせ、許可実行ファイルのrealpath/digest以外のprocess生成をdenyする。各backendでfilesystem write、shell exec、fork/setsid escape、直接networkの実child self-testをspawn前に行い、1件でもdenyできなければcapability不足にする。

networkはC5所有`AcpEndpointBrokerPort.open({runNonce, scheme:"https", host, port, spkiSha256})`だけを通す。host/portはisolated `whoami` preflightの認証済み接続先から固定し、brokerがDNS解決、TLS hostname/SPKI検証、redirect拒否、IP再解決時のidentity一致を担う。childはrun-private loopback endpointだけへ接続でき、直接DNS、任意IP、redirect先へ到達できない。status helperもC5所有`ReadonlyEvidenceBroker`のrun-private Unix socketへだけsignalし、brokerはpeer PID/start identity、run nonce、helper realpath/digestを検証してlatch/counterをatomic writeする。C4はgeneric registrar/deadline/cleanupだけを提供し、Kiro固有sandbox、endpoint、status semanticsを所有しない。

ACP client capabilitiesも`fs.readTextFile=false`,`fs.writeTextFile=false`,`terminal=false`、`mcpServers=[]`へ閉じる。unexpected permission requestまたはtool callは即`FAIL:ASSERTION_FAILED`にし、empty exposure policyとsandboxにより観測前後の外部filesystem write、terminal process、非broker network callが0であることをreceiptで確認する（同:13-14）。

stdoutはNDJSON framing前のraw bytesで、1 line 262,144 bytes、total 2,097,152 bytes、4,096 messages、in-memory queue 32 messages/524,288 bytesを上限とする。stderrは262,144 bytes、combinedは2,359,296 bytes。collectorはincremental SHA-256を計算し、raw stdout/stderrやsession IDをartifact/receipt/logへ保存しない。最初のoverflow、UTF-8不正、JSON depth>32、duplicate response ID、unknown response ID、reply後のcurrent-generation updateをexecution failureへ固定し、以後はgroup reapまでdigest/countだけのdiscard-drainを続ける。

request IDはrun nonceから独立した単調整数で、`initialize`→`session/new`→`session/prompt`の各応答をexactly once相関する。session IDはprocess-localのbrand値とし、prompt request以外へ転記せずcleanup時にzeroizeする。notificationはcurrent process/generationに属し、closed size/count内の場合だけ観測する。assistant proseやtoken順序はsuccess evidenceに使わない。

## Off-band status evidence

prompt前にC6はscratch rootをrealpath固定し、latchを`lstat`して不存在、counterを同じroot内のnon-symlink regular fileとして読む。不在は`c0=0`、存在時はmode 0600/owner一致/非負safe integerだけを受理する（`business-logic-model.md:14`）。literal `/amadeus --status`の後、parent-owned brokerが作成したlatchとcounterを再度`openat`相当のno-followで読み、親directory identity不変、latchがregular file、`flag="status"`,`source="read-only-flag"`,`turn=c0+1`、counterも`c0+1`を必須にする。

successは上記fresh pair、exactly one `end_turn` reply、permission request 0、tool call 0、state file不存在、`amadeus/spaces/default/intents`不存在のANDである。preseed、symlink、foreign owner、counter非増分/飛越し、duplicate/late reply、prose-only replyはnon-green。latch/counterの本文はreceiptへ出さず、検証済みturnとdigestだけを保持する。

## Deadline・cleanup・evidence

initialize 30秒、session/new 60秒、prompt 240秒、journey 330秒を単一monotonic deadlineから切り出す。prompt timeoutでは`session/cancel`を1回だけ送り5秒、stdin close→SIGTERM 5秒→SIGKILL 5秒→group `ESRCH`確認→supervisor reapとする。supervisor PID/start identityとPGIDをrun nonceへ束縛し、reap前にidentityを保持してPID/PGID再利用を防ぐ。late update/replyはcurrent outcomeを変更しない（`business-logic-model.md:15-16`）。

cleanupとleak scanは独立に全対象を試行し、scratch/source HOME/profile path/ambient key/raw output/session IDのartifact混入を検査する。U07は既存C8 atomic appendとC9 matrix projectionだけを呼び、ledger失敗をLiveOutcomeへ偽装しない。capability不足時は同:17,43-45のsanitized closed fieldsだけでclosure evidenceを作り、raw outputやmachine credential metadataを含めない。

## Verification

`kiro-acp-contract`でgate precedence、registrar/scratch/preflight順序、env exactness、agent manifest追加tool/未知field、sandbox backend/escape self-test、DNS/TLS/SPKI/redirect、unexpected tool notification時の外部副作用0、broker nonce/helper digest不一致、ACP順序、各raw-byte境界、queue saturation、oversized/deep JSON、response ID replay、preseed/symlink latch、counter不一致、zero/unexpected tool、cancel omission、TERM無視、late reply、cleanup/C8/C9 failureをmutant redにする（`business-logic-model.md:33-41`）。cache、database、AWS scalingは単発CLI journeyに非適用である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:12:39Z
- **Iteration:** 1
- **Scope decision:** none

ACP framing、correlation、deadline、off-band anchorは具体化されているが、tool権限が観測だけで封じられており、preflightのisolated HOME/TMPDIRもscratch生成順序と矛盾する。

### Findings

- BLOCKER | --trust-all-toolsの副作用をclient capabilityと事後assertionでは防止できない | security-design.mdとbusiness-logic-model.mdはkiro-cli acp --trust-all-toolsを起動し、client capabilitiesのfs/terminal=false、tool call・permission requestの観測時failureでblast radiusを封じる。しかしtrust済みserver-side toolが実行されてからnotificationを観測する実装では、FAILへ分類する時点でfilesystem・terminal副作用が既に発生している。mcpServers=[]もKiro/agent内蔵toolを無効化する契約ではなく、run-owned untrusted childというsecurity boundaryを満たさない。 | tool実行をspawn時またはOS sandboxで予防的に拒否するclosed enforcementを定義し、tool requestが通知されても副作用回数0であることをfake serverで検証する。
- BLOCKER | preflightが要求するisolated HOME/TMPDIRとscratch生成順序が両立しない | business-logic-model.mdはStep 3でversion/help/whoami preflight、Step 4でHOME/TMPDIRをscratchへ固定し、Step 5で初めてfresh project/homeを作る。security-design.mdはpreflightとjourneyで同じisolated envを共有すると要求するため、whoami時点ではHOME/TMPDIRが未作成になる。preflight側で作成すればread-only probe境界を破り、作成しなければCLI/auth結果が実journeyと一致しないため、実装順序が一意でない。 | gate・Phase guard後にregistrarと最小scratch HOME/TMPDIRを確保してからisolated preflightを行い、preflight不成立時も共通cleanupへ入る順序へ閉じるか、mutation不要で同一auth substrateを証明できる別preflight contractを定義する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:15:04Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のtool副作用防止とscratch/preflight順序は具体化されたが、その実現をU07所有外の共通C4へ移し、sandbox/network brokerの実装・capability判定境界も閉じていない。

### Findings

- BLOCKER | U07固有sandboxとstatus brokerを共通C4所有へ追加して機能設計の所有境界を破っている | business-logic-model.mdはU07を既存C2/C4/C7〜C9へ接続するC5/C6 sliceとし、KiroAcpPhaseGuardでもC4/U01 public APIを変更しないと明示する。一方logical-components.mdは新規AcpProcessSandboxとReadonlyEvidenceBrokerをC4所有にし、security-design.mdはC4にendpoint broker、helper peer検証、latch/counter atomic writeまで要求する。これらはKiro ACP固有のtool/network/status semanticsであり、generic lifecycleであるC4へ実装するとU07だけでは完結せず、U01共通契約と他adapterのblast radiusを変更する。
- BLOCKER | 必須AcpProcessSandboxのcapability判定と実装portが定義されていない | security-design.mdはfilesystem・exec・networkを予防的にdenyし、Kiro endpointだけをbroker経由で許可できるsandboxを必須capabilityとするが、logical-components.mdのKiroAcpCapabilityProbeはversion/help/whoami/distしか検査せず、sandbox backend、endpoint identity、DNS/TLS/redirect処理、broker interface、失敗結果の所有者がない。developerは何をprobeしてsupported/unsupportedを決め、どのinterfaceでchild通信を仲介するかを設計から実装できない。
