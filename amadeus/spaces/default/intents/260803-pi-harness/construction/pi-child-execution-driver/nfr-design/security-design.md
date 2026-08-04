# Pi Child Execution Driver — Security Design

## 適用範囲と根拠

本設計は `business-logic-model` が定める admission、idempotency、pending-terminal reconciliation、runtime snapshot、guardian、Pi RPC、terminal audit、private replay payloadを保護する。エンジンの条件解決で `security-requirements` と `tech-stack-decisions` は非適用のため再作成しない。新しい認証基盤、cloud service、database、権限sandboxは導入しない。

security goalは次の4点に限定する。

1. raw requestやRPC frameからshell/path/audit injectionを起こさない。
2. provider secret、prompt/task/persona、workspaceのhome絶対path、成功output本文をaudit/diagnosticへ漏らさない。
3. lifecycleに受理済みhandleがないPi executionを開始せず、cancel/timeout/crash後にprocess groupを残さない。
4. pending terminal / quarantine / replayの改変や復号失敗をsuccessへ丸めない。

## Trust boundary

| Boundary | Trusted | Untrusted / parse対象 | 保証しないこと |
|---|---|---|---|
| Public driver API | branded internal request、core ports | `unknown` raw request | callerの文字列をそのままidentityにしない |
| Runtime probe | exact resolved executable、version/profile snapshot | PATH、`pi --version` output、platform | install path labelからversionを推定しない |
| Guardian launch | Amadeus-owned guardian binary digest、ephemeral guardian public key、authenticated control channel | filesystem manifest、PID/PGID、nonce、recovery接続先 | manifestやPID/PGIDだけをprocess identityにしない |
| Pi RPC | versioned `PiRpcProfile` | stdout JSONL、stderr bytes、child exit | unknown frameをbest-effort受理しない |
| Lifecycle store | canonical key/fingerprint、CAS/lease/fence result | disk I/O failure、stale/pending/quarantine record | failure時のsilent continuation |
| Child process | 同じOS userで起動するPi | model/tool output、provider response | OS sandbox、credential非可視、悪意ある同一userからの隔離 |

child Piはparentと同じuser権限でworkspace toolを実行する。専用PGID、0600 file、暗号化vaultは事故・混線・不用意な開示を減らすcontrolであり、同一userが悪意を持つ場合のsecurity boundaryではない。この制約をdoctor/guideで明示する。

## Request admission と identity

### Parse, don't validate

`PiChildAdmissionBoundary`だけがraw `unknown`を読む。execution/child/parent ID、role、workspace、task、persona、timeoutを一度にparseし、全項目が成立した場合だけimmutable branded `PiChildRequest`を作る。

- ID、task、personaはnon-emptyかつUTF-8 well-formed。
- roleはclosed union `support | reviewer | construction`。
- timeoutはpositive finiteかつpolicy上限以下。
- workspaceは`realpath`後にregular directoryとして再確認する。callerが渡した未解決pathをspawn/auditに使わない。
- admission failureはnative process、lifecycle reservation、audit factを0件とし、raw値をdetailへechoしない。

idempotency keyとrequest fingerprintは`business-logic-model`のversioned length-prefixed SHA-256 schemaを唯一の実装にする。workspace/task/personaはdigestだけをlifecycleへ渡し、canonical schema versionを省略したhashやJSON stringifyを別実装しない。digestはconfidentiality controlではないため、低entropyのtask/personaを外部公開しない。

## Executable と launch boundary

### Immutable runtime snapshot

`new` reservation後に一度だけ取得した`PiRuntimeSnapshot`へ、exact executable realpath、実`--version`出力からparseしたsemver、platform、selected RPC profile、executable file identityを束縛する。spawnはsnapshotのexact pathをshellなしargv配列で使う。probe後spawn前にfile identityが変わった場合は`pi-probe-failed`でGOを送らない。

terminal replay / pending reconciliationはruntime probeを呼ばず、PATHやPi欠落が既存result回復を妨げない。

### Guardian runtime directory と authenticated lifetime

machine-local runtime root配下にrun IDごとの0700 directoryを作り、次を要求する。

- parent componentを`lstat`し、symlink/non-directory/owner mismatchを拒否する。
- manifest temporary fileはexclusive create + 0600、regular-file確認、write、file fsync、same-directory rename、directory fsyncの順。
- 既存manifest、nonce collision、hard-link count不正、owner/mode不正は`guardian-protocol-failed`。
- manifest fieldはpositive leader PID/PGID、256-bit CSPRNG nonce、`awaiting-go` stateだけ。task/persona/environment/secretを含めない。
- driverはcontrol pipeの値とmanifestをconstant-time nonce比較し、PID/PGID、process group identityを照合する。
- guardianは起動時にephemeral Ed25519 keypairを生成し、private keyをprocess memoryから外へ出さない。public key、owner-only Unix-domain control socket path、guardian protocol versionをinitial control pipeで返し、driverはnonce/PID/PGIDとともに`GuardianAcceptedHandle`へGO前に永続化する。public keyはmanifest fileへ期待値として逆輸入せず、accepted lifecycle factを信頼根にする。
- control socket directoryは0700、socketはowner-only。接続時は同一UID peer credentialを確認する。recovery clientは256-bit fresh challengeとaccepted-handle digestを送り、guardianはchallenge、handle digest、current PID/PGID、guardian stateをprivate keyで署名する。clientは永続public keyで検証し、一致したchannelだけへshutdown/status commandを送る。
- guardianは専用process groupのleaderとしてPi childと全descendantのextinctionを監督する。negative-PGID signalと`kill(-pgid, 0)`は、authenticated guardian commandを受けたguardian自身だけがcurrent self PGIDに対して実行し、driver/recoveryはpersisted PGIDへ直接signalしない。guardianはgraceful/TERM中は自身のterminationをlatchしてchild cleanupを続ける。最終SIGKILLだけはguardian自身も終了させ得るため、送信直前にchallengeとhandleへ束縛したsigned `kill-armed` receiptを返し、以後driverは同PGIDへ追加signalしない。
- GOは`recordProcessAcceptance`がguardian public keyを含むhandleをcommitした後にone-shot送信する。GO前のpipe close、duplicate GO、deadline超過はPi spawn 0件でguardianをreapする。GO後のparent pipe closeではguardianがshutdown policyを開始し、group extinction receiptを署名してから終了する。
- normal driverはspawn時から保持するOS process handleとchallenge-responseの両方を検証する。crash recoveryはchallenge-responseだけが成功した場合にguardian経由でcleanupできる。socket absent、signature/key/PID/PGID/state mismatch、leader消失では古いPGIDへsignalせず`stale-recovery-failed`または`process-reap-failed`としてquarantineする。

POSIX process groupはcleanup/failure domainでありauthorization boundaryではない。graceful/TERM pathのsigned extinction receiptはchallenge、accepted-handle digest、final PID/PGID、`kill(-selfPgid, 0) = ESRCH`観測を含む。SIGKILL pathではsigned `kill-armed` receipt、driverがspawn時から保持するoriginal guardian process handleのwait/reap、直後の`kill(-pgid, 0) = ESRCH`を要求する。post-checkでgroupが存在する場合、それが残存childか再利用groupかを推測して再signalせず`process-reap-failed`にする。guardianがextinction/kill-armed receipt前に異常終了した場合もgroup extinctを推測せずfailureとする。これにより元group消滅後にPID/PGIDが無関係groupへ再利用されても、そのprocessはaccepted public keyに対応する署名を生成できずsignal対象にならない。

## RPC transport security

### Strict version profile

RPC decoderは選択済み`PiRpcProfile`のclosed discriminator、field path、cardinalityだけを受理する。UTF-8 chunkをstateful decodeし、LF record、直前CRだけの除去、record/output capacity、command correlation IDを検査する。

- empty line、invalid UTF-8/JSON、unknown required frame、duplicate start/end、index不整合、response ID不一致はtyped protocol failure。
- stdoutだけをprotocolに使い、stderrをJSONとして解釈しない。
- prompt response successをtask completionとみなさず、`agent_settled`とcompleted assistant messageを必要とする。
- tool call、thinking、user message、tool resultをsuccess outputへ混ぜない。
- task/personaはacceptance後のRPC stdinだけで渡し、argv、manifest、auditへ置かない。

frame size、aggregate output、stderr tailはbounded policy値を持つ。capacity超過時に切り詰めたsuccessを返さず`output-capacity-exceeded`でfailureにする。

## Secret と sensitive data

### Data classification

| Class | Examples | Persistence policy |
|---|---|---|
| Secret | provider token、API key、OAuth bytes | driverは読取・hash・persist・logしない |
| Confidential content | task、persona、prompt、assistant output | RPC memory内、必要なprivate replay vaultだけ暗号化 |
| Sensitive path | raw workspace、home absolute path | realpath digestだけaudit、raw値はprocess cwdに限定 |
| Operational metadata | role、run/child/parent ID、failure code、timing | canonical audit可 |

child environmentはPiのprovider/auth解決へそのまま委譲される。driverはenvironmentを列挙してsanitized copyを作らず、値をdiagnosticへ渡さない。これによりcredentialの意図しないcopyを増やさない一方、childは同一user processとして環境を読める。この制約を「secret isolation」と誤記しない。

### Redaction pipeline

audit、batch failure、emergency diagnostic、stderr tailは同一`PiChildRedactor`を通す。

1. structured field allowlistでidentity/role/closed code/digest/counterだけを選ぶ。
2. free-form native errorはhome prefix、credential env pattern、bearer/key-like token、task/persona/output exact valueを置換する。
3. replacement後のUTF-8 byte上限でtruncateし、元長とtruncated flagだけを残す。
4. redaction failureは元bytesをfallback出力せず、固定`redaction-failed` detailへ置換する。

redaction testはsecret canary、home path、prompt/task/persona、multibyte boundary、stderr/stdout双方をcoverする。

## Private replay vault

terminal audit factはoutput/result digestとclosed metadataだけを持つ。restart後に公開`PiChildResult.succeeded.output`を復元するraw payloadは`PiPrivateReplayVault`へ分離する。

### Storage contract

- master key: CSPRNG 256-bit、repository/intent record外のmachine-local 0700 directoryに0600 exclusive create。audit/backup/generated distributionへ含めない。
- record key: HKDF-SHA-256(master key, salt=record CSPRNG, info=`pi-child-replay/v1` + key digest)。
- cipher: AES-256-GCM、recordごとに96-bit unique nonce。
- AAD: schema version、idempotency-key digest、request fingerprint、terminal-fact digest、result kind。
- payload: canonical `PiChildResult` private bytes、createdAt、retention boundary。credential/environmentは含めない。
- file write: owner-only temp、fsync、atomic rename、directory fsync。symlink/hard-link/owner/mode mismatch拒否。

decrypt時はschema、AAD、GCM tag、payload digest、terminal fact digestを検証する。key missing、tag mismatch、unknown schema、payload欠落は`replay-payload-unavailable`でspawn 0件、result捏造0件。active intent中はack後もduplicate replay用に保持し、purgeはcore retention policyとopaque acknowledgment handleに従う。secure deletionは一般filesystemで保証しない。

## Lifecycle、quarantine、audit integrity

### Fail-closed operations

reserve、launch intent、process acceptance、session identity、enter settling、prepare/commit terminal、pending read/reconcile、quarantine fence/indexの各closed failureは`business-logic-model`のcodeとspawn/cleanup/return方針を変えない。catch-all exceptionをsuccess、retry、empty resultへ丸めない。

### Quarantine controls

- quarantine indexはkey digest、failure code、createdAt、remediationだけ。raw request/result/pathを持たない。
- poison追加、clear、reserve、current reconcileは同じcross-process `QuarantineFence`で直列化する。
- fence保持中にblocking lease/lock、sleep、retry、network/process待ちを行わない。
- clearはexplicit operator action、expected record digest、same fenceを必須とし、自動TTL解除しない。
- index read/fence/quarantine visibility failureではcurrent spawnを禁止する。

### Audit chain

launch intent→process acceptance→session identity→settling→terminal prepare→terminal commitをcanonical identityで結ぶ。terminal commit failure時は今回の公開結果を`terminal-audit-failed`にoverrideし、durable pending factとencrypted replay payloadを保持する。emergency diagnosticはcanonical auditの代替成功証拠ではなく、failure visibilityだけを提供する。

## Threat matrix

| Threat | Control | Negative verification |
|---|---|---|
| shell/argv injection | shellless spawn、task/personaはRPC stdin | metacharacter taskでargv/process不変 |
| PATH swap / false version | exact realpath+version+file identity snapshot | probe後binary交換でGO=0 |
| forged guardian manifest / reused PID | 0700 dir、nonce+pipe、accepted public key、challenge-response | symlink/nonce/PID/PGID/key mismatch拒否、signal 0 |
| pre-acceptance orphan | launch intent→guardian awaiting-go→accept commit→GO | crash/pipe closeでPi spawn=0 |
| RPC frame confusion | versioned strict decoder、correlation、capacity | unknown/duplicate/oversize frameでfailure |
| secret leakage | structured allowlist、redactor、private vault | canaryが全artifactで0件 |
| replay tampering | AEAD+AAD+digest binding | ciphertext/AAD/key変更でreplay unavailable |
| quarantine TOCTOU | per-key fence、fence内再読/reserve | concurrent poison/reserveで二重spawn=0 |
| child escape from cleanup | authenticated group-leader guardian、guardian-only negative-PGID signal、signed extinction/kill-armed receipt | descendant fixtureでorphan=0 |

## Security verification gate

最低限、happy pathに加えて次を実processまたはreal filesystemで検証する。

- malicious task/persona/workspace文字列でもshell起動0、audit raw値0。
- guardian manifest symlink、mode/owner不正、nonce/pipe不一致でGO 0。
- 元guardian終了後に同じPID/PGIDを表すdecoy process/socketを用意し、key/challenge-response不一致でsignal 0。leader消失、別group出現、別run public keyでもsignal 0。
- secret canaryをenv/task/persona/output/stderrに配置し、audit/diagnostic/replay metadataで平文0。
- vault ciphertext/tag/AAD/key欠落で`replay-payload-unavailable`、respawn 0。
- process tree descendantを作りtimeout/cancel/crash後にauthenticated guardianのsigned extinction、またはsigned kill-armed + original handle reap + ESRCHを確認し、group member 0。
- quarantine追加/clear/reserve/reconcile競合でdeadlock 0、duplicate spawn 0。

検査はtest doubleだけで完結させず、filesystem mode/symlink/atomic rename、guardian process group、production redactor、production decoderのobservableを含める。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:41:30Z
- **Iteration:** 1
- **Scope decision:** none

secret・replay・fence境界は整合するが、永続handleがPID/PGID再利用を識別できず無関係process groupをsignalする危険が残る。

### Findings

- BLOCKER | Guardian manifestとdurable process handleがnonce・leader PID・PGIDだけでは、crash/recovery後に元groupが消滅して同じPID/PGIDが別process groupへ再利用された場合を識別できない。nonceはOS process identityへ結び付いていないため、negative-PGID signalやextinction確認が再利用後の無関係groupを元childと誤認し、同一userの別processをkillし得る。accepted handleへOSから検証可能なguardian birth identityをGO前に永続化し、signal直前に一致を再検証する契約、またはguardianをgroup leaderとしてextinctionまで生存させauthenticated control channel経由だけでsignalする契約が必要である。leader identityを証明できないstale recoveryはsignalせずfail-closedにし、PID/PGID再利用・leader消失・別group出現でsignal 0となるnegative testを追加する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:44:43Z
- **Iteration:** 2
- **Scope decision:** none

authenticated guardian channelとguardian自身によるgroup signalへ限定され、PID/PGID再利用時の誤signal経路を含む既知のsecurity・ownership・ordering欠落は解消されている。

### Findings

- None
