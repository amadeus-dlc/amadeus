# Code Generation Plan — experiment-contract-provenance

## 目的と入力境界

本計画はCode GenerationのPART 1（Planning）のみを対象とし、実装・test作成・設定変更はまだ行わない。対象はBrownfieldのTypeScript ESM / Bun repositoryに埋め込むU1 `experiment-contract-provenance`であり、再利用可能なapplication codeをworkspace rootの`scripts/formal-verif/`、testとtest supportを`tests/`配下へ置く。`packages/framework/`、`packages/setup/`（self-install）、`dist/`、production CI required check、database、remote service、UI、deployment artifactは変更しない。

入力はengine directiveの7 consumes（`business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`performance-design.md`、`security-design.md`、`unit-of-work.md`、`requirements.md`）に加え、当UnitのFunctional Design / NFR Requirements / NFR Design全成果物、InceptionのApplication Design全成果物、`unit-of-work-story-map.md`を使用した。User Stories stageはSKIPされており`stories.md`は存在しないため、storyを捏造せず、`unit-of-work-story-map.md`のrequirement scenario S-1/S-2/S-3/S-4/S-7/S-8をstory相当のtrace単位として用いる。

## 実装方針

- Experiment contractはstrict parser、closed constants、canonical JSON / SHA-256をpure moduleとして実装する。
- provenance ledgerを唯一の正本とし、最大6 eventsをfoldしてblind stateを導出する。transaction batchは全検証後にatomic store portへ渡す。
- command / proof / handlerはclosed discriminated unionとconstructor injectionで結線し、concrete Registry / TLC / TS arm / Evidence / Evaluator / Rendererをimportしない。
- filesystem adapterはimmutable transaction object + append-only successor chainをrepository-scoped root内で実装し、crash recovery、same-transaction retry、head conflict、corruptionをtyped outcomeで区別する。
- Comprehensive test strategyに従い、各logical componentを10〜15 casesのunit testで覆い、主要境界にintegration test、U1全体のspawned lifecycleにE2E testを設ける。
- 既存の`bun:test`、fast-check、`tests/run-tests.ts`、TypeScript、Biomeを再利用し、新規runtime dependency、Vitest/Jest、専用database、network clientは追加しない。

## 予定ファイル

### Application code

| 予定ファイル | 役割 | 主trace |
| --- | --- | --- |
| `scripts/formal-verif/contract.ts` | `ExperimentConfig` / `TlcProfile` / `CellResult` / `ArmSuiteResult`、strict parser、closed constants | FR-4/FR-5、NFR-1/NFR-2、S-3/S-8、BR-01/02/05 |
| `scripts/formal-verif/canonical.ts` | recursive key order、array order保持、UTF-8 canonical bytes、domain-separated SHA-256 | FR-4、NFR-1、S-3/S-8、BR-03/04 |
| `scripts/formal-verif/provenance.ts` | event union、ledger fold、blind state、transaction生成、store port / receipt / typed errors | FR-3/FR-5、NFR-1/NFR-2、S-2/S-4/S-7/S-8、BR-06〜19 |
| `scripts/formal-verif/proof-policy.ts` | command別のstate + proof validator exact registry、blind isolation validation | FR-3、NFR-2、S-2/S-4、BR-07〜14 |
| `scripts/formal-verif/dispatcher.ts` | argv decoder、closed command union、handler registry exactness、exactly-one dispatch | FR-3/FR-4、NFR-2、S-2/S-3/S-8、BR-20〜23 |
| `scripts/formal-verif/repository-path-policy.ts` | lexical relative path、realpath / symlink containment、owned-path allowlist | FR-3、NFR-2、S-2/S-8 |
| `scripts/formal-verif/fs-provenance-store.ts` | immutable object、successor record、durability / recovery / lookupを担うfilesystem adapter | FR-3/FR-5、NFR-1/NFR-2、S-2/S-8、BR-16/17 |
| `scripts/formal-verif/receipt.ts` | command / state / handler / transaction identityを結ぶsafe receiptとredaction | FR-3/FR-5、NFR-1/NFR-2、S-2/S-8 |
| `scripts/formal-verif/index.ts` | U1のpublic exportだけを固定し、concrete providerを公開しない | U1 boundary、NFR-4 |

### Test files and support

| 種別 | 予定ファイル | 主な検証（各unit fileは10〜15 cases） |
| --- | --- | --- |
| Unit | `tests/unit/t-formal-verif-contract.test.ts` | unknown field、required field、closed constants、UTC、non-negative integer、1 MiB境界、100回同一parse |
| Unit | `tests/unit/t-formal-verif-canonical.test.ts` | key順不変、array順有意、非JSON値拒否、domain separation、single serialize/hash counter、fast-check property |
| Unit | `tests/unit/t-formal-verif-provenance-state.test.ts` | T-first、freeze/reveal/pass/S順序、terminal failure、duplicate/UTC逆転、promotion permission、0/1/3/6 events |
| Unit | `tests/unit/t-formal-verif-provenance-transaction.test.ts` | transaction ID、atomic batch、same-ID retry、different-bytes corruption、head conflict、commit unknown lookup |
| Unit | `tests/unit/t-formal-verif-proof-policy.test.ts` | proof欠損、manifest mismatch、private/foreign input、Arm T→S leakage、cross-command proof、exact policy set |
| Unit | `tests/unit/t-formal-verif-dispatcher.test.ts` |全commandの一意routing、unknown/surplus argv、handler欠損/重複/置換、引数/deadline identity、error保持、call count<=1、no chain |
| Unit | `tests/unit/t-formal-verif-path-policy.test.ts` | absolute / `..` / NUL / symlink escape、allowlist外、canonical relative path、repository containment |
| Unit | `tests/unit/t-formal-verif-receipt.test.ts` | identity trace、typed outcome、credential/home/private content redaction、safe cause identity、deterministic bytes |
| Integration | `tests/integration/t-formal-verif-provenance-store.integration.test.ts` | temp filesystemでobject / flush / rename / parent sync / ack各crash境界、torn / orphan、recovery chain |
| Integration | `tests/integration/t-formal-verif-contract-dispatch.integration.test.ts` | decoder→policy→fold→fake handler→transaction portの全境界とstructured receipt |
| Integration | `tests/integration/t-formal-verif-isolation.integration.test.ts` | realpath / symlink tree、actual input manifest、forbidden scan receipt、repository write rootの結合 |
| E2E | `tests/e2e/t-formal-verif-contract-provenance.test.ts` | test-only compositionでBun subprocessを起動し、T start→freeze→reveal→pass→S start→freeze→promotion permissionとfailure stopを再現 |
| Support | `tests/formal-verif/support/contract-provenance-harness.ts` | E2E専用のfake handler / deterministic clock / temporary store composition。production CLI rootにはしない |
| Fixture | `tests/formal-verif/fixtures/contract-provenance/` | public manifest、proof receipt、ledger / corruption / capacityのsynthetic fixtures。sealed defect detailや外部store参照を置かない |

## 実装手順

- [x] **Step 1: test / compile configurationをnested repo-local pathへ対応させる。** `tsconfig.json`の`scripts/*.ts`を`scripts/**/*.ts`へ拡張し、既存`tsconfig.tests.json`、Biome、`tests/run-tests.ts`のdirect tier discoveryを再利用する。Vitest/Jest config、`bunfig.toml`、dependency、package scriptは追加しない。test filesはrunnerが発見する`tests/unit|integration|e2e/`直下に置き、共有support / fixtureだけ`tests/formal-verif/`へ置く。Trace: NFR-4、S-8、E-FVEAD3。
- [x] **Step 2: closed domain contractとstrict parserを実装する。** `scripts/formal-verif/contract.ts`にbranded value、Result、closed schema、fixed config、1 MiB pre-parse capを置き、部分valueや暗黙defaultを返さない。Trace: FR-4/FR-5、NFR-1/NFR-2、S-3/S-8、BR-01/02/05。
- [x] **Step 3: canonical bytes / identityを実装する。** `scripts/formal-verif/canonical.ts`でobject keyをUnicode code point順に正準化し、array順を維持してUTF-8 bytesとSHA-256 lowercase hexを一度だけ生成する。transactionにはdomain separationとexpected headを含め、自己参照を避ける。Trace: FR-4、NFR-1、S-3/S-8、BR-03/04/17。
- [x] **Step 4: parser / canonicalizationのComprehensive unit testsを先に作る。** `tests/unit/t-formal-verif-contract.test.ts`と`tests/unit/t-formal-verif-canonical.test.ts`に各10〜15 cases、fast-check property、100回再現性、1 MiB / +1 byte、key / array order、非JSON値のred casesを追加する。Trace: FR-4、NFR-1/NFR-2、S-3/S-8。
- [x] **Step 5: provenance event、state fold、transaction portを実装する。** `scripts/formal-verif/provenance.ts`にmax6 eventsの一本道、start/freeze continuity、terminal skeleton failure、promotion permission、appendBatch / findTransaction契約、closed error taxonomyを置く。Trace: FR-3/FR-5、NFR-1/NFR-2、S-2/S-4/S-7/S-8、BR-06〜19。
- [x] **Step 6: provenance state / transactionのComprehensive unit testsを作る。** `tests/unit/t-formal-verif-provenance-state.test.ts`と`tests/unit/t-formal-verif-provenance-transaction.test.ts`に各10〜15 casesを置き、valid path、全invalid order、duplicate、UTC逆転、atomic batch、idempotent retry、conflict / corruption / unknown commitを検証する。Trace: FR-3/FR-5、NFR-1/NFR-2、S-2/S-4/S-7/S-8。
- [x] **Step 7: proof policy、repository path policy、safe receiptを実装する。** `proof-policy.ts`でcommand-specific proofのexact registry、`repository-path-policy.ts`でlexical / realpath / symlink / allowlist検証、`receipt.ts`でprivate valueを落としたidentity traceを実装する。Trace: FR-3、NFR-2、S-2/S-4/S-8、BR-07〜14。
- [x] **Step 8: security / observabilityのComprehensive unit testsを作る。** `t-formal-verif-proof-policy.test.ts`、`t-formal-verif-path-policy.test.ts`、`t-formal-verif-receipt.test.ts`へ各10〜15 casesを追加し、proof欠損、manifest drift、private path、Arm leakage、traversal / symlink、handler substitution、secret / home path redactionをfail-closedで固定する。Trace: FR-3、NFR-2、S-2/S-4/S-8。
- [x] **Step 9: generic command decoder / dispatcherを実装する。** `scripts/formal-verif/dispatcher.ts`にclosed command union、strict argv decoder、exact handler registry、state / proof validation、single await dispatch、typed error preservationを置き、`index.ts`からpure public surfaceだけをexportする。concrete handlerやfinal CLI rootはU1に追加しない。Trace: FR-3/FR-4、NFR-2/NFR-4、S-2/S-3/S-8、BR-20〜23。
- [x] **Step 10: dispatcherのComprehensive unit testsを作る。** `tests/unit/t-formal-verif-dispatcher.test.ts`に全command kind、unknown / surplus argv、handler欠損 / 重複 / 余分、exact argument / deadline、dependency error、handler call<=1、成功後chain 0件を10〜15 casesで検証する。Trace: FR-3/FR-4、NFR-2、S-2/S-3/S-8。
- [x] **Step 11: filesystem provenance adapterを実装する。** `scripts/formal-verif/fs-provenance-store.ts`でsame-directory temporary、immutable object、file / directory sync、exclusive successor record、lookup、startup validation、quarantine receiptを実装し、old/new valid headへ収束させる。database、daemon、parallel writer supportは追加しない。Trace: FR-3/FR-5、NFR-1/NFR-2、S-2/S-8、BR-16/17。
- [x] **Step 12: integration testsを作る。** 3つの`tests/integration/t-formal-verif-*.integration.test.ts`でfilesystem crash points、torn / orphan / same-ID corruption、decoder→policy→fold→fake handler→store、realpath / manifest / scan receipt境界を検証する。各fileはkey boundaryを10〜15 casesで覆い、temporary directory以外へ書かない。Trace: FR-3/FR-5、NFR-1/NFR-2、S-2/S-4/S-8。
- [x] **Step 13: spawned E2E lifecycleを作る。** `tests/formal-verif/support/contract-provenance-harness.ts`をtest-only composition rootとして、`tests/e2e/t-formal-verif-contract-provenance.test.ts`からBun subprocessを起動する。成功一本道、skeleton failure terminal、dirty freeze、private input、same transaction retry、response loss recoveryを10〜15 casesで検証し、U1単独のwalking skeleton完成やmanifest promotion I/Oは主張しない。Trace: FR-3〜FR-5、NFR-1/NFR-2、S-2/S-3/S-4/S-7/S-8。
- [x] **Step 14: capacity / performance counterを全layerで検証する。** unit / integration testsへevents `0/1/3/6`、payload `1 KiB/64 KiB/1 MiB`、7th / +1 byte reject、node visit / byte scan / fold / serialize / hash / handler counter、deadline identity、retained referenceのassertionを追加する。wall-clockはraw observationのみとし合否SLAにしない。Trace: FR-5、NFR-1/NFR-2、S-7/S-8。
- [x] **Step 15: scope / dependency / packaging guardを検証する。** import scanでnetwork / database / queue / concrete providerの依存0件、diffで`packages/framework/` / `packages/setup/` / `dist/`変更0件、fixture scanでcredential / absolute home / sealed detail / external store参照0件を確認する。Trace: FR-3、NFR-2/NFR-4、S-2/S-8。
- [x] **Step 16: documentationを最小限に整える。** public type / non-obvious durability boundaryには英語のinline commentsを置き、test名でrequirement / failure behaviorを説明する。README、API docs、deployment docs、DB migration、Dockerfile / IaCは対象外のため作成しない。Trace: NFR-4、S-8。

## Requirement / scenario traceability

| Trace | 実装Step | 主test Step |
| --- | --- | --- |
| FR-3 / S-2 Blind freeze provenance | 5、7、9、11 | 6、8、10、12、13、15 |
| FR-4 / S-3 Deterministic verdict contract | 2、3、5、9 | 4、6、10、13 |
| FR-5 / S-7 Cost provenance | 2、3、5、11、14 | 4、6、12〜14 |
| S-1 Defect universe closure（U1 support） | 2、5 | 4、6、13 |
| S-4 Risk-first skeleton control | 5、7、9 | 6、8、10、13 |
| S-8 Reproducible decision record | 2〜16 | 4、6、8、10、12〜15 |
| NFR-1 Determinism / reproducibility | 2、3、5、11、14 | 4、6、12〜14 |
| NFR-2 Reliability / fail-closed | 2、5、7、9、11 | 4、6、8、10、12、13、15 |

## Test configurationの扱い

- test runnerは既存のBun native runnerを継続使用する。`tests/run-tests.ts`はtier directory直下だけをdiscoverするため、実行対象`.test.ts`は`tests/unit/`、`tests/integration/`、`tests/e2e/`直下に置く。
- `tests/formal-verif/`はfixtureとtest-only support専用で、独立test fileの配置先にしない。
- `tsconfig.json`だけを`scripts/**/*.ts`へ拡張し、nested application codeを既存`bun run typecheck`へ含める。`tsconfig.tests.json`は既に`tests/**/*.ts`を含むため変更しない。
- `biome.json`は既に`scripts/**` / `tests/**`を検査するため変更しない。
- `package.json`、lockfile、`bunfig.toml`、Vitest / Jest configは変更しない。fast-check 4.9.0は既存devDependencyを使用する。

## 検証commands

実装時は次の順で検証する。

```sh
bun test tests/unit/t-formal-verif-contract.test.ts
bun test tests/unit/t-formal-verif-canonical.test.ts
bun test tests/unit/t-formal-verif-provenance-state.test.ts
bun test tests/unit/t-formal-verif-provenance-transaction.test.ts
bun test tests/unit/t-formal-verif-proof-policy.test.ts
bun test tests/unit/t-formal-verif-dispatcher.test.ts
bun test tests/unit/t-formal-verif-path-policy.test.ts
bun test tests/unit/t-formal-verif-receipt.test.ts
bun tests/run-tests.ts --unit --filter 't-formal-verif-'
bun tests/run-tests.ts --integration --filter 't-formal-verif-'
bun tests/run-tests.ts --e2e --filter 't-formal-verif-contract-provenance'
bun run typecheck
bun run lint:check
bun run check
bun run dist:check
git diff --exit-code -- packages/framework packages/setup dist
rg -n 'node:(http|https)|fetch\(|axios|database|oauth|secret manager' scripts/formal-verif tests/formal-verif tests/unit/t-formal-verif-* tests/integration/t-formal-verif-* tests/e2e/t-formal-verif-*
```

最後の`rg`は該当0件を期待するnegative import / capability scanとして扱い、0件によるexit 1を「scan成功」と明示して判定する。全commandはrepository rootで実行し、raw evidenceやintent固有provenanceをapplication code / reusable fixtureへ混在させない。

## Architecture Review Iteration 2

- [x] Provenance eventを実行時にもclosed discriminated unionとして検査し、authoring / freeze proof、identity continuity、実在UTC、単調sequence、T freeze参照を必須化した。
- [x] Dispatcherを`argv decode → ledger fold/state導出 → command proof検査 → exactly-one handler`の固定pipelineへ変更し、`CommandContext`、surplus argv拒否、pre-handler failure時call 0件を検証した。
- [x] Single-writer lockをcomplete owner recordのstage / fsync / exclusive link publishへ変更し、nonce-safe release、live / unknown owner拒否、dead owner / orphan stage quarantineを実装した。
- [x] Transaction IDを`expectedHead + transactionIdを除くpayload`から再計算し、append / lookup双方で全event envelope一致とpreimageを検査した。
- [x] Contract parserでplain-object prototype、lowercase SHA-256、finite metadata、lexical repository-relative evidence path、suite/cell arm・subject対応をfail-closed化した。
- [x] Receipt redactionをnested object / arrayへ再帰適用し、secret key、POSIX / Windows / UNC / home / embedded pathを除去した。
- [x] E2Eを実dispatcher pipelineからdurable storeまで通し、lock / transaction / successorの全12 durability境界で実child processを強制終了してretry収束を検証した。
