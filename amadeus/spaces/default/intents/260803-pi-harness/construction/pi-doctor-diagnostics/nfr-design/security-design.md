# Pi Doctor Diagnostics — Security Design

## 適用範囲

本設計はPi正式対応に必要なruntime、version、platform、Bun、project trust、skill、extension、package route、child driverを固定順で観測するread-only doctor境界を保護する。engine-resolved inputは `business-logic-model` のみで、条件付きの `security-requirements` / `tech-stack-decisions` は期待どおり不在である。

doctorはinstall/update/uninstall、trust承認、resource load、workflow mutation、audit/session/settings修復を所有しない。live model/provider journeyやformal evidenceも別Unitの責務である。

## Assets and trust boundaries

| Boundary | Trusted input | Untrusted/sensitive input |
|---|---|---|
| Doctor module | embedded expected catalog digest/contract version | target catalog/resource tree |
| Project root | canonical no-follow identity | symlink、path escape、foreign files |
| Process probe | exact resolved executable snapshot | PATH、stdout/stderr、exit/timing |
| Pi trust state | native run-local factまたはread-only saved/default parse | trust file全entry、other project paths |
| Resource observation | expected catalog entry | target install/package manifest、file bytes |
| Result renderer | typed `PiDoctorReport` | raw exception、terminal/locale |

doctor codeと同じdistribution versionへ束縛されたexpected catalogを信頼起点とする。target workspace内のinstall/package manifest、残存resource一覧、固定defaultから期待setを再構成しない。

## Read-only mutation firewall

全portを `ReadOnlyPiDoctorPorts` として分離し、write/open-truncate/rename/remove/install/trust approval/state transition/audit appendを型境界から公開しない。doctor run前後のproject tree、settings/trust、intent state、audit shard、Pi session、extension health latchのdigest集合をnegative fixtureで比較する。

extension healthがblockedでもdoctorは独立portで完走する。workflow-changing registration gate、journal reconciliation、engine next、continuation outboxへ依存しない。read-only command registration自体が失敗した場合はextension registration failureとして報告し、doctor healthyへ変換しない。

remediationは人間が後で実行できるcommand/guide IDであり、doctorが自動実行しない。`/trust`、interactive restart、setup update等を表示しても、prompt送信やtrust store編集を行わない。

## Project root and filesystem controls

project rootはabsolute canonical realpath、owner/type、no-follow ancestor/leafで確定する。root identityをrun中固定し、各resource read前後にroot containment、regular file identity、size/digestを再検証する。

- absolute/`..`/NUL/case-fold/Unicode aliasをcatalog/target pathとして拒否する。
- symlink、device、socket、FIFO、unexpected directoryをresource successにしない。
- filesystem readはsize/count上限を持ち、巨大fileを全量bufferしない。
- trust/settings/catalog/manifest JSONはclosed schema、byte/depth/entry count上限でparseする。
- TOCTOU source changeはcheck `error`であり、最初/最後のどちらかをpassにしない。

doctorはprivate installer transaction/quarantine/backup rootへ探索を広げない。target resource inventoryはexpected pathとobserved manifest pathのbounded unionだけを読む。

## Trusted expected catalog integrity

`TrustedPiDoctorCatalogPort`はframework distribution version、doctor contract version、catalog schema、canonical payload digest、resource entriesを返す。doctor binary/moduleに埋め込まれたexpected digestとenvelope digestがexact matchした場合だけ使用する。

- catalog missing/malformed/version/digest mismatchはprimary `pi.catalog` failure。
- catalog failure時はresource/package/driver checkを `blocked-by(pi.catalog)` とし、targetからfallback setを作らない。
- entryはresource ID、closed kind、normalized project-relative path、required flag、sha256、entry contractを持つ。
- duplicate ID/path、case alias、unknown kind、unexpected executable modeはcatalog failure。
- target install/package manifestはexpected setでなく独立observed artifactとしてmissing/extra/version/path/hashを比較する。

resourceとtarget manifest entryを同時削除・改変してもtrusted catalogとの差分としてfailする。catalog digestはsignatureの代替を主張しない。配布candidate自体のsource/provenanceはdistribution Unitが検証し、doctorは実行中moduleへのdigest bindingを検証する。

## Process execution isolation

Pi/Bun/optional driver probeは `BoundedOfflineProcessProbe` だけを通す。

1. PATHは文字列表示せず、allowlisted environmentからfirst executableを解決してregular/no-follow/realpath identityをsnapshotする。
2. version probeはexact executable pathをargv[0]に使い、neutral machine-local cwdで実行する。
3. stdin closed、`PI_OFFLINE=1`、network用proxy/credential/provider/model/token env除外、minimal PATH/locale/TMP allowlistとする。
4. 2秒deadline、stdout/stderr各byte上限、process tree termination/reapを行う。
5. stdoutはstrict SemVer/closed JSON parserへ渡し、stderr/raw exceptionをreportへ出さない。

neutral cwdはproject-local resource discovery外のowner-only temporary directoryで、symlinkなし、run後安全にcleanupする。cleanup failureはbounded machine-local diagnosticであり、projectを変更しない。

optional driver `--doctor-probe --json` はBun check healthy時だけ起動し、offline、promptなし、workspace pathなし、providerなしのstatic contract probeに限定する。model invocation、RPC prompt、child support/reviewer executionをdoctorから行わない。

## Trust state privacy

native extension contextのrun-local `isProjectTrusted()` factがある場合はcurrent processの正本とする。direct CLIだけがglobal trust/settingsをread-only parseする。

- canonical project pathからancestor decisionをclosest-firstで評価する。
- reportは `trusted | untrusted | unresolved | unreadable`、source=`native|saved|default`、matched relationだけを持つ。
- trust file absolute path、other project entries、全settings内容をreport/logへ出さない。
- malformed/unreadableはerrorで、default trustedへfallbackしない。
- noninteractive unresolvedでprompt/approvalを行わずfailする。
- direct CLIはrun-local `--approve`を推測しない。

trustはresource load authorizationでありhost sandboxではないことをremediation contractへ紐づける。

## Resource and route observation

expected resourceごとにregular file、no-follow、size、digest、frontmatter/export/static contractを観測する。skill/extension/driver codeをimport/executeしてcontractを検査しない。static parserはbounded inputとclosed export/contract declarationを使用する。

setup routeとPi Package routeが両方存在する場合、各routeを独立sub-observationとしてexpected catalogへ比較する。一方のhealthyで他方のmissing/extra/hash driftを隠さない。どちらも無ければpackage check failure。optional absentだけがnot-applicableで、required absent/symlink/mismatchはfailである。

driver static probeはresource digest/contract IDの補助であり、probe JSONの自己申告だけでpassにしない。target manifestとresourceを同時改ざんしてもexpected digestがauthorityである。

## Redaction and deterministic output

domainへ渡すenvironmentは必要なenum/version/boolean/digestだけで、raw HOME、PATH全体、token、proxy、provider envを渡さない。`PiDoctorRedactor`はraw exception/process output/filesystem errorをclosed failure codeとsafe observed factへ投影する。

reportへ許可するのはstable check ID、status、executable basename、version/platform enum、digest prefix、resource ID/relative path、expected range、remediation IDである。禁止:

- home/absolute path、username、trust file path、private installer path
- API/OAuth/Git/SSH/provider credential
- prompt/tool/session content、other project trust entry
- raw stdout/stderr/exception stack

human textとJSONは同一typed snapshotから生成し、locale/color/terminal widthでstatus/order/exitを変えない。redaction failure時はraw fallbackせず `diagnostic-redaction-failed` とする。

## Threat matrix

| Threat | Control | Negative verification |
|---|---|---|
| doctorによるtrust/resource mutation | read-only port firewall | run前後workspace/settings/state/audit diff 0 |
| target manifest自己整合pass | module-bound trusted catalog | resource+manifest同時削除でfail |
| path/symlink escape | canonical root + no-follow bounded read | target外read/load 0 |
| malicious Pi executable output | neutral cwd/env、bounded parser/deadline | huge/malformed/hangでtyped error |
| probeからcredential送信 | minimal env/offline/no prompt | credential canary child env/argv 0 |
| trust file privacy leak | relation-only projection | other project/path canary output 0 |
| driver probeでmodel実行 | static contract/offline probe only | provider absentでもdeterministic result |
| blocked extensionがdoctorも停止 | independent read-only registration/ports | health blockedでもchecks完走 |
| other harness check混入 | harness=`pi` closed composition | `.codex`/Claude/Kimi check count 0 |
| repeated run drift | immutable snapshot/stable sort | normalized JSON/exit/filesystem一致 |

## Failure policy

| Failure | Result | Safety behavior |
|---|---|---|
| project root invalid | doctor input error | target traversal/read 0 |
| expected catalog unavailable | unhealthy + blocked resource checks | fallback expected set 0 |
| executable missing | primary fail、version blocked-by | other independent checks継続 |
| process timeout/oversize | check error | process tree reap、raw output非表示 |
| trust unreadable/unresolved | trust fail/error | prompt/repair/autoapprove 0 |
| required resource mismatch | corresponding fail | import/load/repair 0 |
| redaction failure | diagnostic error | raw fallback 0 |

## Verification gate

- read-only port compile testとreal fixtureのrun前後digestでproject/settings/trust/state/audit/session mutation 0を確認する。
- trusted catalog missing/schema/version/digest mismatch、resource+target manifest同時削除を検証する。
- path traversal、symlink、case alias、source swap、huge/deep JSON、special fileをproduction observerへ通す。
- fake Pi/Bun/driver executableでhang、fork、huge stdout/stderr、malformed SemVer/JSON、nonzeroを注入し、deadline/reap/limitを確認する。
- child env/argv/cwdへcredential、prompt、home/workspace path canaryが0であることを捕捉する。
- native/saved/default/ask/absent/malformed trust matrixを検証し、other project entryがoutput 0件であることをscanする。
- setup/package routeのmissing/extra/hash mismatchを独立mutationし、片方のpassで隠れないことを確認する。
- Pi-only compositionで他harness固有check 0、blocked lifecycleでもdoctor完走、normalized JSON/order/exit反復一致を確認する。

検証はhuman labelやtarget manifestの自己申告ではなく、stable check ID、module-bound catalog、actual filesystem/process observation、run前後mutation diffから判定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:08:36Z
- **Iteration:** 1
- **Scope decision:** none

read-only port firewall、trusted catalog、isolated bounded probe、non-loading resource inspection、blocked lifecycleから独立したdiagnostic経路が整合し、具体的な循環依存・実装不能・security欠落を認めない。

### Findings

- None
