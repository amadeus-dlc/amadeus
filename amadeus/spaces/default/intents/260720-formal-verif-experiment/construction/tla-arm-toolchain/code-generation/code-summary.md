# Code Summary — tla-arm-toolchain

## 実装結果

U4 `tla-arm-toolchain`の18 Stepsを完了した。closed finite profileからのTLA+ module / cfg生成、TLC tools 1.7.4 artifactの固定取得とdurable cache、OpenJDK 26.0.1 snapshot、Darwin sandbox下のoffline実行、TLC 1.7.4専用stream parser、U1 `CellResult`への正規化をU4-owned surfaceとして実装した。U3 Evidence Storeへ直接接続せず、U5がraw outcome / manifest / capabilityをbridgeできる境界に留めている。

recorded人間裁定により、hard capは`tlc-toolchain.ts`、`tla-arm.ts`、`fs-tlc-toolchain.ts`のproduction 3 file限定で3,200物理LOCである。最終実測は3,143 / 3,200 LOCで、57 LOCの余裕を維持した。barrel `index.ts`は別途67 LOCである。

| 区分 | ファイル | LOC | 内容 |
| --- | --- | ---: | --- |
| model/parser | `scripts/formal-verif/tla-arm.ts` | 1,288 | closed action/profile、finite TLA+ model/cfg/source map、TLC 1.7.4 parser、normalizer |
| domain | `scripts/formal-verif/tlc-toolchain.ts` | 479 | fixed artifact descriptor、capability/receipt、JDK/profile/run manifest、closed error union |
| adapter | `scripts/formal-verif/fs-tlc-toolchain.ts` | 1,376 | bounded HTTPS、durable cache、JDK snapshot、Darwin sandbox、process lifecycle |
| export | `scripts/formal-verif/index.ts` | 67 | U4の必要最小public surface |
| unit | `tests/unit/t-formal-verif-{tla-model,tlc-output,tlc-toolchain,tlc-public-surface}.test.ts` | 1,509 | model/parser/domain/exportのpositive・boundary・negative |
| integration | `tests/integration/t-formal-verif-tlc-{cache,runtime}.integration.test.ts` | 1,242 | cache crash/corruption、JDK/sandbox/process lifecycle |
| E2E | `tests/e2e/t-formal-verif-tla-toolchain.test.ts` | 113 | U4単独acquire→verify→prepare→run→normalize |
| support | `tests/formal-verif/support/tla-{toolchain-harness,mutation-probe,real-toolchain-probe}.ts` | 656 | deterministic harness、mutation、実toolchain probe |
| config | `.gitignore` | 1行追加 | `/.cache/formal-verif/`だけをignore |

## 主要な実装判断

- artifact、JDK、model、sandbox、runをcanonical identityとverified capabilityへ結合し、callerが組み立てた同形object、再hash、moving pathをfail-closedで拒否する。
- `TallyReceipt`の`cutoffSeq`以下だけからtally-derived集合を生成し、tally後のoriginal / amendはreceivedAtによらずlate laneへ送る。fixed receiptはpost-tally inputで変化しない。
- TLC stdoutは1.7.4のclosed envelope grammarだけを受理する。START/END不一致、unknown code/severity、payload drift、prefix、terminal矛盾、非0/signal/timeoutは`HARNESS_ERROR`へ閉じる。
- 標準moduleは、runごとに作るprivateで空の`.tlc-stdlib` canonical directoryへJVMの`java.io.tmpdir`を固定し、`Naturals.tla`、`Sequences.tla`、`FiniteSets.tla`、`TLC.tla`のexact originだけを受理する。workspace shadowとbasename-only forged pathはspawn前またはparse時に拒否する。
- Darwin sandboxはdefault denyを維持し、TLCのlocal Java RMI bindに必要なlocalhost inboundだけを許可する。active-listener TCP、UDP、DNSを含むoutbound probeはすべて拒否し、provider/probe不成立時にunsandboxed fallbackしない。
- OpenJDK snapshot、artifact cache、reservation/lock/staging/quarantine、flush/rename/sync、process group timeout/terminate/kill、16 MiB stream capをdurableかつ再検証可能なlifecycleとして実装した。

## Test Coverage

- U4 focused 7 files: **103 pass / 0 fail / 643 expects**
- 全formal-verif regression 33 files: **497 pass / 0 fail / 1,396 expects**
- tier runner: Unit **20 files / 321 assertions**、Integration **9 files / 139 assertions**、E2E **4 files / 37 assertions**、すべてPASS
- `bun run typecheck`: PASS
- `bun run lint:check`: PASS（advisory warningのみ）
- `bun run check`: PASS（advisory warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- `git diff --exit-code -- packages/framework packages/setup dist package.json bun.lock .github`: PASS

主な固定反証は、closed cardinality/field drift、unknown choice、invalid submittedAt、amend budget、resolution、cutoff snapshot、TLC envelope/payload/statistics/traceのnear miss、stdlib origin偽装、artifact/JDK/profile/run identity drift、redirect/deadline/body cap、lock/reservation/crash window、sandbox outbound、PATH/env/argv drift、timeout/signal/output capである。

## 実TLC freeze

### 正常run

- 実行: TLC tools 1.7.4、OpenJDK 26.0.1、`-XX:+UseParallelGC`、workers 1、明示`-tool`、Darwin sandbox
- evidence root: `/var/folders/3s/p2xl_vd524b4lk78cb6fz5nh0000gn/T/amadeus-u4-real-facade-t4EUw4`
- artifact descriptor identity: `d716a11edb04e301d7cdc91c31843bca76e5031f4fe92b2080d38c5d19a3b313`
- artifact SHA-256: `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`
- artifact receipt: `4e3c1b0ba10efd7ed7ad396979e99c575b03803c101b440793ee20c8714a8482`
- model identity: `dee3d8a63552f041abb0bb8f64d458dd6b230cf6c91cc609ba6c7a9b71970d66`
- run identity: `67f514b8a6cd26a84cca35be513b06dda7e18fed7b12670ea1c60e223efe2082`
- JDK snapshot identity: `f97b30e9cc100a792a318ea2fdcdb523ecd3c5787f577787646dab7d1d816d59`
- sandbox receipt identity: `d40c3b79bfa786e4f15d57c51067b7ffc0abc9a60f45da8c1b5c2658f46783a3`
- process: exit 0、signal null、timeout false、output-limit false、stderr empty
- stdout SHA-256: `1d029c31928b165422955d44d75592e25cd31cadb32887548eae58ef8b2cc84e`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- verdict: `NOT_DETECTED`
- UTC: `2026-07-21T15:36:49.213Z`〜`2026-07-21T15:38:36.996Z`

SANYが観測したmodule originは、workspaceの`FormalElection.tla`と、同workspaceのprivate `.tlc-stdlib`配下にある`Naturals.tla`、`Sequences.tla`、`FiniteSets.tla`、`TLC.tla`のexact pathだけである。

### named invariant反例run

- evidence root: `/var/folders/3s/p2xl_vd524b4lk78cb6fz5nh0000gn/T/amadeus-u4-real-counterexample-mvFKPp`
- process: exit 12、signal null、stderr empty
- stdout SHA-256: `8713fb27a60b583ac2fe4b067b4ae7a33c0633698a52240db6655a1cc2fa4e5c`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- parser result: `COUNTEREXAMPLE`
- invariant: `AmendSubmission`、source line 287 / column 1
- trace: 2 states、generated 2、distinct 2、queue 0、depth 2
- counterexample identity: `c8b1d7d47ef2114769c9f4806c6796f256917ea0c710e1c0a39d6898bee5f755`

ParallelGCを外した独立実runではTLC 1.7.4の`2401:3` warningを観測し、production parserがseverity 3を`HARNESS_ERROR`として拒否した。このrunは正常runのargvから`-XX:+UseParallelGC`だけを除いて同じfixed JDK/artifact/sandbox/modelを使った。evidence rootは`/var/folders/3s/p2xl_vd524b4lk78cb6fz5nh0000gn/T/amadeus-u4-no-parallel-gc-WDe3aG`、stdout SHA-256は`aceef2d9a2ff94cf5d804ac6355caaf6ba5d524fd7d61dcb98fe8f68125ee7dd`、stderr SHA-256は空bytesの`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`、終了UTCは`2026-07-21T15:55:34.675Z`である。unknown-choice、invalid timestamp、amend budget、resolutionの4 mutationもreal TLCで各安全性obligationを破り、反例として観測した。

### real mutation対応表

各moduleは`bun tests/formal-verif/support/tla-mutation-probe.ts <mutation> <evidence-root>`で生成し、上記と同じ固定JDK/artifact/sandbox profileを使う`tlc2.TLC -workers 1 -tool -config FormalElection.cfg FormalElection.tla`で実行した。4件ともexit 12、signal null、stderr空である。初期状態違反3件はclosed production parserが意図どおり`HARNESS_ERROR`として拒否し、behavior violationの`AmendSubmission`だけを完全なnamed counterexample grammarとして受理する。

| mutation | violated invariant / shape | module SHA-256 | raw stdout path / SHA-256 | UTC |
| --- | --- | --- | --- | --- |
| `unknown-choice` | `UnknownChoiceRejected` / initial-state violation | `813756b1898eb0351e3645944dc9e7dda30a65d494134c8ace602f4fedc9663d` | `/tmp/amadeus-u4-mut-unknown-choice.UzfRrv/tlc-stdout.bin` / `dbc3139f558f5f3e5068407f811f7e0af937b08a6bfd445c3754f6f7b852806a` | `2026-07-21T15:07:05.415Z` |
| `invalid-timestamp` | `InvalidTimestampRejected` / initial-state violation | `b7a22d0e8fe69fd803c26a98668463567b011cc468b0fff98cf516436278dbb6` | `/tmp/amadeus-u4-mut-invalid-timestamp.gpqQKE/tlc-stdout.bin` / `212f268d565ec1cf407cf55bfee3e2d61e8d5a939c82ac3a38fa1ceee901c8e8` | `2026-07-21T15:07:16.505Z` |
| `amend-budget` | `AmendSubmission` / 2-state behavior violation | `d57ea7b3a0b515ae754332de85367f673f03f61a49bc31b04faf0b2b59eba13d` | `/tmp/amadeus-u4-mut-amend-budget.dRNn9c/tlc-stdout.bin` / `316246a389bc527f301951f493de7d9ea1582ff43585796cdff8828e70d4341d` | `2026-07-21T15:07:26.184Z` |
| `resolution` | `PerVoterResolution` / initial-state violation | `e8aee53a03299e8382697fecc895e17c9835f4ceb5a018febc38b6acb375b7d7` | `/tmp/amadeus-u4-mut-resolution.FeEQFV/tlc-stdout.bin` / `042f527d0dafd4c33fd7d8373f46eb059b28d3c918805639852cc81490ed2839` | `2026-07-21T15:07:34.874Z` |

4件のstderr SHA-256はいずれも`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`である。上記exitは最終freeze後に同じ固定profileで再実行し、4件とも12であることも再確認した。

## 最終output hash・Sensor証跡

2026-07-21T15:45Z時点のoutput SHA-256と、各変更TSへ最終発火したlinter/type-check sensor IDを正本とする。14 TS × 2 = 28件すべてPASSした。

| 出力 | SHA-256 | linter | type-check |
| --- | --- | --- | --- |
| `tla-arm.ts` | `12745b662ac8d79b2c6ea81574fb04b2c85ce20366c8e1f3c2cba7a965c84fc7` | `adaab54f` | `5faac420` |
| `tlc-toolchain.ts` | `fa6bd7284c9b313606531b511135ddc8d93900c9856c8e90a5f66b5facd2bad6` | `5fdf37b1` | `6940912f` |
| `fs-tlc-toolchain.ts` | `c5f6e2d98fa8cb470990f9d6652bfd1564d2a5f928485ae20dd7129d53eb6b60` | `2acb369d` | `1159fe51` |
| `index.ts` | `592f46cd9637017fb31648de2d472778a9cb0f91cddbc7327df25c7c194025c0` | `4af974da` | `19b4c2bf` |
| `t-formal-verif-tla-model.test.ts` | `3eb6a075aa001f9ca2548b79cd71c6ff44a9aee069cf07e7dabb9e61357f65e7` | `e2a1ec6b` | `f3843270` |
| `t-formal-verif-tlc-output.test.ts` | `5ca32ce1b3073d7375d89f5047f99a7c20f8374fbe39789676c83c08f829add6` | `46864c4d` | `efe9e7ec` |
| `t-formal-verif-tlc-toolchain.test.ts` | `19d91f88022d1e1db0ded77ff2ba5d83f7c59688e033401a684615cf9e61036d` | `18515dfb` | `2bc528be` |
| `t-formal-verif-tlc-public-surface.test.ts` | `7a38396fd59c83d3075a7e050ea3bef491e22c41619fc9c6954125baeda8d482` | `5b8c9e70` | `7ff64986` |
| `t-formal-verif-tlc-cache.integration.test.ts` | `c9e6d0250d51afdb87c5c36831144b0d4829a932406f9c30d67726e5dafdba14` | `6c5ace2f` | `1d5b7399` |
| `t-formal-verif-tlc-runtime.integration.test.ts` | `8c801ae93187c9585bc6a685d55e700e11de54f4fe97f0c512ae87e184d0e43e` | `13200c40` | `de02ec25` |
| `t-formal-verif-tla-toolchain.test.ts` | `a7cf2bca47497acd409ee4e25ef12fd581ca68f7757c494448d8711e7c15949b` | `486c4223` | `ec9892fa` |
| `tla-toolchain-harness.ts` | `81936ec6bb94dc59ae5d4d6abdf682b73d98a58683b4249dca16917428ef99c4` | `9c917454` | `09a1b453` |
| `tla-mutation-probe.ts` | `cb730dc5e0a522c77df883c8dea29b187038cccfc4b6a49ccadd493a5848067f` | `d2121f28` | `c57f3416` |
| `tla-real-toolchain-probe.ts` | `2b211bf3ca1d9562cf0602d788d15f3217f13f87fa765099cf15cc789df36aca` | `37fb7a61` | `5704fc46` |

`answer-evidence`はcode-generationで新規・変更した`*-questions.md`がないため非該当である。

## 境界確認と計画差分

- Units Generation時のproduction forecastを超えたため、e2の独立forecastとrecorded人間裁定を経て、責務・DAG・Unit境界を変えずに3-file hard capを3,200 LOCへ変更した。最終値は3,143 LOCである。
- Functional Designのpost-tally記述とfixed receiptが同時充足不能だったため、production election storeの一次証拠とleader契約に従い、accepted prefixのcutoff snapshotと共通late laneへ機械是正した。既存裁定履歴は遡及変更していない。
- e2の独立pre-reviewで、basename一致だけの標準module originを受理する反例が成立した。expected private stdlib directoryとのexact canonical path binding、空/private directory、workspace shadow拒否へ是正し、3種類のforged pathとshadowを固定回帰にした。
- Darwin sandboxはJava RMIのlocal bindに必要なlocalhost inboundだけを許可する。これはnetwork-denied責務を弱める一般例外ではなく、active-listener TCP、UDP、DNSのoutbound denialを実測したprovider限定条件である。
- Step 16のreal mutation / real toolchain証跡のためsupportを2ファイル追加した。production責務やpublic surfaceは増やしていない。
- U2 Registry、U3 Evidence Store、U5〜U8、TS oracle、fixture payload/reveal、D-COUNT/injection、eligibility/Pareto/reportへの禁止依存は0件である。`CellResult`正規化に必要なU1 `fixtureId` / baseline / arm bindingだけを保持する。framework/setup/dist/package/lockfile/CI差分も0件である。
- `tsconfig.json`、state/audit、U1〜U3の既存dirtyはU4着手前またはorchestrator/sensor由来であり、U4実装では手編集していない。global `git diff --check`は既存audit shardのtrailing whitespaceで非0だが、U4 output由来のwhitespace findingはない。
- 実装・検証上の未解決blockerはない。commit、push、PR、mergeは実施していない。

## pre-review / spot-check finding closure

| 反例 | closure | 固定回帰 |
| --- | --- | --- |
| basename一致だけでattacker側の標準module pathを受理 | private `.tlc-stdlib`のexact canonical originへbindし、prepare/run/normalizeで空・0700・canonicalを再検証。workspace shadowもspawn前拒否 | forged absolute、relative、jar-style pathとworkspace shadowをreject |
| callerがinvariant formula/source mapを差し替えたreceipt | persistable receiptをclosed field set、model/profile/module/cfg identity、7 formula、source locationまで再生成・再照合 | forged invariantを持つcaller-supplied receiptのcounterexampleをreject |
| malformed progress、generated < distinct、terminal後marker | code別payload grammarとsingleton/order/EOFを検証し、impossible statisticsとFinished後のsemantic/progressを拒否 | malformed progress、impossible statistics、post-Finished progress/state/successをreject |
| invariantが状態述語だけでaction誤動作を捉えない | `UnknownChoiceAction`、`InvalidTimestampAction`、`BadAmendStep`、`BadResolutionStep`を独立定義し、各invariantを`ENABLED`/`~ENABLED`のaction obligationへ結合 | 4 action obligationのsource固定と上記4 real mutation |
| 非terminal状態でもstutterして探索完了し得る | `TerminalStutter == Terminal /\ UNCHANGED vars`とし、`Terminal`をtally済み・submission枯渇・hold処理済みへ限定。`Next`に無条件stutterを置かない | `SpendableSubmission`、`Terminal`、`TerminalStutter`とclosed `Next`のsource固定 |

spot-check時点の旧・追加findingはすべてclosure済みであり、独立reviewへ渡す未解決実装findingは0件である。

## 独立reviewへの引継ぎ

e2のpre-review C1是正後にproduction・test・supportの全hashを再固定し、focused / formal / tier / typecheck / lint / check / dist / boundary / sensorを再実行した。独立reviewerには、承認済みplan、U4全差分、C1反例とclosure、4 mutation、正常・反例の実TLC raw evidence、上記検証・sensor証跡を渡す。最終review結果が出るまではU4を自己閉包せず、次Unit・次stageへ進まない。
