# pi-doctor-diagnostics — Business Logic Model

## 目的と責務境界

`probePiEnvironment(input, ports)`はPi正式対応に必要な環境を、固定順の独立checkへ投影するread-only診断である。trustを承認せず、packageをinstall/updateせず、resourceをロード・実行せず、workflow state、audit、session、settingsを変更しない。

Pi extension内の`amadeus-doctor` command、project-local toolを直接実行するcore/setup CLI、test fixtureは同じpure classifierとport contractを使う。untrusted projectではproject-local skill/extension自体がロードされないため、remediationはdirect CLI経路を案内し、doctorがtrustを迂回してextensionを実行しない。

## Snapshot and check dispatch

1. `PiDoctorInput`のproject rootをrealpath/no-followで確定し、platform、environment key allowlist、任意のnative `ctx.isProjectTrusted()` factをparseする。raw HOME、token、全envをdomainへ渡さない。
2. `TrustedPiDoctorCatalogPort`から、authored Pi harness manifestをpackage時にcompileしたexpected resource catalogを一度だけ読む。catalog envelopeはframework distribution version、doctor contract version、payload digestを持ち、実行中doctor moduleへ埋め込まれたexpected digestとexact matchしなければならない。target workspaceのinstall/package manifestを期待値に使わない。
3. portはrun内で各sourceを一度だけsnapshotする。Pi executable resolution/version stdout、Bun、platform、trust/settings、filesystem resource metadata、install/package manifest、driver static contractをimmutable observationにする。
4. checkをstable ID順にpure evaluateし、結果をすべて集約する。1件のfailureで残りをshort-circuitしない。probe自身がthrowした場合はそのcheckだけを`error`へ正規化し、raw exceptionを出さない。
5. required checkがすべて`pass`ならreport status=`healthy`、1件以上`fail | unsupported | error`なら`unhealthy`でexit 1、`not-applicable`だけはexitへ影響しない。check orderとexitは表示labelに依存しない。

## Runtime, version, platform, and Bun checks

| Check ID | Observation | Pass | Failure |
|---|---|---|---|
| `pi.runtime.executable` | PATHで最初に解決したPi executable、realpath digest、spawn可否 | executable regular fileかつ`--version`を起動可能 | missing/unexecutable/spawn error |
| `pi.runtime.version` | exact executableへ`--version`、2秒timeout、stdout/stderr上限 | strict SemVer `>=0.83.0` | 0.82.x、malformed、timeout、nonzero |
| `pi.runtime.platform` | runtime platform | `darwin | linux` | `win32`等は`unsupported` |
| `pi.runtime.bun` | PATH Bun executableとstrict version probe | required minimumをcatalogから満たす | missing/malformed/nonzero |

version probeはproject rootではなくresource discoveryを無効化したneutral cwdで、`PI_OFFLINE=1`、credential env除外、stdin closed、bounded stdout/stderrで実行する。directory名、package manager metadata、`mise` install labelからPi versionを推測しない。reportはexecutableのbasenameとdigestだけを持ち、home絶対pathを出さない。

Pi executable欠落時もplatform、Bun、trust、filesystem resourcesを検査する。versionは`blocked-by(pi.runtime.executable)`という非pass observationを返すが、primary failure IDはexecutableに集約し、同一原因を二重remediationにしない。

## Project trust check

1. native Pi extension contextからrun-local trust factが渡された場合、それを現在processの正本とする。`true`はpass、`false`はfailである。
2. direct CLIでは`PI_CODING_AGENT_DIR`またはplatform defaultからglobal `trust.json`と`settings.json`をread-only parseする。project canonical pathからrootへ向かい、closest saved yes/no decisionを選ぶ。
3. saved decisionがなければ`defaultProjectTrust`を評価する。`always`はtrusted、`never`はuntrusted、`ask`/absentは`unresolved`である。非対話doctorはpromptを出さず、unresolvedをfailとする。
4. run-local `--approve`はprocess context factがある場合だけ観測できる。direct CLIは未観測overrideを推測せず、保存状態に基づく結果へ`source=saved|default`を付ける。
5. malformed/unreadable trust/settingsはerrorとしてfailする。doctorはfileを修復せず、`/trust`またはinteractive Pi再起動、もしくは一回限りの`--approve`をremediationとして提示する。

reportには`trusted | untrusted | unresolved | unreadable`、decision source、matched ancestorのproject-relative relationだけを載せ、trust file pathや他project entryを出さない。Pi trustはresource input guardでありsandboxではない旨をremediation IDへ紐づける。

## Skills, extensions, package resources, and driver

`TrustedExpectedPiResourceCatalog`がすべての期待値の正本である。entryは`resourceId`、kind、project-relative path、required、sha256、entry contractを持つ。authored manifestはpackage build時の入力にすぎず、runtimeはdiagnostic targetからこれを読まない。compiled catalogはdoctor codeと同じversioned distributionに同梱し、そのcanonical digestをdoctor moduleに埋め込む。実行中code/packageを信頼起点とし、target側install manifestとresource treeはすべてuntrusted observationとして扱う。

catalog missing、schema/version mismatch、digest mismatchでは`pi.catalog`をfailし、resource/package/driver checkを全て`blocked-by(pi.catalog)`としてreportをunhealthyにする。target側に残ったresource一覧や固定defaultからexpected setを再構成しない。

| Check ID | Scope | Pass criteria |
|---|---|---|
| `pi.resource.skill.amadeus` | root orchestrator skillとstage/session skill catalog | required skillsが存在し、frontmatter name/sha256/catalog集合一致 |
| `pi.resource.extension.lifecycle` | lifecycle extension entrypoint | regular file、sha256、expected export declaration一致 |
| `pi.resource.package` | setup install manifestまたはPi Package local/git projection | active routeのnormalized path/hash集合がexpected catalogと一致 |
| `pi.resource.driver.subagent` | Pi child driver entrypoint | regular file、sha256、static RPC/doctor-probe contract ID一致 |

setup routeとPi Package routeが両方存在する場合は各routeを独立sub-observationとしてtrusted catalogへ比較し、片方のhealthyで他方のdriftを隠さない。target install/package manifestはexpected setを供給せず、version、missing、extra、path/hash差分を持つ独立observed artifactである。resourceとtarget manifest entryを同時削除してもtrusted catalogとの差分としてfailする。どちらのrouteも存在しない場合はpackage check failである。optional resource欠落は`not-applicable`、required resource欠落/hash mismatch/symlink/duplicate/case aliasはfailである。

driver checkはmodel/providerを起動しない。static catalogとschema parseを正本とし、任意の`--doctor-probe --json`はBunがhealthyな場合だけoffline/2秒/closed stdinで実行する。probe timeoutやinvalid schemaはdriver check failだが、prompt、workspace absolute path、credentialをargv/envへ渡さない。

## Blocked workflow and presentation

extension healthがblockedでも`ReadOnlyDiagnosticPort`はhealth latch、journal、engine nextを依存に持たず、Pi doctor snapshotだけで完走する。workflow-changing handlerと同じregistration gateを共有しない。status/doctor command registration失敗はextension registration outcomeに現れ、doctor classifier自身をsuccessへ変えない。

core doctor dispatcherはharness identity=`pi`のとき、common harness-neutral checksとPi check catalogだけをcomposeする。`.codex` config/hook/trust、Claude hook/agent、Kimi managed blockなど他harness固有checkをPi reportへ入れない。rendering adapterは各resultを既存`DoctorCheck {pass,label,fix}`へ写像できるが、stable check IDとstructured reportを機械判定の正本とする。

human outputはcheck ID、PASS/FAIL/UNSUPPORTED、redacted observed、expected、remediationを固定順で表示する。JSON outputも同じsnapshotから生成し、色・端末幅・localeで判定を変えない。

## Failure and verification scenarios

| Scenario | Expected |
|---|---|
| healthy Pi-only fixture | required check全pass、exit 0、他harness check 0 |
| Pi 0.82.x | `pi.runtime.version` fail、actionable minimum、formal success 0 |
| native Windows | platform unsupported、formal success 0 |
| untrusted/unresolved | trustだけfail、project resourceを実行0 |
| skill/extension/package/driver 1件欠落 | 対応checkだけprimary fail、他check完走 |
| malformed trust/catalog/manifest | 対応check error、repair 0 |
| resourceとtarget manifest entryを同時削除 | trusted catalogによりresource/package check fail、silent pass 0 |
| blocked lifecycle extension | doctor完走、workflow mutation/audit/state diff 0 |
| token/home pathを含むfixture | text/JSON/errorへsecret/absolute home path 0 |
| repeated run | byte-normalized JSON、check order、exitが一致、filesystem diff 0 |

Unit-local testはcheckごとのtable/property test、process timeout、malformed schema、redaction、Pi-only composition snapshotを所有する。実Pi setup/package/live journeyからの呼出しは`pi-conformance-evidence`が横断検証する。

## 上流トレーサビリティ

`unit-of-work`のPiDoctorChecks ownership、`unit-of-work-story-map`のSCN-007〜009とFR-DOC/NFR-REL/SEC/CMP、`requirements`の独立positive/negative matrix、`components`のcore dispatch/Pi overlay境界、`component-methods`のstructured report、`services`のread-only短命diagnosticをworkflowへ具体化した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:12:22Z
- **Iteration:** 1
- **Scope decision:** none

診断実行境界は閉じているが、期待resource catalogの信頼起点が未定義で自己整合によるsilent passが可能である。

### Findings

- BLOCKER | skills・lifecycle extension・setup/package routes・child driverの期待catalogを「Pi harness manifestから取得」するだけでは、そのmanifestが診断対象workspaceにある可変なinstall manifestなのか、package側の信頼済みmanifestなのかが閉じていない。前者の場合、resourceとそのmanifest entryを同時に削除・改変すればsnapshotは欠落を期待対象から外して全checkをpassでき、必須能力欠落のfail-closedとsilent degrade禁止に違反する。expected catalogは実行中doctorと同じversionに束縛されたpackage内immutable catalogまたは検証済みdigest/signatureから取得し、target install manifestは独立したobserved artifactとしてmissing・extra・digest/version不一致を報告する契約が必要である。信頼済みcatalog自体を取得不能な場合も全該当checkを明示failureにしなければならない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:15:41Z
- **Iteration:** 2
- **Scope decision:** none

期待catalogが実行doctorに束縛された信頼済みpackage artifactへ分離され、自己整合によるsilent passを含む既知の欠落が解消されている。

### Findings

- None
