# Security Design — numeric-provenance-distribution

本UnitのNFR Requirements入力はabsent-and-expectedであり、SEC-* IDは新設しない。既存境界としてU3 ownershipは `unit-of-work.md:35-44`、build投影は `requirements.md:48`、delivery-tree acceptanceは `requirements.md:49`、CI/source-only gateは `requirements.md:50,61`、依存禁止は `requirements.md:57` にtraceする。

## Security scope and assets

保護対象は次のsoftware supply-chain assetsである。

- `packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts` の正本source。
- `packages/framework/core/sensors/amadeus-numeric-provenance.md` の正本manifest。
- enforcement対象stageの正本frontmatter。
- lockfileと固定Bun toolchainから生成されるdist/self-install projection。
- delivery-treeからのsensor verdictとaudit terminal receipt。

新規registry publish、network API、credential、secret、cloud resourceはない。artifact signing service、KMS、IAM、VPC、TLSは非該当である。

## Authority boundary

`packages/framework/core/` とtracked bootstrap/configuration allowlistだけを編集可能なauthorityとする。次は生成projectionであり、手編集・選択的copy-back・commitを禁止する。

- `dist/`
- `.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.opencode/`、`.kimi-code/` の生成surface（tracked allowlistを除く）

projectionに差分がある場合はcore sourceまたはbuild ruleを修正し、`bun run build` で全体を再生成する。生成面を正としてsourceへ逆同期しない。

tracked bootstrap/configuration allowlistの唯一の正本は `packages/framework/core/tools/data/self-install-allowlist.ts` の `SELF_INSTALL_ALLOWLIST` とする。source-only gateは、これを直接consumeする `scripts/source-only-boundary.ts` を起動し、文書内の複製一覧を判定根拠にしない。

## Resolution contracts

配送検証は次のliteral authorityと解決規則を使用する。検証実装がdirectory走査や文書解釈から対象を推測してはならない。

- Approved Mapping authorityは `amadeus/spaces/default/intents/260810-numeric-provenance-guard/construction/numeric-provenance-mapping-contract/measurements/numeric-provenance-corpus-sweep.md` 内のmachine section `numeric-provenance-mapping/v1` とする。sectionが公開する `stageSlug` の重複なしexact setだけをenforcement対象として読む。section欠落、schema不一致、unknown stage、重複はclosed failureとする。
- package projection対象の正本は `packages/framework/core/tools/amadeus-harness-registry.ts` の `PACKAGE_HARNESS_IDS` とする。そのsorted exact setが `scripts/package.ts` の `discoverHarnessNames()` 結果と一致しなければ、build前にfailureとする。
- self-install runtime acceptance対象の正本は同registryの `SELF_INSTALL_HARNESS_IDS` とする。package projectionは全 `PACKAGE_HARNESS_IDS`、実delivery fireは全 `SELF_INSTALL_HARNESS_IDS` に対して省略なく実行する。
- 各生成対象のharness rootは、そのtreeに生成された `tools/data/harness.json` の `harnessDir` を読み、対象treeのreal path配下に正規化・containment検証して解決する。絶対path、`..`、symlink escape、未知harness idはclosed failureとする。
- 解決済みharness rootに対し、dispatcherは `<harnessRoot>/tools/amadeus-sensor.ts`、manifestは `<harnessRoot>/sensors/amadeus-numeric-provenance.md`、toolは `<harnessRoot>/tools/amadeus-sensor-numeric-provenance.ts` と固定する。代替entrypoint探索や最初に見つかったfileの採用は禁止する。
- core stage wiringはmachine sectionの `stageSlug` exact setと各core stage frontmatterのsensor idを比較する。各delivery treeでも同じstage集合だけに `numeric-provenance` が存在することを確認し、過不足をfailureとする。

## Deterministic build boundary

build input identityはimmutable source snapshot digest、lockfile digest、build script revision、runner image digest、OS/architecture、Bun `1.3.13` から構成する。同じidentityをfresh project root A/Bへ別々に配置し、それぞれ依存解決・buildを行う。A/Bへ既存の `dist/`、self-install tree、`node_modules/` をcopyしない。

A/Bはそれぞれ独立した空の `node_modules/`、`BUN_INSTALL_CACHE_DIR`、`HOME`、`TMPDIR` を使う。buildはshared writable cacheを持たず、同じpinned runner image digest上で順次実行する。各rootで `bun install --frozen-lockfile` を実行し、install前後でlockfile digestが不変であることを確認する。registry mutationやfloating dependency解決を許可しない。

environmentは明示allowlistに縮退し、`PATH`、`HOME`、`TMPDIR`、`BUN_INSTALL_CACHE_DIR`、`TZ=UTC`、`LC_ALL=C`、source snapshotから固定した `SOURCE_DATE_EPOCH`、各root専用の `AMADEUS_DIST_ROOT` だけを渡す。その他の `AMADEUS_*` override、provider credential、secret、user shell設定はunsetとする。各buildは生成済みinstall stateがないことをpreflightで確認してから開始する。

比較対象は生成配送treeのrelative path、file type、executable bit、raw bytesである。mtime、temporary absolute path、filesystem enumeration順は比較identityへ含めない。片方だけのfile、byte差、mode差をreproducibility failureとする。

temporary directoryは明示的な専用pathを使い、workspace rootやhome全体をcleanup対象にしない。build中にsource treeへ生成物が逆流した場合もfailureとする。

## Projection integrity

### Manifest projection

sensor manifest directory projectionにより、coreの新規manifestが `PACKAGE_HARNESS_IDS` の全配送面へ自動的に含まれることを、Resolution contractsで固定したpathとraw bytesで比較する。配送先manifestのid、kind、command、severity、matchesがcoreと一致することを確認する。

### Tool projection

tool sourceが既存build ruleを通じて `PACKAGE_HARNESS_IDS` の各tools treeへ投影されることを、固定pathとraw bytesで確認する。生成toolの意味論を別実装で再作成せず、core sourceからの決定的変換だけを許す。

### Stage wiring projection

`numeric-provenance-mapping/v1` が定める `stageSlug` exact setと、core stage frontmatterのsensor id集合を比較する。全package配送先stage graphで同じexact setが観測されることを確認し、手作業の部分配線を許さない。

## Delivery-tree acceptance

source存在やcore direct executionだけでは受け入れない。build後、`SELF_INSTALL_HARNESS_IDS` の各自己インストールtreeでResolution contractsの固定dispatcherを起動し、次を確認する。

1. manifest discoveryが `numeric-provenance` を解決する。
2. 正 fixtureでSENSOR_PASSED、負 fixtureでSENSOR_FAILEDがemitされる。
3. audit terminal rowのsensor id、stage、output path、fire id対応が正しい。
4. advisory severityのためstage approval behaviorとgraph goldenが不変である。
5. delivery tool/manifest bytesが対応するbuild outputと一致する。

各self-install harnessについて上記5項目のreceiptを1件ずつ要求し、対象集合の不足・重複・未知idをfailureとする。package-only harnessについてもruntime fire以外のpath、bytes、stage graph exact-set検証は必須とする。

fixture pathは専用temporary intent record内に限定し、既存recordやuser artifactを上書きしない。

## Dependency and environment controls

- `bun install --frozen-lockfile` と固定Bun versionを使用する。
- A/Bでdependency cache、home、temporary root、dist root、install stateを共有しない。
- pinned runner image digest、OS/architecture、locale、timezone、source epochを同一に固定する。
- 新規runtime dependencyを追加しない。
- build/testがnetwork credentialや外部registry mutationを要求しない。
- environment variableやabsolute workspace pathを生成bytesへ埋め込まない。
- generated treeからarbitrary scriptを探索・実行せず、既知のdispatcher entrypointだけを使う。

## Drift controls

| Drift | Detection | Required action |
| --- | --- | --- |
| core vs delivery manifest | relative path + raw bytes/schema | rebuild、source/build修復 |
| core stage set vs Mapping | exact set comparison | source配線修復 |
| isolated build A vs B | tree/bytes/mode comparison | nondeterminism修復 |
| generated files crossing Git boundary | source-only check | generated fileをcommit対象から除外 |
| delivery verdict vs core expectation | positive/negative fire receipt | build/projection/runtime修復 |

## CI security gates

以下をすべてblocking evidenceとして扱う。

- typecheck、lint、graph invariants。
- isolated reproducibility check。
- source-only check。
- integration/test CI suite。
- project/patch coverage gate。
- complexity gate（tool availability時）。

gate failureを生成surfaceの手編集、test skip、golden緩和で回避しない。

## Failure and recovery

| Failure | Recovery |
| --- | --- |
| projection file欠落 | build rule/core sourceを修復し全build再実行 |
| build nondeterminism | timestamp/path/order入力を除去し2 isolated build再実行 |
| delivery fire不一致 | delivery treeのmanifest/tool/stage集合をtraceしてcore側を修復 |
| generated Git boundary violation | generated fileを追跡対象から外しsource-only再実行 |
| lock/toolchain drift | fixed lockfile/Bun identityでclean build |

partial copy、generated hotfix、last-known-good配送面へのsilent fallbackは行わない。

## Verification matrix

- core source以外の生成tool/manifestを編集していないことをGit boundaryで確認する。
- A/Bの独立cache・home・temporary root・dist rootとsanitized environmentをevidence化し、2 isolated buildのrelative path/file type/mode/raw bytesが一致する。
- `PACKAGE_HARNESS_IDS` と `discoverHarnessNames()` のexact setを確認し、全package harnessのmanifest/tool/stage projectionのpath、bytes、stage集合を確認する。
- `SELF_INSTALL_HARNESS_IDS` の各配送先で固定dispatcherから正負fixtureをfireし、対象ごとのpaired audit terminalを確認する。
- `SELF_INSTALL_ALLOWLIST` を直接consumeする `scripts/source-only-boundary.ts` がbuild後もgreenである。
- dependency manifest/lockfileに新規runtime packageがない。

## Residual risk

既存build pipelineまたはCI runner自体が侵害された場合は本Unitだけでtrust rootを回復できない。現scopeはrepository内のdeterministic projectionとdelivery-tree acceptanceまでであり、署名・provenance attestationサービスは別initiativeとする。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:02:23Z
- **Iteration:** 1
- **Scope decision:** none

core正本、生成surface禁止、delivery-tree fire、source-only/CI gate、依存禁止の方針は整合している。しかし、配送対象と再現性隔離境界が具体化されておらず、開発者が推測なしに検証を実装できない。

### Findings

- BLOCKER | `Approved Mapping`、enforcement対象stage集合、全harness配送面、既知dispatcher entrypointのliteral pathまたは解決規則が定義されていないため、stage wiringのexact-set比較とdelivery-tree fireを一意に実装できない。
- BLOCKER | isolated buildはtemporary directoryだけを分離しているが、依存cache、環境変数、platform、既存install stateの隔離・固定条件が未定義である。同一のambient stateに依存する2 buildが一致しても再現性gateを通過でき、supply-chain driftを検出できない。
- FOLLOW-UP | `tracked bootstrap/configuration allowlist`のauthoritative pathまたは列挙がない。source-only gateで意図したtracked例外と禁止generated surfaceを区別できるよう、機械可読な参照先を明記する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:05:40Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の全指摘は解消され、Mapping・harness集合・dispatcher・allowlistのauthoritative解決規則、A/B buildの独立状態と環境固定、delivery-tree fireおよびsource-only/CI gateが推測なく実装可能な粒度で定義されている。

### Findings

- None
