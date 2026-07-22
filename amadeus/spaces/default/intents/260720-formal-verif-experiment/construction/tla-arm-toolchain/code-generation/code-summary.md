# Code Summary — tla-arm-toolchain

## 実装結果

U4 `tla-arm-toolchain`の18 Stepsを完了した。closed finite profileからのTLA+ module / cfg生成、TLC tools 1.7.4 artifactの固定取得とdurable cache、OpenJDK 26.0.1 snapshot、Darwin sandbox下のoffline実行、TLC 1.7.4専用stream parser、U1 `CellResult`への正規化をU4-owned surfaceとして実装した。U3 Evidence Storeへ直接接続せず、U5がraw outcome / manifest / capabilityをbridgeできる境界に留めている。

recorded人間裁定により、hard capは`tlc-toolchain.ts`、`tla-arm.ts`、`fs-tlc-toolchain.ts`のproduction 3 file限定で3,200物理LOCである。Formal Review Iteration 2 finding closure後の最終実測は3,200 / 3,200 LOCである。barrel `index.ts`は別途64 LOCである。

| 区分 | ファイル | LOC | 内容 |
| --- | --- | ---: | --- |
| model | `scripts/formal-verif/tla-arm.ts` | 874 | closed action/profile、finite TLA+ model/cfg/source map、fixed receipt |
| protocol/domain | `scripts/formal-verif/tlc-toolchain.ts` | 870 | fixed artifact descriptor、capability/receipt、JDK/profile/run manifest、TLC 1.7.4 parser、closed error union |
| adapter/composition | `scripts/formal-verif/fs-tlc-toolchain.ts` | 1,456 | internal artifact lifecycle、internal JDK/sandbox/process runtime、issued outcomeのprivate正規化、public composition facade |
| export | `scripts/formal-verif/index.ts` | 64 | U4の必要最小public surface |
| unit | `tests/unit/t-formal-verif-{tla-model,tlc-output,tlc-toolchain,tlc-public-surface}.test.ts` | 1,462 | model/parser/domain/exportのpositive・boundary・negative |
| integration | `tests/integration/t-formal-verif-tlc-{cache,runtime}.integration.test.ts` | 1,368 | cache crash/corruption、JDK/sandbox/process lifecycle、JDK設定fail-closed、capability・direct module境界 |
| E2E | `tests/e2e/t-formal-verif-tla-toolchain.test.ts` | 113 | U4単独acquire→verify→prepare→run→normalize |
| support | `tests/formal-verif/support/tla-{toolchain-harness,mutation-probe,real-toolchain-probe}.ts` | 666 | deterministic harness、mutation、実toolchain probe |
| config | `.gitignore` | 1行追加 | `/.cache/formal-verif/`だけをignore |

## 主要な実装判断

- artifact、JDK、model、sandbox、runをcanonical identityとverified capabilityへ結合し、callerが組み立てた同形object、再hash、moving pathをfail-closedで拒否する。
- `TallyReceipt`の`cutoffSeq`以下だけからtally-derived集合を生成し、tally後のoriginal / amendはreceivedAtによらずlate laneへ送る。fixed receiptはpost-tally inputで変化しない。
- TLC stdoutは1.7.4のclosed envelope grammarだけを受理する。START/END不一致、unknown code/severity、payload drift、prefix、terminal矛盾、非0/signal/timeoutは`HARNESS_ERROR`へ閉じる。
- 標準moduleは、runごとに作るprivateで空の`.tlc-stdlib` canonical directoryへJVMの`java.io.tmpdir`を固定し、`Naturals.tla`、`Sequences.tla`、`FiniteSets.tla`、`TLC.tla`のexact originだけを受理する。workspace shadowとbasename-only forged pathはspawn前またはparse時に拒否する。
- Darwin sandboxはdefault denyを維持し、TLCのlocal Java RMI bindに必要なlocalhost inboundだけを許可する。active-listener TCP、UDP、DNSを含むoutbound probeはすべて拒否し、provider/probe不成立時にunsandboxed fallbackしない。
- OpenJDK snapshot、artifact cache、reservation/lock/staging/quarantine、flush/rename/sync、process group timeout/terminate/kill、16 MiB stream capをdurableかつ再検証可能なlifecycleとして実装した。
- outcome→`CellResult`変換は`fs-tlc-toolchain.ts`のmodule-private `normalizeIssuedExploration`に置き、同一instanceが発行した`PreparedTlcRun` / `RawTlcOutcome`の結合を検証した後だけ呼ぶ。root barrelとdirect moduleの双方から変換器をimportできず、caller-crafted COMPLETE/exit 0では`NOT_DETECTED`を生成できない。
- `FsTlcArtifactCache`と`FsTlcRuntime`をinternal componentへ分け、exported `FsTlcToolchain`を5 methodのcomposition facadeへ限定した。TLC grammarの所有権はprotocol/domain fileへ移し、finite election modelからprocess output責務を除いた。
- 実TLC probeは`JAVA_HOME`を必須とし、canonical化したOpenJDK 26.0.1 rootだけを受理する。開発者固有pathへのfallbackは持たない。
- lizard complexity gateのU4 production対象は全function CCN 15以下である。parser測定境界、lifecycle payload/order、run manifest identity validation、action validation、receipt validation、JDK inspection/snapshot reuseを意味単位に分割した。

## Test Coverage

- U4 focused 7 files: **104 pass / 0 fail / 649 expects**
- 全formal-verif regression 33 files: **498 pass / 0 fail / 1,402 expects**
- tier runner: Unit **20 files / 319 assertions**、Integration **9 files / 142 assertions**、E2E **4 files / 37 assertions**、すべてPASS
- `bun run typecheck`: PASS
- `bun run lint:check`: PASS（advisory warningのみ）
- `bun run check`: PASS（advisory warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- `bun run promote:self:check`: PASS
- `git diff --exit-code -- packages/framework packages/setup dist package.json bun.lock .github`: PASS
- `git diff --check`: PASS
- full coverage runner: **420 files / 5,987 assertions**を実行し、failureはU4外の既知3件（U1〜U3 complexity 20 functions、U1〜U3 test-size 5 files、upstream-sync/codekb generated-prefix 9 files）のみ
- project coverage gate: **74.5548%**、baseline 40.9395%、delta **+33.6153pp**、PASS
- checkpoint以降のworking diff coverage: measurable added **362 / 362 covered**、allowlisted 0、uncovered 0、PASS
- U4 production complexity: lizard CCN > 15は**0件**。repository全体gateに残る20件はU1〜U3の既存範囲で、U4では変更しない。

主な固定反証は、closed cardinality/field drift、unknown choice、invalid submittedAt、amend budget、resolution、cutoff snapshot、TLC envelope/payload/statistics/traceのnear miss、stdlib origin偽装、artifact/JDK/profile/run identity drift、redirect/deadline/body cap、lock/reservation/crash window、sandbox outbound、PATH/env/argv drift、timeout/signal/output capである。

## 実TLC freeze

### 正常run

- 実行: TLC tools 1.7.4、OpenJDK 26.0.1、`-XX:+UseParallelGC`、workers 1、明示`-tool`、Darwin sandbox
- evidence root: `/var/folders/3s/p2xl_vd524b4lk78cb6fz5nh0000gn/T/amadeus-u4-real-facade-L8w4g8`
- artifact descriptor identity: `d716a11edb04e301d7cdc91c31843bca76e5031f4fe92b2080d38c5d19a3b313`
- artifact SHA-256: `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`
- artifact bytes: `2,274,532`
- artifact receipt: `31b0e83d3773cde5e5cf86f0032dc76b73eb91bb11eed7cc9acf16663c61d50c`
- model identity: `dee3d8a63552f041abb0bb8f64d458dd6b230cf6c91cc609ba6c7a9b71970d66`
- run identity: `b6faeab34e57af1e25114979d2e91d05f7db4384a44de33bc61fe281ba111198`
- JDK snapshot identity: `330988580f759bdfbdd569ad46b8599fe26c24056c413217339858bd838e956b`
- sandbox receipt identity: `20f74d0bc28e1d0c7eecc18bbc3936989971e819c0d876510e19bb28f5f30ac1`
- process: exit 0、signal null、timeout false、output-limit false、stderr empty
- stdout SHA-256: `1f7cfa5aaa0c17c542967048fc7807d4677e2978e14af04d138817aa38161431`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- verdict: `NOT_DETECTED`
- UTC: `2026-07-21T21:53:50.322Z`〜`2026-07-21T21:55:38.905Z`

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

Formal Review Iteration 2 finding closure後のoutput SHA-256を正本とする。変更した7 TSへ2026-07-21T21:51Zにlinter/type-checkを再発火し、hard-cap最終調整後の`fs-tlc-toolchain.ts`だけ22:02Zに再発火した。下表の最新14 pairはすべてPASS、FAILED / BUDGET_OVERRIDE / orphanは0件だった。

| 出力 | SHA-256 | linter | type-check |
| --- | --- | --- | --- |
| `tla-arm.ts` | `86bfd0aa01695e32408076114faa3d5fb105beadc11a949e811821d45f6a9639` | `b4c8254e` | `2f764fd6` |
| `tlc-toolchain.ts` | `0d2484f370c8630689cbcaf411cdd65174deefb44107a425d4917c889818082e` | `baea4322` | `5ab885c9` |
| `fs-tlc-toolchain.ts` | `f7cc25cc3eaa48f59b022af64d3320135b995e1cba754f99dd70447e193de7ab` | `a3e29fa7` | `e5cfd376` |
| `index.ts` | `d34ee28c38d64fcc443444b52fe2c5f523505901154079e6be6c01cbcee22ea4` | `395278e6` | `993cf0f4` |
| `t-formal-verif-tla-model.test.ts` | `3eb6a075aa001f9ca2548b79cd71c6ff44a9aee069cf07e7dabb9e61357f65e7` | `fd51353e` | `f4f44425` |
| `t-formal-verif-tlc-output.test.ts` | `65bac9eb91b430039976a69663adecaa0ce8905e27f7cf6516413204c46d2734` | `937cbdc1` | `3ee0728a` |
| `t-formal-verif-tlc-toolchain.test.ts` | `a05b1a796d503232cc21b35846523593311c0002b40d2d451bdeee408ae92c79` | `98b51cd7` | `5948b8b4` |
| `t-formal-verif-tlc-public-surface.test.ts` | `e8151bfc0fa47a1b3f330f1aaeb0b004d987c81fd333505c2c6468d86561692d` | `f6c1574f` | `94b1c37f` |
| `t-formal-verif-tlc-cache.integration.test.ts` | `62a1adcdcb03ef1353f329bc61f6f1b9b9328aa55e790c69bad8f12cf07e29ce` | `93a9dbe4` | `2a37cdce` |
| `t-formal-verif-tlc-runtime.integration.test.ts` | `b9e48e8f4d6dba105c9b3fe8336ec4c73b459126c4ed03380ff26e52cf4bb45f` | `75809d34` | `3daaaa17` |
| `t-formal-verif-tla-toolchain.test.ts` | `a7cf2bca47497acd409ee4e25ef12fd581ca68f7757c494448d8711e7c15949b` | `ce130c33` | `1849391b` |
| `tla-toolchain-harness.ts` | `7d7a5187d7a3b9b04af60bdb7665a204ce44bd7ca2df2110354e0fbf18e194dd` | `4be11f31` | `db49773e` |
| `tla-mutation-probe.ts` | `cb730dc5e0a522c77df883c8dea29b187038cccfc4b6a49ccadd493a5848067f` | `437839d7` | `e07130a9` |
| `tla-real-toolchain-probe.ts` | `118ef8cbfe7cad9bf78d78219f3d2368f769b1f8b72849a41eaa07aa8373bed3` | `0a55232e` | `6f12860e` |

`answer-evidence`はcode-generationで新規・変更した`*-questions.md`がないため非該当である。

## 境界確認と計画差分

- Units Generation時のproduction forecastを超えたため、e2の独立forecastとrecorded人間裁定を経て、責務・DAG・Unit境界を変えずに3-file hard capを3,200 LOCへ変更した。Formal Review Iteration 2 finding closure後の最終値は3,200 LOCである。
- Functional Designのpost-tally記述とfixed receiptが同時充足不能だったため、production election storeの一次証拠とleader契約に従い、accepted prefixのcutoff snapshotと共通late laneへ機械是正した。既存裁定履歴は遡及変更していない。
- e2の独立pre-reviewで、basename一致だけの標準module originを受理する反例が成立した。expected private stdlib directoryとのexact canonical path binding、空/private directory、workspace shadow拒否へ是正し、3種類のforged pathとshadowを固定回帰にした。
- Darwin sandboxはJava RMIのlocal bindに必要なlocalhost inboundだけを許可する。これはnetwork-denied責務を弱める一般例外ではなく、active-listener TCP、UDP、DNSのoutbound denialを実測したprovider限定条件である。
- Step 16のreal mutation / real toolchain証跡のためsupportを2ファイル追加した。production責務やpublic surfaceは増やしていない。
- U2 Registry、U3 Evidence Store、U5〜U8、TS oracle、fixture payload/reveal、D-COUNT/injection、eligibility/Pareto/reportへの禁止依存は0件である。`CellResult`正規化に必要なU1 `fixtureId` / baseline / arm bindingだけを保持する。framework/setup/dist/package/lockfile/CI差分も0件である。
- checkpoint `fb7165c10b2b10ab9ced9338243434b96dfeb7ef`から専用worktreeを作り、既存e6 worktreeと未追跡scratchには触れていない。新worktreeのstate/audit差分はorchestrator/sensor由来である。
- global `git diff --check`はPASSした。
- commit、push、PR、mergeは未実施である。実装上の未解決blockerはなく、全coverageのU4外baseline failureだけをissue候補として分離記録する。

## pre-review / Formal Review finding closure

| 反例 | closure | 固定回帰 |
| --- | --- | --- |
| basename一致だけでattacker側の標準module pathを受理 | private `.tlc-stdlib`のexact canonical originへbindし、prepare/run/normalizeで空・0700・canonicalを再検証。workspace shadowもspawn前拒否 | forged absolute、relative、jar-style pathとworkspace shadowをreject |
| callerがinvariant formula/source mapを差し替えたreceipt | persistable receiptをclosed field set、model/profile/module/cfg identity、7 formula、source locationまで再生成・再照合 | forged invariantを持つcaller-supplied receiptのcounterexampleをreject |
| malformed progress、generated < distinct、terminal後marker | code別payload grammarとsingleton/order/EOFを検証し、impossible statisticsとFinished後のsemantic/progressを拒否 | malformed progress、impossible statistics、post-Finished progress/state/successをreject |
| invariantが状態述語だけでaction誤動作を捉えない | `UnknownChoiceAction`、`InvalidTimestampAction`、`BadAmendStep`、`BadResolutionStep`を独立定義し、各invariantを`ENABLED`/`~ENABLED`のaction obligationへ結合 | 4 action obligationのsource固定と上記4 real mutation |
| 非terminal状態でもstutterして探索完了し得る | `TerminalStutter == Terminal /\ UNCHANGED vars`とし、`Terminal`をtally済み・submission枯渇・hold処理済みへ限定。`Next`に無条件stutterを置かない | `SpendableSubmission`、`Terminal`、`TerminalStutter`とclosed `Next`のsource固定 |
| Formal Review I1: root exportされたnormalizerでissued capability検証を迂回可能 | root barrelから変換器を除外し、`FsTlcToolchain.normalize`をpublic正規化入口に限定 | root public surfaceで変換器不在を固定 |
| Formal Review I1: model/parserとartifact/runtime/facadeの責務集約 | TLC parser/normalizerを`tlc-toolchain.ts`へ移し、`FsTlcArtifactCache`・`FsTlcRuntime`をinternal component、`FsTlcToolchain`をcomposition facadeへ分離 | parser ownershipとexported constructor名をpublic surface/unit testで固定、全function CCN 15以下、production 3 file 3,200 / 3,200 LOC |
| Formal Review I1: 実probeの開発者固有JDK fallback | `JAVA_HOME`を必須化し、realpath後のOpenJDK 26.0.1検証へ一本化。hard-coded pathを削除 | `JAVA_HOME`なしを明示してconfiguration errorを要求するintegration testと、fresh real TLC正常run |
| Formal Review I2: `tlc-toolchain.ts`のdirect importでroot除外を迂回可能 | 変換器と専用input/error型をprotocol/domain moduleから削除し、issued capability照合後だけ呼ぶmodule-private変換へ移動。issuer/factoryは追加していない | direct moduleのruntime keysに`normalizeTlcExploration`がないことをnegative-firstで固定し、issued COMPLETE / COUNTEREXAMPLE / parser failure / invalid bindingをconcrete facade integrationで固定 |

Formal Review Iteration 2はCritical finding付きのREVISEだった。reviewer budgetは2 / 2で上限到達したため第3回reviewは起動せず、findingを上記のとおりnegative-firstで閉じ、focused / formal / tier / type / lint / dist / coverage / sensor / fresh real TLCを再実行した。未解決U4実装findingは0件であり、§12aの「READYまたはiterations exhausted」に従って§13へ進む。

## 独立reviewへの引継ぎ

Formal Review Iteration 2でdirect module exportの残存迂回を検出し、reviewer budget上限内の最終review結果はREVISEだった。finding closure後はdirect import不在、issued capability binding、3-file 3,200 LOC、U4 CCN超過0件、working-diff coverage 100%、fresh real TLC `NOT_DETECTED`、全最終sensor PASSまで再固定した。review自体は2回実施済みであり、engine正本のiteration上限に従ってcode-generationを閉じる。
