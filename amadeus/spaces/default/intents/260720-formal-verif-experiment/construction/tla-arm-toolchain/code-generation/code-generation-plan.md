# Code Generation Plan — tla-arm-toolchain

## 計画境界

本計画はU4 `tla-arm-toolchain`だけを対象とする。上流は`requirements.md`のFR-3/FR-4/FR-7/FR-8・NFR-1/NFR-3、scenario S-3/S-4/S-6/S-8、`unit-of-work.md`のU4完成条件、Functional DesignのBR-01〜23、NFR Requirements / Designである。User StoriesはSKIPされているため、各Stepは上記scenarioとrequirementへ直接traceする。

所有するのは、TLA+ tools 1.7.4の固定artifact取得とoffline再検証、OpenJDK 26.0.1のsnapshot、closed finite profileからのTLA+ module / cfg生成、network-denied TLC実行、TLC 1.7.4専用stream parse、共通`CellResult`へのverdict正規化である。fixture identity / patch / branch / 期待failure、Registry、U3 Evidence Storeへの書込み、TS oracle、matrix / cost、eligibility / Pareto、report、final CLI rootは実装しない。

application codeは`workspace root/scripts/formal-verif/`、testは既存`tests/` tierへ置く。TLC jarとJDK snapshotはGitへ追加せず`/.cache/formal-verif/`へ置き、project `.gitignore`へこのcacheだけを追加する。`package.json`、lockfile、test runner、CI workflow、`packages/framework/`、`packages/setup/`、`dist/`は変更しない。

## 実装前に固定する整合判断

### U3接続

machine-readable Unit DAGではU4のdirect dependencyはU1だけであり、U5がU2/U3/U4を統合する。一方、後発U4設計にはU3 process / evidence portへ渡す記述がある。さらに現行U3 `AuthorizedProcessRequest`はrepository内の単一実行file snapshotを前提とし、外部`JAVA_HOME`全体を表現できない。また`executeCell`は`exitCode=0`かつ`completedExploration=true`になる前にはnormalizerを呼ばないが、TLC counterexample / complete explorationの成立はU4 parserがraw streamから初めて判断する。

このためU4は、U1 `Result` / `CellResult` / canonical identityだけへruntime依存し、U4-owned `TlcExecutionPort` / raw outcome / normalizerを公開する。U3 `ProcessPort`へ直接import / adaptせず、U5専用integration harnessでbridgeする。U4でU3 integration readinessやwalking-skeleton完成を主張しない。

### network sandbox provider

offline runnerはprovider capabilityを必須とし、fetch / proxy / credential portを型上持たない。現worktreeではOpenJDK 26.0.1と`/usr/bin/sandbox-exec`を実測済みなので、macOSではarray argvで起動するdeny-by-default `DarwinSandboxExecProvider`を具体実装し、socket / DNS / loopback deny probe receiptをrun前に検証する。provider不在、probe失敗、非macOSでは`NETWORK_ISOLATION_UNAVAILABLE`とし、unsandboxed fallbackしない。Linux/container runtimeや新規dependencyは追加せず、別provider追加は別revisionとする。

### TLC 1.7.4公式grammarとの整合

実行argvは明示的な`-tool`を固定する。tag `v1.7.4`の公式sourceと固定jarの正常・反例run実測を正本とし、stdoutは`@!@!@STARTMSG <code>:<severity> @!@!@`から同じ`code`の`@!@!@ENDMSG <code> @!@!@`までを1 envelopeとしてparseする。START / END不一致、未閉包、入れ子、unknown code / severity、singleton envelopeの重複、trace state ordinalの重複・逆行を拒否する。repeat可能なのは進捗`2200:0`と、反例中にordinalが単調増加するstate `2217:4`だけである。envelope外は、expected module identityへbindした`Parsing file <canonical path>`と`Semantic processing of module <name>`だけをSANY補助行として許可し、verdict markerとして扱わない。

closed allowlistは、lifecycle `2262/2187/2220/2219/2185/2189/2190/2200/2268/2186:0`、success `2193:0`、stats `2199:0`、depth `2194:0`、invariant violation `2110:1`、trace header `2121:1`、state `2217:4`だけとする。成功は`2193:0` payload先頭のexact `Model checking completed. No error has been found.`同一1行＋LFを1件だけ要求し、続くv1.7.4 fingerprint estimate blockもclosed payload grammarで検証する。2行への分割、片側欠損、途中marker挿入、LF欠損、重複を拒否する。反例はexpected named invariantの`2110:1`、exact trace header `2121:1`、2件以上のordered `2217:4`を要求する。`2110`はbehavior violationであり、initial-state violation `2107`や1-state traceを受理しない。反例のstate列後は、任意個の`2200:0`、singleton `2199:0`、singleton `2194:0`、singleton `2186:0`、そのENDMSG後のLF、EOFの順で完全閉包し、途中prefixを拒否する。plain modeの`Error:`や`State K:`へfallbackせず、stats / depthは`2199:0` / `2194:0` payloadからだけparseする。成功もsingleton `2186:0`とそのENDMSG後のLF / EOFまで閉包する。実jarのprocess outcomeと結合し、成功grammarはexit code `0`、完全なnamed counterexample grammarはexit code `12`の場合だけ受理する。exit 0のcounterexample、exit 12のsuccess、その他のnon-zero、signal、timeoutは`HARNESS_ERROR`とする。

同じ公式sourceはthroughput-optimized GCでない場合に`2401:3` warningを出す。`2401:3`を含むseverity 3、その他のwarning / error envelope、bare `Warning:` / `Error:`、unknown / unpaired / contradictory envelopeはすべて`HARNESS_ERROR`とし、成功へ丸めない。OpenJDK 26.0.1の実行profileへ`-XX:+UseParallelGC`を追加し、heap / encoding / locale / timezoneと同様にfreeze / verifyする。flag不在・重複・別GC・起動時warningは`HARNESS_ERROR`とする。

### tally snapshotのevidence-first機械是正

CGP5記録後の独立照合で、Functional Designの「tally後でもreceivedAtがtally時刻以下ならacceptedへ追記する」記述と、固定`TallyReceipt`をcurrent accepted全体から再計算する記述が同時充足不能と判明した。production正本の`amadeus-election-store.ts`はtally後のoriginal / amendを同じlate laneへ送り、`tally.json`へtally時ballot snapshotを固定している。この一次証拠から解が一意であるため、team normのevidence-first 4条件ANDに従い新規選挙は開かず、leaderの2026-07-21T10:02:47Z契約で機械是正した。既存CGP5履歴は遡及変更しない。

`TallyReceipt`はtally時の`cutoffSeq=arrivalSeq`とballot snapshot identityを保持する。`Resolved` / `Eligible` / `PerVoterResolution` / `ChoiceWinner`は`arrivalSeq <= cutoffSeq`のaccepted prefixだけから導出し、receiptは以後不変とする。tally後のoriginal / amendはreceivedAtの大小にかかわらず共通late laneへdurable appendし、GoA 8は`reexamRequired`を保持する。V1/C1をtallyした後にV2/C2を同一または過去receivedAtで受領しても、late appendだけが増え、fixed receiptのwinner C1とsnapshot-derived集合が変わらない最小traceを固定回帰とする。

## 既存reuseと変更対象

| 区分 | 対象 | 方針 |
| --- | --- | --- |
| reuse | `canonical.ts` | canonical JSON / domain-separated SHA-256 identity |
| reuse | `contract.ts` | `Result`、`CellResult`、closed arm / verdict、UTC / SHA contract |
| reference only | `execution-evidence.ts` | stdout / stderr各16 MiB、raw evidence要件を参照するがruntime importしない |
| new | `tla-arm.ts` | closed profile、finite model / cfg / source map、TLC 1.7.4 incremental parser、normalizer |
| new | `tlc-toolchain.ts` | fixed descriptor、acquisition / runtime ports、cache / JDK / run manifest、closed error union |
| new | `fs-tlc-toolchain.ts` | bounded HTTPS、durable cache lifecycle、JDK snapshot、Darwin sandbox、process-group timeout |
| modify | `index.ts` | U4の必要最小type / pure surfaceだけをexport |
| modify | `.gitignore` | `/.cache/formal-verif/`だけをrepository-levelでignore |

pure generator / parserはfilesystem、network、processへ依存しない。network portを持つのはacquirerだけ、cache / staging / quarantine mutationはfilesystem adapterだけ、offline runnerはverified local identitiesだけを受ける。

## Comprehensive test配置

| Tier | ファイル | 主な反証 |
| --- | --- | --- |
| Unit | `tests/unit/t-formal-verif-tlc-toolchain.test.ts` | fixed descriptor、URL/origin/version/hash/cap、redirect/deadline、offline miss、receipt/profile/JDK drift |
| Unit | `tests/unit/t-formal-verif-tla-model.test.ts` | closed cardinality、unknown/+1 reject、7 invariant、validation precedence、blind input、deterministic module/cfg/source map |
| Unit | `tests/unit/t-formal-verif-tlc-output.test.ts` | exact/near-miss/duplicate/contradictory marker、chunk/LF/CRLF/UTF-8、trace、stats/depth/queue、verdict |
| Integration | `tests/integration/t-formal-verif-tlc-cache.integration.test.ts` | staging/lock/reservation/cache/quarantine、flush/rename/sync、collision、response loss、crash recovery |
| Integration | `tests/integration/t-formal-verif-tlc-runtime.integration.test.ts` | miniature JDK snapshot、manifest drift、argv/env、sandbox probe、timeout/terminate/kill、output cap |
| E2E | `tests/e2e/t-formal-verif-tla-toolchain.test.ts` | synthetic artifact/model/raw TLC lifecycleをacquire→verify→prepare→run→normalizeまでU4単独で通す |
| Support | `tests/formal-verif/support/tla-toolchain-harness.ts` | fake HTTPS/process/clock/filesystem failure、fixed 1.7.4 stream fixtures、miniature JDK |

各logical componentは原則10〜15のpositive / boundary / negative caseで覆う。integration / E2Eは外部networkやreal fixtureへ依存せず決定的に実行する。固定URLのreal artifact取得、SHA照合、real OpenJDK / TLCのlocal smokeは別の実測commandとして行うが、availability failureをtest skipや成功へ丸めない。U5より前にfixture reveal、U3 evidence publish、walking-skeleton完成は行わない。

## 実装Steps

- [x] **Step 1: 変更境界とruntime前提をfreezeする。** U1 public contract、U4 DAG、Java 26.0.1、TLC cache不在、macOS sandbox provider、test discovery、禁止領域diffを再確認し、U3 direct importと設定追加を0件にする。Trace: S-3/S-8、FR-3/FR-4、NFR-1/NFR-3、BR-21〜23。
- [x] **Step 2: toolchain/domainのRED testsを作る。** fixed descriptor drift、wrong scheme/origin/version/hash/cap、redirect回数、closed profileのunknown/+1 field、JDK / worker / heap / GC / locale driftを先に失敗させる。Trace: S-3/S-8、FR-3/FR-4、NFR-1/NFR-3、BR-01/05/07/13/19。
- [x] **Step 3: closed toolchain domainをGREENにする。** `tlc-toolchain.ts`へfixed descriptor、`TlcProfile`とartifact / JDK / profile identitiesを実装する。runtime-verifiable capability、acquisition / filesystem / network portは後続Step 8〜12で固定descriptor identityへ再照合してmintし、test用synthetic descriptorからproduction capabilityをmintしない。Trace: S-3/S-8、FR-3/FR-4、NFR-1/NFR-3、BR-01〜07/12/19。
- [x] **Step 4: finite modelのRED testsを作る。** voter / choice / submittedAt / receivedAt / accepted-ref / GoA、initial/amend/hold budget、error precedence、hold/winner、7 named invariants、fixture semantic leakage、同一入力determinismに加え、cutoff snapshot固定、original / amend共通late routing、fixed receipt不変の最小traceを固定する。Trace: S-3/S-4/S-6/S-8、FR-3/FR-4/FR-8、NFR-1、BR-07〜13。
- [x] **Step 5: finite TLA+ model / cfg generatorをGREENにする。** `tla-arm.ts`へclosed action union、canonical module/cfg bytes、profile / public contract identity、7 invariant source mapを持つ`FrozenModelBundle`を実装する。tally-derived集合はreceiptの`cutoffSeq`以下だけから導出し、post-tally inputはlate laneへ送る。fixture ID、D-COUNT、branch、期待verdictを入力shapeと生成物から排除する。Trace: S-3/S-4/S-6/S-8、FR-3/FR-4/FR-8、NFR-1、BR-07〜13。
- [x] **Step 6: TLC parser / normalizerのRED testsを作る。** 固定jar `-tool`の正常・反例・GC warning raw fixtureを保存し、v1.7.4のSTARTMSG / ENDMSG pairing、closed code / severity、code別payloadを先に固定する。exit 0＋`2193:0`の同一1行＋LF success＋`2199:0` stats＋`2194:0` depthと、exit 12＋`2110:1` named invariant＋`2121:1` trace header＋2件以上のordinal単調増加`2217:4` state＋stats / depth / finished / LF / EOF閉包をpositiveにする。複数の`2200:0`と、ordinalが単調増加する複数の`2217:4`もpositiveに固定する。unknown / unpaired / nested、singleton重複、許可条件外repeat、state ordinal重複・逆行、initial violation `2107`、`2110`＋1-state、最終state / stats / depth / finished各直後で切れたprefix、ENDMSG後LF欠損、`2401:3`または任意severity 3、plain `Warning:` / `Error:` / `State K:` fallback、success分割・片側欠損・marker挿入・LF欠損、contradictory terminal、truncated trace、invalid UTF-8/lone CR、1-byte/codepoint/line split、queue非0、stats/depth/completion欠損、overflow、exit 0 counterexample、exit 12 success、その他non-zero、signal、timeout、counterexample map driftをnegativeにする。Trace: S-3/S-8、FR-4/FR-7、NFR-1、BR-16〜20。
- [x] **Step 7: incremental parser / normalizerをGREENにする。** v1.7.4専用closed envelope state machineでSTART / END code、severity、code別payload、expected module / invariant identityを検証してordered traceとcomplete proofをparseする。exit 12＋named `2110:1` counterexample＋`2121:1`＋2件以上のordered `2217:4`＋`2199:0` stats＋`2194:0` depth＋`2186:0` finished＋LF / EOF完全閉包だけを`DETECTED`、exit 0＋exact `2193:0` completion＋`2199:0` stats＋`2194:0` depth＋queue 0＋`2186:0` finished＋LF / EOF＋`EXHAUSTED`だけを`NOT_DETECTED`へ写像する。unknown / unpaired / singleton重複 / 許可条件外repeat / severity 3、prefix truncation、outcome不一致を含むその他はtyped `HARNESS_ERROR`とする。同一raw bytesのcounterexample identityを安定化する。Trace: S-3/S-8、FR-4/FR-7、NFR-1、BR-16〜20。
- [x] **Step 8: acquisition/cache lifecycleのRED testsを作る。** body cap、connect/header/body deadline、redirect loop、short/partial body、checksum mismatch、same-path different bytes、single staging/quarantine、free-space reserve -1/exact/+1、live/unknown/malformed/dead owner、response loss、各flush/rename/sync crash境界を固定する。Trace: S-3/S-8、FR-4、NFR-1/NFR-3、BR-01〜06。
- [x] **Step 9: bounded acquisitionとdurable cacheをGREENにする。** `fs-tlc-toolchain.ts`へmanual redirect検証、≤1 MiB buffer、temporary stream/hash、verification reread、owner付きlock、physical reservation、exclusive atomic publish、parent sync、quarantine / recovery、毎runのoffline rehashを実装する。cache missやdriftからdownloadへfallbackしない。Trace: S-3/S-8、FR-4、NFR-1/NFR-3、BR-01〜06。
- [x] **Step 10: JDK/sandbox/processのRED testsを作る。** JAVA_HOME module/native/conf/symlink drift、snapshot seal差替え、PATH shadow、sandbox provider/probe不在、socket/DNS/loopback、proxy/credential、shell metacharacter、path escape、deadline -1/exact/+1、stdout/stderr cap、terminate/kill failureを固定する。Trace: S-3/S-8、FR-4、NFR-1/NFR-3、BR-04/05/14/15/19/20。
- [x] **Step 11: verified JDK snapshotとoffline process adapterをGREENにする。** full runtime manifestをcanonical path/length/hashへbindしてread-only snapshot化し、run前再hashする。`DarwinSandboxExecProvider`のdeny probe receipt、closed env、array argv、workers=1、`-XX:+UseParallelGC`、heap/locale/timezone、suite残時間と120秒の小さいdeadline、process-group terminate/kill、16 MiB stream capを実装する。provider不能時はspawnしない。Trace: S-3/S-8、FR-4、NFR-1/NFR-3、BR-04/05/14/15/19/20。
- [x] **Step 12: U4-owned execution façadeを実装する。** acquire / verifyOffline / prepare / run / normalizeを個別methodとして公開し、後続を自動chainしない。U1 `CellResult`へ正規化するがU3 storeへ書かず、U5 bridgeに必要なraw outcome / manifest / capabilityだけを返す。Trace: S-3/S-4/S-6/S-8、FR-3/FR-4/FR-8、NFR-1/NFR-3、BR-17〜23。
- [x] **Step 13: filesystem/runtime integrationをGREENにする。** temporary filesystemとminiature JDKでartifact publish / reverify、crash recovery、immutable snapshot、sandbox deny、timeout cleanup、raw stream保存を検証する。real TLC / external network / fixtureは使わない。Trace: S-3/S-8、FR-4、NFR-1/NFR-3、BR-01〜06/14〜20。
- [x] **Step 14: U4単独E2EをGREENにする。** synthetic transport / processを使い、fixed policy検証、model freeze、offline run、counterexampleとcomplete proofの両normalization、同一input replayを通す。fixture reveal、Evidence Store、eligibility、reportへ連鎖しない。Trace: S-3/S-4/S-6/S-8、FR-3/FR-4/FR-8、NFR-1/NFR-3、BR-01〜23。
- [x] **Step 15: export / cache /依存境界を確定する。** `index.ts`へ必要最小surfaceを追加し、`.gitignore`へ`/.cache/formal-verif/`だけを追加する。U2/U3/U5〜U8、network-from-run、fixture semantics、framework/setup/dist/package/lockfile/CI差分が0件であることをscanする。Trace: S-8、FR-3/FR-4、NFR-3、BR-04/11/13/21〜23。
- [x] **Step 16: fixed real toolchain probeを実測する。** 承認済み実装自身で公式1.7.4 artifactを固定URLから取得しSHA-256を照合する。OpenJDK 26.0.1＋ParallelGC、明示`-tool`、生成module/cfg、macOS network-denied providerで正常runとnamed invariant反例runを実行する。正常のexit 0＋`2193:0` exact success / `2199:0` stats / `2194:0` depth / `2186:0` / LF / EOFと、反例のexit 12＋`2110:1` / `2121:1` / 2件以上のordered `2217:4` / `2199:0` / `2194:0` / `2186:0` / LF / EOFをraw fixtureと照合する。各counterexample prefix cutを拒否し、ParallelGCを外した独立negativeで`2401:3`が`HARNESS_ERROR`になることも確認する。availability / sandbox / checksum / outcome不一致 / unknown・unpaired・singleton重複・許可条件外repeat / payload grammar failureは`HARNESS_ERROR`証跡として残して成功へ丸めない。fixtureやwalking-skeletonは実行しない。Trace: S-3/S-8、FR-4、NFR-1/NFR-3、BR-01〜06/14〜20。
- [x] **Step 17: Comprehensive verificationとsensorを実行する。** U4 focused、formal-verif全回帰、tier Unit/Integration/E2E、typecheck、lint、check、dist、禁止領域diffを実行し、変更TSへlinter / type-check sensorを全数発火する。Trace: 全scenario / requirement / rule。
- [x] **Step 18: code-summaryを実測で作る。** file、physical LOC、test / assertion、real probe、sensor fire ID、plan deviation、既存dirtyのUnit帰属、U5 bridge前提を記録し、独立architecture reviewへ渡す。Trace: S-8、FR-3/FR-4/FR-7/FR-8、NFR-1/NFR-3。

## LOC再評価とhard stop

Units Generationの300〜480 LOCはsource + test + config見積りだった。その後のNFR Designは、acquisition lifecycle、full JDK snapshot、OS sandbox、finite model generator、incremental parserの10 logical componentsとcrash / corruption反証を具体化した。既存U3のfilesystem / execution codeはprivateかつ異なるsuccessor lifecycleで、直接reuseやgeneric refactorは他Unit越境になる。

責務を欠落させない物理LOC forecastは次のとおりである。

| 区分 | Forecast |
| --- | ---: |
| production (`scripts/formal-verif/`) | 1,150〜1,480 LOC |
| tests / support | 850〜1,150 LOC |
| config (`.gitignore`) | 1 LOC |
| 合計 | 2,001〜2,631 LOC |

当初はUnit境界・責務・依存方向を変えず、production上限1,500 LOCへ再承認する案を採用した。その後、既存実装1,518 LOCとA〜Fの全findingを同時に閉じる独立forecastをe2が照合し、人間が2026-07-21にchoice1 / GoA1で同一U4のhard capを3,200 LOCへ変更した。現在の完了条件は、cache、parser、model、accepted-only / cutoff、Steps 10〜12、JDK snapshot、Darwin sandbox、process lifecycle、normalizer、real TLC probeを省略せず、production 3 fileの物理LOC合計を3,200以下へfreezeすることである。3,200 LOC到達、U3/U5 bridge変更の必要化、macOS providerで強制不能、real TLC grammarと設計markerの不一致が判明した場合はfindingを隠さずhard stopし、6項目証跡と推奨案をleaderへ付議する。

## 検証commands

```sh
bun test tests/unit/t-formal-verif-tlc-toolchain.test.ts tests/unit/t-formal-verif-tla-model.test.ts tests/unit/t-formal-verif-tlc-output.test.ts
bun test tests/integration/t-formal-verif-tlc-cache.integration.test.ts tests/integration/t-formal-verif-tlc-runtime.integration.test.ts
bun test tests/e2e/t-formal-verif-tla-toolchain.test.ts
bun test tests/unit/t-formal-verif-*.test.ts tests/integration/t-formal-verif-*.test.ts tests/e2e/t-formal-verif-*.test.ts
bun tests/run-tests.ts --unit --filter 't-formal-verif-'
bun tests/run-tests.ts --integration --filter 't-formal-verif-'
bun tests/run-tests.ts --e2e --filter 't-formal-verif-'
bun run typecheck
bun run lint:check
bun run check
bun run dist:check
git diff --exit-code -- packages/framework packages/setup dist package.json bun.lock .github
```

禁止依存scanはU4 production対象について、U2 Registry、U3 Evidence Store、U5〜U8、TS oracle、fixture / D-COUNT / injection、eligibility / Pareto / report、run-pathのfetch / proxy / credentialを検査し、0件時の`rg` exit 1を成功として扱う。
