# Code Generation Plan — sealed-fixture-registry

## 計画境界

本計画はU2 `sealed-fixture-registry`だけを対象とし、`unit-of-work.md`、`unit-of-work-story-map.md`、RequirementsのFR-1〜FR-3 / NFR-2〜NFR-3、Functional DesignのBR-01〜BR-23、NFR Requirements / Designを実装境界とする。User StoriesはSKIPされているため、各StepはS-1 / S-4 / S-6 / S-8 / S-9へ直接traceする。

所有するのは、7または根拠ある5へ閉じたdefect universe、falling proof / branch isolation、3分類scan、immutable seal、freeze後のgrant-bound disclosure、Coordinator permissionを使うpromotion検証、capacity / crash recoveryである。arm code、oracle、cell verdict、promotionのinvoke時機、eligibility / Pareto、report、final CLIは実装しない。application codeは`workspace root/scripts/formal-verif/`、testは既存tierの`tests/`へ置き、intent固有のpatchやraw evidenceをfixtureとして新規作成しない。

## 既存reuseと変更対象

| 区分 | 対象 | 方針 |
| --- | --- | --- |
| reuse | `canonical.ts` | canonical JSON / SHA-256 identityを再利用する |
| reuse | `contract.ts` | `Result`、strict UTC instant、既存arm / SHA contractを再利用する |
| reuse | `repository-path-policy.ts` | repository-contained path検証を再利用する |
| reuse | `execution-evidence.ts` | arm cell固有の`ProcessPort` / `AuthorizedProcessRequest`は流用せず、中立な`RawProcessOutcome` / monotonic clock型だけを再利用する。Git proof / scannerにはU2専用portを定義する |
| reuse | `provenance.ts` | `FoldedLedger.events/head`をU2 adapterが再検証する。既存`promotionPermission()`のstate/headだけでは能力不足のため、その戻り値だけでpromotionを許可しない |
| new | `fixture-registry-domain.ts` | closed schema、7/5 universe、proof / branch / scan / seal / disclosure / promotion型とerror union |
| new | `fixture-proof.ts` | baseline green、単独patch red、non-target不変、allowed hunk / parent / tree binding |
| new | `fixture-scan.ts` | manifest由来stream、hash / length、3分類zero finding、bijection |
| new | `fixture-registry.ts` | seal / reveal / materialize / promoteのpure validationとopaque receipt境界 |
| new | `fs-fixture-registry.ts` | owner付きlock、capacity lifecycle、seal / disclosure / promotionのdurable successor transactionとrecovery |
| modify | `index.ts` | U2 public surfaceだけをexportする |

閉包済みU3の`FsEvidenceStoreAdapter`はtransaction / lock / capacity実装をprivate methodとして所有しており、直接reuseできない。U3をgeneric storeへrefactorする案は他Unit越境になるため本計画では採らず、U2の異なるsuccessor keyとlifecycle invariantをU2境界内へ実装する。

## Comprehensive test配置

| Tier | ファイル | 主な反証 |
| --- | --- | --- |
| Unit | `tests/unit/t-formal-verif-fixture-domain.test.ts` | closed row、7/5、6/8、重複root、total mapping、canonical identity |
| Unit | `tests/unit/t-formal-verif-fixture-proof.test.ts` | baseline red、target非red、non-target波及、wrong parent、merge、hunk逸脱 |
| Unit | `tests/unit/t-formal-verif-fixture-scan.test.ts` | missing / duplicate / extra、3分類match、tool/read/rule drift、path / symlink |
| Unit | `tests/unit/t-formal-verif-fixture-registry.test.ts` | freeze前 / cross-arm reveal、#1252順序、grant replay、permission / D-COUNT drift |
| Integration | `tests/integration/t-formal-verif-fixture-store.integration.test.ts` | durable seal / disclosure / promotion、response loss、collision、lock、capacity / crash recovery |
| Integration | `tests/integration/t-formal-verif-fixture-proof.integration.test.ts` | temporary repository、closed Git environment、isolated patch、raw receipt binding |
| E2E | `tests/e2e/t-formal-verif-sealed-fixture-registry.test.ts` | synthetic 5/7 universeをproof→scan→seal→reveal→promotion-readyまで通し、未承認promotionを拒否。positive production promotionはE-FVEU2CGR5によりU8 final-rootへ延期 |
| Support | `tests/formal-verif/support/sealed-fixture-registry-harness.ts` | fake process / scanner / clock / liveness、temporary store、crash injection |

既存`bun:test`、`tests/run-tests.ts`、`tsconfig.json` / `tsconfig.tests.json`、Biomeをそのまま使う。test configuration、`package.json`、lockfile、dependency、CI workflowは変更しない。

## 実装Steps

- [x] **Step 1: 変更境界と既存configurationを再確認する。** `scripts/**/*.ts` / `tests/**/*.ts`のcompile、tier discovery、禁止領域、既存U1/U3 public exportを実測し、計画外設定変更を0件にする。Trace: S-8、FR-3、NFR-2/NFR-3、BR-23。
- [x] **Step 2: closed registry domainを実装する。** `fixture-registry-domain.ts`へstrict parser、`RegistryError` closed union、`DCount=7|5`、closed candidate row、5-cluster total mapping、canonical identitiesを置き、6 / partial mapping / unknown fieldを表現不能にする。Trace: S-1/S-8、FR-1、NFR-2、BR-01〜07。
- [x] **Step 3: domain unit testsを作る。** 7/5 accept、6/8 reject、duplicate predicate / root、欠損proof、denominator receipt drift、identity field除外を反証する。Trace: S-1/S-8、FR-1、BR-01〜07。
- [x] **Step 4: falling proofとbranch isolationを実装する。** `fixture-proof.ts`へU2専用`ProofProcessPort` / Git portを定義・注入し、baseline target/non-target green、candidate単独適用、target red、non-target同値、direct-parent / no-merge、allowed hunk完全包含、tree / patch / command identityを一括検証する。U3 cell実行portへ結合しない。実Gitはarray argv、closed env/config、repository-contained pathだけを使う。Trace: S-1/S-8、FR-1/FR-2、NFR-2、BR-02〜10。
- [x] **Step 5: proof unit / integration testsを作る。** pure receipt改変とtemporary repositoryの両面でbaseline red、target非red、波及、wrong parent、merge、hunk escape、PATH / config / hook / external diff drift、timeout / signalをfail-closedに固定する。Trace: S-1/S-8、FR-1/FR-2、NFR-2、BR-03/04/08〜10。
- [x] **Step 6: payload manifestと3分類scannerを実装する。** `fixture-scan.ts`でlogical path / hash / lengthをcanonical化し、manifestからだけread / hash / scanし、secret / personal data / external election store全0件かつentry bijection時だけopaque zero-finding receiptをmintする。match content、absolute path、外部URIをreceiptへ残さない。Trace: S-9、FR-2/FR-3、NFR-3、BR-13〜17。
- [x] **Step 7: scanner unit testsを作る。** missing / duplicate / extra entry、hash / length drift、absolute / traversal / symlink / directory、3分類各match、scanner / read / rule identity failure、receipt leakageを反証する。Trace: S-9、NFR-2/NFR-3、BR-13〜17。
- [x] **Step 8: seal / reveal / materialize / promotionのpure policyを実装する。** `fixture-registry.ts`でproof / branch / scan bindingを再検証してseal draftを作る。U2 promotion adapterはU1 `FoldedLedger.events/head`からT/S freeze event IDsとskeleton pass IDを再検証し、Coordinatorから別途渡されたclosed D-COUNTとsingle-use nonceを同じopaque permission inputへbindする。既存`promotionPermission()`のstate/headだけでは許可しない。arm / worktree / destination、#1252先行順、closed D-COUNT / canonical alias順を検査し、promotion時機・採否は決めない。Trace: S-4/S-6/S-8、FR-2/FR-3、NFR-2/NFR-3、BR-11/12/18〜23。
- [x] **Step 9: policy unit testsを作る。** freeze前、別arm / worktree、unknown fixture、#1252以外先行、skeleton前残件、grant replay / destination drift、両freeze / permission / count / identity欠損を反証する。Trace: S-4/S-6/S-8、FR-3、BR-18〜23。
- [x] **Step 10: durable transaction storeとcapacity lifecycleを実装する。** `fs-fixture-registry.ts`でowner recordをstagingへdurable化してからlockをatomic publishし、physical reservation `ACTIVE→CLOSED|ABORTED→RELEASED`、content-addressed seal、arm-fixture disclosure、permission-nonce promotionをsame-filesystem successorへcommitする。live / malformed ownerは奪取せず、verified-deadだけquarantineする。Trace: S-1/S-4/S-6/S-8、FR-1〜3、NFR-2/NFR-3、BR-11/20〜22。
- [x] **Step 11: store / capacity crash integration testsを作る。** write / flush / directory sync / rename / ack、response loss、same-ID different bytes、event/grant片側、staging / backing orphan、concurrent claim、live / malformed / stale owner、close / abort / release境界をtemporary filesystemで検証する。Trace: S-4/S-6/S-8、NFR-2、BR-11/20〜22。
- [x] **Step 12: disclosure materializationとsandbox capabilityを統合検証する。** sealed root / Registry metadata / 他arm pathをallowlist外にし、commit済みevent + grantだけからnonexistent destinationへatomic materializeし、exact retryだけを回復する。platform sandbox capabilityが成立しなければarm起動を許可しない。Trace: S-4/S-9、FR-3、NFR-2/NFR-3、BR-12/17〜20。
- [x] **Step 13: test-only E2E lifecycleを作る。** synthetic 7件と根拠ある5件をclosed proof→scan→seal→T #1252 reveal→skeleton pass→両freeze→remaining disclosure→promotion-readyまで通し、6件・未承認promotion・fixture leakage時の後続transaction 0件を検証する。Iteration 4でtrusted-root seamの同一module direct-import反例が成立したため、E-FVEU2CGR5の6-0裁定によりU2 storeはdeny-allで閉じ、positive production promotion、nonce retry、promotion indexはU8 final-root integrationへ延期した。raw production fixtureやfinal CLIは作らない。Trace: S-1/S-4/S-6/S-8/S-9、FR-1〜3、NFR-2/NFR-3、BR-01〜23。
- [x] **Step 14: exportと依存境界を確定する。** `index.ts`へU2 public types / ports / receiptsだけを追加し、arm adapter、evaluator、report、network、database、credential、external store import 0件をscanする。Trace: S-8/S-9、FR-3、NFR-3、BR-12/17/23。
- [x] **Step 15: Comprehensive verificationとsensorを実行する。** U2 focused、formal-verif全回帰、tier runner、typecheck、lint、check、dist、禁止依存 / 禁止領域diffを実行し、linter / type-check sensorを全変更TSへ発火する。Trace: 全scenario / requirement / rule。
- [x] **Step 16: code-summaryを実測で作る。** 変更ファイル、実測LOC、test / assertion、sensor fire ID、plan deviation、既存dirtyのUnit帰属を記録し、独立architecture reviewへ渡す。Trace: S-8、FR-1〜3、NFR-2/NFR-3。

## LOC再評価と承認前hard stop

Units Generationは本Unitをsource + test + config合計250〜380 LOCと見積もった。しかし、閉包済みU3の実測は同等の初期見積り260〜400に対してproductionだけで783 LOCであり、U2はさらにproof / scan / disclosure / promotion / reservationの異なるsuccessor lifecycleを持つ。U3 private storeを共通化する案は他Unit越境となる。

既存public seamを最大限reuseし、責務を欠落させない物理LOC forecastは次のとおりである。

| 区分 | Forecast |
| --- | ---: |
| production (`scripts/formal-verif/`) | 850〜1,080 LOC |
| tests / support | 600〜820 LOC |
| config / dependency | 0 LOC |
| 合計 | 1,450〜1,900 LOC |

したがって250〜380 LOCのまま実装開始しない。推奨は、Unit境界・責務・依存方向を変えずproduction上限1,100 LOCへ再承認し、testsはComprehensive要件を満たす反証数で管理する案である。1,100 LOCへ到達した場合は圧縮やfinding隠蔽をせず停止し、再分割または設計境界を再裁定する。

## 検証commands

```sh
bun test tests/unit/t-formal-verif-fixture-domain.test.ts tests/unit/t-formal-verif-fixture-proof.test.ts tests/unit/t-formal-verif-fixture-scan.test.ts tests/unit/t-formal-verif-fixture-registry.test.ts
bun test tests/integration/t-formal-verif-fixture-store.integration.test.ts tests/integration/t-formal-verif-fixture-proof.integration.test.ts
bun test tests/e2e/t-formal-verif-sealed-fixture-registry.test.ts
bun test tests/unit/t-formal-verif-*.test.ts tests/integration/t-formal-verif-*.test.ts tests/e2e/t-formal-verif-*.test.ts
bun tests/run-tests.ts --unit --filter 't-formal-verif-'
bun tests/run-tests.ts --integration --filter 't-formal-verif-'
bun tests/run-tests.ts --e2e --filter 't-formal-verif-'
bun run typecheck
bun run lint:check
bun run check
bun run dist:check
git diff --exit-code -- packages/framework packages/setup dist package.json bun.lock
```

禁止依存scanは`arm-(tla|ts)|eligibility|pareto|report-render|node:(http|https)|fetch\(|credential|external-election`をU2 production対象へ実行し、0件時の`rg` exit 1を成功として扱う。

## Closure

- E-FVEU2CGR6はIteration 5 READYをchoice 1=6-0 / GoA 6-0で受理した。旧findingは全件CLOSED、新findingは0件である。
- E-FVEU2CGS13は§13を追加なし・persistなし=6-0 / GoA 6-0で閉じた。surfaceは`memory_entries_total=0`、`candidates=[]`、`parked_open_questions=[]`である。
- 最終実測はproduction 1,048 / recorded上限1,500 LOC、test/support 753 LOC、focused 63/0/197、formal 394/0/753、tier 269/92/33、linter/type-check sensor 8/8 PASSである。
