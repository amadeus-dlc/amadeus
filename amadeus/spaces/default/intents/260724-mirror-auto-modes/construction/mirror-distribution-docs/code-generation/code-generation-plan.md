# Code Generation Plan — mirror-distribution-docs

> PART 1で承認された計画をPART 2で実施し、Architecture Review Iteration 1の指摘をIteration 2向けに全て実装・検証した。チェック済み項目は実測で確認済みである。詳細は`code-summary.md`を参照する。

## 1. 目的とトレーサビリティ

完成済みruntime contractを、C9 Distribution Synchronizerのbuild-time境界から6 harness、4 self-install面、`amadeus-mirror` skill、Guide／Reference日英ペアへ同じ意味で投影する。正本と生成物を分離し、配布途中のcrash、drift、path escape、secret混入、日英semantic driftをblocking failureとして検出する。

User Stories stageはSKIPされているため、`unit-of-work-story-map.md`のrequirements-based acceptance sliceをstoryとして使用する。

| Story / requirement | このUnitで提供する価値 | 主な計画Step |
|---|---|---|
| AS-06、FR-7、FR-8 | 利用者がskill／CLI help／status説明から現在のmodeと安全な次操作を理解できる | Step 2、7、8 |
| AS-07、FR-8、FR-9、NFR-3、NFR-4 | maintainerが6 harnessと日英文書をdriftなく配布できる | Step 3〜13 |
| PERF-DD-01〜05 | package／check／promote／docs／digestを固定budget内で実行できる | Step 11、12 |
| REL-DD-01〜06 | deterministic projection、全件drift、read-only check、crash recoveryを保証する | Step 4〜6、10 |
| SEC-DD-01〜06 | raw-byte integrity、path confinement、公開artifact scan、非shell実行を保証する | Step 3、4、7、9、10 |
| scalability | 6 surface、4 self-install、4 docs、32 topics、2 MiB/file、64 MiB totalをfail-closedで扱う | Step 3、7、9、11 |

AS-08／NFR-5のdaemon／polling禁止、boundary限定通信、read-only runtime status非mutationは`mirror-operation-lifecycle`／`mirror-github-gateway`のowner範囲であり、本Unitは再実装しない。本Unitはそれらの確定済みruntime semanticsを配布・説明・検証へ投影するだけである。

## 2. 実装前提とhard stop

- 正本は`packages/framework/core/`、`packages/framework/harness/`、`scripts/`、`docs/`、test sourceである。`dist/`、`.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.opencode/`は生成対象であり、PART 2でも直接編集しない。
- 現在のlifecycle実装、state／audit、reviewer projectionを保持する。C9都合でC6／C7のoperation semantics、authorization、receipt、reconciliationを変更しない。
- 現行scanでは`MIRROR_USER_CONTRACT` exportとruntime repair CLI wiringが存在しない。C9は存在しないruntime機能をskill／docsへ先取りしない。
  - immutable contract exportの追加と既存CLI help／rendererによる利用は、上流設計が明示したC8→C9 provider seamとしてStep 2で行う。
  - `repair status | relink | abandon`がruntime providerに存在しないままなら、PART 2は文書生成前に停止し、`mirror-operation-lifecycle` ownerへ戻す。C9でrepair behaviorを実装しない。
- 現在のcore skillは`{{HARNESS_DIR}}`変換によりcore／surface bytesが異なる一方、承認済みfunctional designはskill payloadのraw-byte同一性を要求する。Step 7でskillを同一bytesのharness-neutral `<harness-dir>`解決手順へ変更し、frontmatter／payload transformを不要にする。raw-byte要件をgolden比較へ黙って緩和しない。
- 新runtime dependency、database、network service、AWS resource、queue、daemon、web UIは追加しない。

## 3. 正本ファイルと生成面

### 3.1 作成・変更する正本

| 役割 | 正本 |
|---|---|
| runtime contract owner | `packages/framework/core/tools/amadeus-mirror-presentation.ts` |
| CLI help consumers | `packages/framework/core/tools/amadeus-mirror.ts`、`packages/framework/core/tools/amadeus-mirror-lifecycle.ts` |
| user-invocable skill | `packages/framework/core/skills/amadeus-mirror/SKILL.md` |
| projection registry | 新規`packages/framework/harness/projections.ts` |
| registry schema | `scripts/manifest-types.ts` |
| six surface registrations | `packages/framework/harness/{claude,codex,cursor,kiro,kiro-ide,opencode}/manifest.ts` |
| harness emit registrations | `packages/framework/harness/{codex,cursor,opencode}/emit.ts`（hard-coded Mirror listをRegistry参照へ置換） |
| package／promote | `scripts/package.ts`、`scripts/promote-self.ts` |
| transaction | 新規`scripts/distribution-transaction.ts` |
| digest／completeness gate | 新規`scripts/mirror-distribution-check.ts` |
| public scanner | 新規`scripts/scan-public-projections.ts` |
| docs semantic validator | 新規`scripts/mirror-docs-contract.ts` |
| benchmark runner／aggregate | 新規`scripts/mirror-distribution-benchmark.ts` |
| commands／test config | `package.json`、`.github/workflows/ci.yml` |
| Guide EN／JA | 新規`docs/guide/22-intent-mirror.md`、`docs/guide/22-intent-mirror.ja.md` |
| Reference EN／JA | 新規`docs/reference/20-intent-mirror.md`、`docs/reference/20-intent-mirror.ja.md` |
| docs index | `docs/README.md`、`docs/README.ja.md` |

`tsconfig.json`は既に`packages/framework/harness/*/*.ts`と`scripts/**/*.ts`、`tsconfig.tests.json`は`tests/**/*.ts`を含み、Biomeも同じsourceを対象にしている。追加runner configは作らず、Step 12で既存設定が新規fileを実際に検査することをnegative fixtureで確認する。

### 3.2 Registryが所有する6面

| Surface | Dist tool | Dist skill | Self-install |
|---|---|---|---|
| claude | `dist/claude/.claude/tools/amadeus-mirror.ts` | `dist/claude/.claude/skills/amadeus-mirror/SKILL.md` | `.claude/tools/amadeus-mirror.ts`、`.claude/skills/amadeus-mirror/SKILL.md` |
| codex | `dist/codex/.codex/tools/amadeus-mirror.ts` | `dist/codex/.agents/skills/amadeus-mirror/SKILL.md` | `.codex/tools/amadeus-mirror.ts`、`.agents/skills/amadeus-mirror/SKILL.md` |
| cursor | `dist/cursor/.cursor/tools/amadeus-mirror.ts` | `dist/cursor/.cursor/skills/amadeus-mirror/SKILL.md` | `.cursor/tools/amadeus-mirror.ts`、`.cursor/skills/amadeus-mirror/SKILL.md` |
| kiro | `dist/kiro/.kiro/tools/amadeus-mirror.ts` | `dist/kiro/.kiro/skills/amadeus-mirror/SKILL.md` | 対象外（dist only） |
| kiro-ide | `dist/kiro-ide/.kiro/tools/amadeus-mirror.ts` | `dist/kiro-ide/.kiro/skills/amadeus-mirror/SKILL.md` | 対象外（dist only） |
| opencode | `dist/opencode/.opencode/tools/amadeus-mirror.ts` | `dist/opencode/.opencode/skills/amadeus-mirror/SKILL.md` | `.opencode/tools/amadeus-mirror.ts`、`.opencode/skills/amadeus-mirror/SKILL.md` |

tool／skill payloadはcore sourceのraw bytesとSHA-256が一致する。wrapper／registrationはRegistryが指すgolden ownerとのparityとして区別するが、公開artifact完全性のunique digest集合には含める。Kiro／Kiro IDEを統合せず、Gemini CLIを追加しない。

### 3.3 Registry基数の確定値

予備設計ではentrypoint toolとskillだけをcore／dist／selfの概念subsetとして数えていたが、closed Registryを唯一のownership boundaryにするには、実際に公開される15 wrapperを含む16 core Mirror tools、skill、6 harness registration、Codex固有`openai.yaml`、4文書を全て列挙する必要がある。最終実装のownerは`packages/framework/harness/projections.ts`であり、consumerは独自の母数を持たない。

unique parity setはartifact kind別に次の算式で195 pathsとなる。

| artifact kind | source owner | 6 dist | 4 self-install | unique合計 |
|---|---:|---:|---:|---:|
| tool（entrypoint） | 1 | 6 | 4 | 11 |
| wrapper（残り15 tools） | 15 | 15×6＝90 | 15×4＝60 | 165 |
| skill | 1 | 6 | 4 | 11 |
| registration | 6 manifests | Codex `openai.yaml` 1 | Codex `openai.yaml` 1 | 8 |
| **合計** | **23** | **103** | **69** | **195** |

Codex `openai.yaml`はRegistry上でsource ownerとdist pathが同一なのでunique集合ではdistの1 pathとして一度だけ数える。public scan setはこの195 pathsにGuide／Reference日英4文書を加えた199 filesである。概念subsetの旧母数は受け入れ判定に使用しない。性能測定は固定件数ではなくRegistry展開後の実workloadを3 warm-up＋20 runsで測り、capacityは各file 2 MiB／transaction 64 MiBの実bytesで検査するため、この意図的拡張でbudgetや閾値を緩和しない。

## 4. Test Strategy

Active strategyは**Comprehensive**とする。各componentにhappy pathと最低2 error／edge caseを置き、unit＋integration＋E2Eを同じUnitで作成する。productionへtest modeを追加せず、filesystem／clock／PID identity／kill point／runnerはport注入で差し替える。

次の番号をPART 2開始時に再確認し、競合がなければ予約する。番号競合時は実装前に次の空き番号へ一括renumberし、`covers:` headerと生成coverage registryを同期する。

| Level | Test file | 主な検証量 |
|---|---|---|
| unit | `tests/unit/t285-mirror-projection-registry.test.ts` | Registry schema、closed 6 IDs、path、stance、parity、capacity |
| integration | `tests/integration/t286-distribution-transaction.integration.test.ts` | journal／lock／fencing／read session |
| integration | `tests/integration/t287-mirror-docs-contract.integration.test.ts` | topic／contract marker parser、runtime semantic comparison |
| integration | `tests/integration/t288-public-projection-scanner.integration.test.ts` | secret／absolute path／allowlist／argument shape |
| integration | `tests/integration/t289-mirror-distribution-projection.integration.test.ts` | package／promote candidate、6＋4面、raw bytes、drift |
| integration | `tests/integration/t290-distribution-transaction-recovery.integration.test.ts` | real fs、rollback／forward completion |
| integration | `tests/integration/t291-mirror-docs-parity.integration.test.ts` | Guide／Reference JA/EN、skill、legacy wording |
| integration | `tests/integration/t292-mirror-distribution-performance.integration.test.ts` | fixed fixture、budget protocol、RSS／duration envelope |
| e2e | `tests/e2e/t293-mirror-distribution-release-gate.test.ts` | source→6 dist→4 self→4 docs、release blocking |

Test fixtures／helpers:

- 新規`tests/helpers/mirror-distribution-fixture.ts`: `MIRROR_USER_CONTRACT`をimportしてcandidate tree、fake surface、PID／process-start identity、failure portを組み立てる。期待semantic集合を別hard-codeしない。
- 新規`tests/helpers/mirror-distribution-benchmark-child.ts`: 1 process／1 workloadを測定しJSONだけを返す。
- 新規`tests/fixtures/mirror-distribution/`: CRLF／NFC、traversal、symlink、duplicate／unknown marker、dual-locale same-wrong-value、secret sentinel、2 MiB＋1、64 MiB＋1、old／new snapshotを置く。
- 新規`tests/fixtures/public-projection-secret-sentinels.json`: dummy tokenと許可される期待pathをliteral列挙し、glob／env除外を持たせない。
- `tests/.coverage-registry.json`／`tests/.coverage-ratchet.json`は`bun tests/gen-coverage-registry.ts`で生成し、直接編集しない。

## 5. Sequential Implementation Plan

### Step 1: provider contractとbaselineをfreezeする

- [x] `mirror-operation-lifecycle`の対象test、`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`を実行し、既存dirty treeを変更元別に記録する。
- [x] `amadeus-mirror.ts`／`amadeus-mirror-lifecycle.ts`の実command、option、exit semantics、`renderMirrorStatus`、skill commandをsource scanとCLI help実行で照合する。
- [x] runtime repair commandが未提供ならhard stopし、C9文書で先取りしない。提供済みなら`status`／`repair status`／`repair relink --issue`／`repair abandon --operation`をfixture対象へ固定する。
- [x] current core tool／skillと6 dist／4 self-installのpath集合、raw digest、transform差分をbaseline artifactとしてtest内で生成する。baseline値をproduction codeへ埋め込まない。
- Trace: AS-06／07、FR-7〜9、Unit dependency、P2実測。

### Step 2: `MIRROR_USER_CONTRACT`をruntime ownerへ追加する

- [x] `amadeus-mirror-presentation.ts`へdeeply immutableな`MIRROR_USER_CONTRACT`を追加する。modes、default、boolean compatibility、precedence、boundary、completion order、operations、manual command schema、failure／retry、close guards、scope exclusionsだけを持たせる。
- [x] command schemaにcommand path、required／optional option、positional禁止、selector defaultを含め、実在CLI以外を表現不能にする。
- [x] C8 renderer、`amadeus-mirror.ts` help、`amadeus-mirror-lifecycle.ts` helpが同exportを消費し、C9 validatorは一方向importする。runtimeからC9 moduleをimportしない。
- [x] architecture testでcontractのduplicate hard-coded mode／boundary／command集合を拒否する。
- Trace: AS-06／07、FR-7／8、TS-DD-04、Functional Review Iteration 1/2 remediation。

### Step 3: closed Projection Registryを実装する

- [x] `packages/framework/harness/projections.ts`に`claude | codex | cursor | kiro | kiro-ide | opencode`のclosed union、dist root、self-install roots／excluded stance、artifact entries、docs entries、parity、golden owner、scan policyを定義する。
- [x] `scripts/manifest-types.ts`へRegistry reference contractを追加し、6 manifestが対応surface entryを正確に1回登録する。
- [x] codex／cursor／opencode emit内の`amadeus-mirror` hard-coded listをRegistry queryへ置換する。Claude／Kiro／Kiro IDEはmanifest registrationを同じlogical IDへbindする。
- [x] package、promote、scanner、digest、docs validatorが同じRegistryを読み、consumer側のsurface／path listを削除する。
- [x] absolute、`..`、NUL、duplicate target、root collision、symlink escape、unknown surface／artifact kind、included self-installのpath欠落をparse時にfailする。
- Trace: AS-07、FR-9、SEC-DD-03／04、SCAL、TS-DD-03、NFR Requirements Reviewの共通registry指摘。

### Step 4: Transaction Coordinatorとlock protocolを実装する

- [x] `.amadeus/distribution-transaction/`配下にcandidate、writer、recovery、readers、journal、backup、quarantineを置き、repo-localかつgitignoredなruntime領域として扱う。
- [x] owner／reader recordをcandidate file／directoryへ完成・fsyncし、固定slotへatomic renameしてからだけactive ownerとして公開する。不完全candidateをactive lockとみなさない。
- [x] shared取得を「writer／recovery不在確認→reader atomic publish→再確認」、exclusive取得を「recovery不在確認→writer atomic publish→再確認→reader 0待機」とし、5秒でtyped timeoutを返す。
- [x] owner recordへschema、kind、random token、monotonic fencing generation、host、PID、process start identity、createdAt、journal IDを保存する。
- [x] stale判定を同一hostのPID不在またはprocess-start identity不一致に限定し、foreign host／identity不明／破損recordを`lock-ambiguous`として自動回収しない。
- [x] stale writer／recoveryのtakeoverをrecovery candidate atomic publish→token再検証→writer quarantine→fencing generation journal永続化の順にする。負けたcontenderは他ownerのslotを変更しない。
- Trace: REL-DD-04／05、TS-DD-07／08、NFR Design Review Iteration 1/2のCritical 2件＋list API Major。

### Step 5: journal／commit／recover状態機械を実装する

- [x] candidate treeをdestination外で完成・全数validateした後、Registryを展開した管理file集合だけをtransaction対象にする。surface root全体や管理外fileをrename／deleteしない。
- [x] `prepared → committing → committed → cleaned`を単調なjournal状態とし、各遷移をtemporary write→file fsync→atomic rename→parent fsyncで永続化する。
- [x] `prepared`にtransaction ID、Registry digest、固定commit順、old／new digest、backup／absent markerを全件記録し、公開file変更前にfsyncする。
- [x] 各new fileを同じparentでfsync後にatomic renameし、parent fsync後に`applied`集合をjournalへ記録する。renameとjournal更新の間はactual digestで適用状態を再判定する。
- [x] `prepared`／`committing`はold snapshotへrollbackし、`committed`はnew snapshotへforward completionする。成功時だけbackup／quarantine／journal／lockをcleanupする。
- [x] `bun scripts/distribution-transaction.ts recover`とmutating generate preflightだけがexclusive recoveryを行う。checkはjournal／recoveryを変更せず`recovery-required`でfailする。
- [x] rollback／forward completion失敗はjournal、backup、quarantine、recovery slotを保持してfail closedにする。
- Trace: REL-DD-01／04／05、Reliability Requirements Failure and Recovery、NFR Requirements Review Critical remediation。

### Step 6: Package／Promoteをcandidate＋transaction方式へ統合する

- [x] `scripts/package.ts`は6 surfaceをtemporary candidateへdeterministically生成し、Registry schema／capacity／source existenceを全検証してからTransaction Coordinatorへ渡す。
- [x] write modeはRegistry管理fileだけを固定順commitし、check modeはshared read sessionでcandidateとchecked-in distをbyte比較してwrite 0件を保証する。
- [x] `scripts/promote-self.ts`からMirror surface／pathの二重listを除き、Registryの4 included／2 excluded stanceを読む。Codexの`.codex` toolと`.agents` skillを別rootとして正しく扱う。
- [x] self-install candidateを完成・validateしてからtransactionへ渡し、既存preserved user files／composed scopes／管理外fileを保持する。
- [x] timestamp、absolute path、cwd、machine newlineを生成bytesへ含めず、same input double generationのpath／bytesを一致させる。
- Trace: AS-07、FR-9、PERF-DD-01〜03、REL-DD-01／02／05、TS-DD-01〜03。

### Step 7: Skill／CLI contractとraw payload parityを揃える

- [x] `amadeus-mirror/SKILL.md`を`MIRROR_USER_CONTRACT`の実在commandだけで更新し、off／prompt／auto、default prompt、boolean拒否、precedence、boundary、failure retry、safe close、scope exclusionを説明する。
- [x] `{{HARNESS_DIR}}`によるsurface別payload変換を除き、同一bytesのharness-neutral `<harness-dir>`解決規則とargument-array実行規律を記載する。
- [x] CLI help／skillのcommand path、required／optional options、active Intent defaultをcontract validatorで比較する。
- [x] 「autoはsyncだけ」、boolean fallback、unsafe close、background sync、repairへのstanding consentをnegative assertionで拒否する。
- Trace: AS-06／07、FR-7／8、SEC-DD-01／02／06、Functional semantic rules。

### Step 8: Guide／Referenceの日英正本を作成する

- [x] Guide `22-intent-mirror.md`／`.ja.md`に利用者向け設定、boundary、completion chain、failure／retry、safe close、CLI例、scope exclusionを記載する。
- [x] Reference `20-intent-mirror.md`／`.ja.md`にcontract schema、event／receipt／provenance、command schema、distribution／recovery semanticsを記載する。
- [x] 各fileへ一意な`<!-- amadeus-topic:<topic-id> -->`と、topicごとに1個の`<!-- amadeus-contract:<topic-id> ... -->`を置く。
- [x] required topicを`modes | precedence | boundaries | completion | failure | safety | cli | scope`へ固定し、contract markerを`MIRROR_USER_CONTRACT`から導出したcanonical JSON fieldと一致させる。
- [x] proseだけNFC／LF normalizeし、canonical JSONのcase／hyphen／space／array orderとpayload bytesはnormalizeしない。
- [x] `docs/README.md`／`.ja.md`へ4正本文書を追加し、片localeだけのindex追加を禁止する。
- Trace: AS-06／07、FR-8／9、REL-DD-06、Documentation Integrity、Functional Review Iteration 1/2 remediation。

### Step 9: Digest／completeness／docs／security validatorsを実装する

- [x] `mirror-distribution-check.ts`がshared read sessionだけを使い、Registry由来のtool 11＋wrapper 165＋skill 11＋registration 8＝195 unique source／dist／self pathsのSHA-256 parity matrixを検証する。
- [x] wrapper／registrationはRegistryのgolden ownerとbyte比較し、raw payload matrixと分離する。
- [x] `listPublicRoot`の実pathとRegistry期待集合を比較し、missing／extra／content mismatchを全件収集してsurface→path→kind順に出す。
- [x] `mirror-docs-contract.ts`がduplicate／missing／unknown topic、unknown key、JA／EN集合差、runtime contract差、legacy wordingを全件検出する。
- [x] `scan-public-projections.ts`が6 dist、4 self-installのtool／skill／wrapper／registrationと4 docsをRegistryから列挙し、token、credential、absolute user pathを検査する。
- [x] scannerはargument array／in-process APIだけを使い、contentやsecretを出力せずrelative path、kind、digestだけを表示する。
- [x] 1 file 2 MiB、全公開projection 64 MiB、topic最大32をcommit前に検査し、超過時は公開変更0件でfailする。
- Trace: REL-DD-02／03／06、SEC-DD-01〜06、SCAL acceptance、PERF-DD-05。

### Step 10: Unit／failure-injection testsを作成する

- [x] t285でclosed IDs、literal paths、included／excluded stance、artifact kind、golden owner、scan policy、consumer duplicate list禁止を検証する。
- [x] t286でcandidate atomic publish、reader registration race、timeout、PID reuse、foreign host、ambiguous owner、single recovery token、fencing monotonicity、journal transitionを独立oracleで検証する。
- [x] t287でmarker grammar、canonical field、dual-locale same-wrong-value、NFC／LF prose、raw JSON literal、legacy wordingを検証する。
- [x] t288でartifact種別ごとのsecret sentinel、dummy exact allowlist、path traversal、symlink escape、shell metacharacter非実行を検証する。
- [x] property-based testは被検parserと同じ検証をoracle側へ再実装せず、固定golden／metamorphic property／明示invalid corpusを用いる。
- Trace: Comprehensive strategy、P2検証劇場禁止、SEC／REL全項。

### Step 11: Integration／E2E／performance testsを作成する

- [x] t289でsourceから6 dist＋4 self-install candidateを生成し、Registry由来195-path parity、Kiro／Kiro IDE別surface、Codex split root、missing／extra／1-byte drift、check write 0を検証する。
- [x] t290でcandidate作成、fsync、slot publish、journal各状態、backup後、rename／applied間、parent fsync、recovery publish、writer quarantine、fencing更新、cleanup各点へkill／disk-fullを注入する。
- [x] t290でshared readerがcommit途中を観測しないこと、`prepared`／`committing`→old、`committed`→new、recover後管理外file不変、read-only checkのwrite 0を実測する。
- [x] t291で4 docs、skill、両CLI helpをruntime contractと比較し、片locale欠落、両locale同誤記、unknown marker、legacy textをfailさせる。
- [x] t292でwarm-up 3＋20 run、nearest-rank p95、RSS、write 0、Registry展開後195-path parity／199-file scan workloadを固定fixtureで測定する。local unit runはprotocol検証、CI固定runnerだけがbudget判定を所有する。
- [x] t293でsource layoutと4 self-install layoutからdefault／non-default Space、explicit／active Intentを選択し、同じrecord identityへ解決することを確認する。
- [x] t293でsource→package→transaction→dist→promote→self→docs gateを通し、1 findingでもrelease successにならずruntime Mirror state／GitHub mutationが0件であることを確認する。
- Trace: AS-07 Confidence Hypothesis、FR-7〜9、PERF／REL／SEC acceptance全件。

### Step 12: Test configurationとCIを統合する

- [x] `package.json`へ既存entryを壊さず`distribution:check`、`distribution:recover`、`distribution:benchmark`を追加する。
- [x] `.github/workflows/ci.yml`の通常checkでtypecheck→Biome→complexity→distribution check→dist check→promote check→testsのAND gateを構成する。
- [x] GitHub Actions `ubuntu-24.04`／X64／Bun 1.3.13で3 independent benchmark jobsを実行し、各jobの3 warm-up＋20 run JSONをartifact化する。
- [x] aggregate jobでimage一致、欠損、max/min > 2.0をinconclusive failureとし、3 jobのnearest-rank p95中央値とRSSをPERF-DD-01〜05へ判定する。
- [x] `tsconfig.json`、`tsconfig.tests.json`、`biome.json`の既存globが新規source／testを検査することを確認し、不要な新configやlint除外、complexity baseline緩和を追加しない。
- [x] test headerの`covers:`と`size:`を付け、coverage registry／ratchetをgeneratorで同期する。
- Trace: NFR-4、TS-DD-06、PERF benchmark protocol、Comprehensive strategy。

### Step 13: 正本から生成し、全surfaceを同期する

- [x] Step 1〜12のsource／testがgreenになった後だけ`bun scripts/package.ts`で6 distを生成する。
- [x] `bun scripts/promote-self.ts --apply`でClaude／Codex／Cursor／OpenCodeの4面を生成する。Kiro／Kiro IDEをmissing self-installとして扱わない。
- [x] 生成後にRegistry管理file、管理外file、journal／backup残存を検査し、generated-only修正や片locale変更を拒否する。
- [x] `tests/.coverage-registry.json`／ratchetをgeneratorで同期する。
- [x] application code／docs／tests／generated filesの実変更を`code-summary.md`へ計画Step単位で記録し、逸脱があればownerと理由を明記する。
- Trace: AS-07、FR-9、REL-DD-01〜05、Bolt 2 DoD。

## 6. Existing NFR-design Review Findings to Close

`nfr-design/performance-design.md`のReview Iteration 2はNOT-READYのままであり、次を「設計文面にある」だけで完了扱いにせず、実装＋落ちるfixture＋回復実測で閉じる。

| Finding | 実装closure | 検証closure |
|---|---|---|
| Critical: transaction／lock／failure injectionが不足 | 完全ownerのatomic publish、shared／exclusive／recovery lock、schema 2 journal、rollback／roll-forward | t286で不完全owner、timeout、stale／alive／ambiguous owner、path／symlink／capacityをnegative fixture化。t290でcandidate、journal、rename、parent fsync、applied、cleanup各境界とrollback／roll-forward失敗時の証跡保持を注入 |
| Critical: Registryが唯一のownership boundaryでなく公開root completenessが不足 | closed Registryとshared lock保持中の`listPublicRoot(rootId)`、canonical relative path集合 | t285でunknown kind／surface、duplicate／collision、absolute／Windows／NUL／`..`、self stanceを拒否。t289でmissing、未登録extra、1-byte driftをrelease finding化 |
| Major: docs／runtime contract／CLI help parityが不足 | `MIRROR_USER_CONTRACT`をrenderer、両CLI help、skill、4文書validatorの正本にする | t287でsame-wrong locale、duplicate／unknown topicを拒否。t291でcommand欠落、legacy wording、background consent表現を拒否 |
| Major: performance release gateが単発値だけで閉じる | 固定runner 3 replica、各3 warm-up＋20 runs、median p95／RSS、明示AND gate | t292でreplica欠損、runner image不一致、run不足、max/min分散超過、duration／RSS budget超過を拒否 |
| Major: root selectorとrelease blockingがlayout固定深度に依存 | `resolveMirrorRecordIdentity`とsource＋4 self layoutの同一record identity、finding 1件以上でrelease失敗 | t293でdefault／non-default Space、active／explicit Intentを全layoutで比較し、missing／drift finding時のrelease successとruntime／GitHub mutationを拒否 |

加えてNFR Requirements Reviewで解消方針が確定した次の項目も実装で固定する。

- root directory交換を行わず、Registry管理fileだけをsame-parent atomic renameする。
- checkは未完journalを変更せず`recovery-required`でfailし、recover／mutating generateだけが復旧する。
- package／promote／scanner／validatorsは同じRegistryを読む。
- security scanは6 dist、4 self-install、4 docsの公開artifact全種を対象とする。
- parityはRegistry artifact kind別の195 unique paths、公開scanは4文書を加えた199 filesを正本とする。capacityは重複copyを含む実byte合計で測る。

## 7. N/A Boundaries

- API／endpoint: N/A。新network surfaceなし。
- Repository／database／migration: N/A。永続対象はgenerated filesとrepo-local transaction journalだけ。
- IaC／Docker／deployment resource: N/A。既存GitHub Actions check／benchmarkだけを更新する。
- Frontend／UI／`data-testid`: N/A。CLI／Markdownのみ。
- runtime GitHub operation: N/A。C9 testでremote mutation 0件を確認する。

## 8. Final Validation Commands

PART 2完了時は次を順に実行し、exit code、pass／fail／expect／file数、duration、warningを`code-summary.md`へ実測転記する。

```bash
bun run typecheck
bun run lint
bun tests/complexity-gate.ts --check
bun test tests/unit/t285-mirror-projection-registry.test.ts
bun test tests/integration/t286-distribution-transaction.integration.test.ts \
  tests/integration/t287-mirror-docs-contract.integration.test.ts \
  tests/integration/t288-public-projection-scanner.integration.test.ts
bun test tests/integration/t289-mirror-distribution-projection.integration.test.ts \
  tests/integration/t290-distribution-transaction-recovery.integration.test.ts \
  tests/integration/t291-mirror-docs-parity.integration.test.ts \
  tests/integration/t292-mirror-distribution-performance.integration.test.ts
bun test tests/e2e/t293-mirror-distribution-release-gate.test.ts
bun scripts/mirror-distribution-check.ts
bun scripts/scan-public-projections.ts
bun scripts/package.ts --check
bun scripts/promote-self.ts --check
bun tests/gen-coverage-registry.ts --check
bun tests/run-tests.ts --ci -P 4
git diff --check
```

Performanceの数値合否は`.github/workflows/ci.yml`の固定3-job aggregateを正本とし、開発機の単発値を達成証拠へ昇格させない。

## 9. PART 1 Completion Condition

- [x] 人間が本planをApproveするまでPART 2へ進まない。
- [x] N/A: 人間はApproveを選択したためRequest Changes分岐は発生しなかった。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:44:43Z
- **Iteration:** 1
- **Scope decision:** none

配布生成の基本経路はgreenだが、transaction recovery、Registry完全性、CLI parity、root解決、CI性能gateに明示的な未実装があり、516-file suiteでは必須受け入れ条件を代替できない。

### Findings

- Blocker: 配布transactionのcrash-safe契約が未完了。全対象fileの事前journal化、shared/exclusive lock、5秒typed timeout、rename/fsync/disk-full failure injection、rollback/forward失敗時のjournal保持を実装してt286/t290で検証すること。
- Blocker: Registryが唯一の公開artifact ownership boundaryになっていない。全consumerをRegistry queryへ統一し、canonical path validation、wrapper/registration、listPublicRoot completeness、missing/extra/collision、全artifact scan、64MiB gateを実装すること。
- Major: MIRROR_USER_CONTRACT、renderer、両CLI help、skill、4文書のcommand schema parityが未完了。negative fixture付きで単一正本化すること。
- Major: sourceと4 self-install面のdefault/non-default Space、explicit/active Intent matrixと固定親階層数回帰をt293で検証すること。
- Major: CI 3-replica aggregateと5 workloadのPERF-DD-01〜05 release gateを実装し、欠損/image不一致/分散/予算超過をAND gate failureにすること。
- Major: 未チェック項目とsummary残存制約を全て実装・検証するか、上流契約を正式に再承認してscopeから除外するまで完了扱いにしないこと。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T23:31:30Z
- **Iteration:** 2
- **Scope decision:** none

前回の機能的5指摘は解消したが、planとsummaryのRegistry母数・検証test参照・依存Unit逸脱記録が矛盾し、全項目を真実に閉じた成果物になっていない。

### Findings

- Finding 1-5解消: crash-safe transaction、Registry ownership、contract parity、five-layout selector、CI aggregate AND gateは上流契約を満たす。
- Major: 予備計画のentrypoint限定subsetとsummaryの195-path実公開集合が矛盾する。Registry entry種別ごとの算式、拡張理由、owner、性能budget影響を統一すること。
- Major: NFR closure表のtest IDが実際のt285/t286/t289/t290割当と一致しない。Critical/Major findingからnegative fixtureへ一意に辿れるよう修正すること。
- Major: summaryに計画との差分節を追加し、依存Unit repair/Provenance V2のowner移管、人間承認、変更範囲、C9依存方向とRegistry母数拡張を記録すること。
