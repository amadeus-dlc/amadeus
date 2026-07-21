# Code Summary — sealed-fixture-registry

## 実装結果

E-FVEU2CGP1で承認されたplan（承認時SHA-256: `9a7a1ee9b5c49b10a3283c9347d3d5acb59a9c0f08cb6fe6e50d3f5e1106e051`）の16 Steps、E-FVEU2CGR1で承認されたIteration 1のCritical 2件/Major 5件、E-FVEU2CGR2で承認されたIteration 2のCritical 1件/Major 1件、E-FVEU2CGR3で承認されたIteration 3のCritical 1件、E-FVEU2CGR5で再裁定されたIteration 4のCritical 1件の是正を、U2 `sealed-fixture-registry`境界内で完了した。productionは`index.ts`全体を含め1,048物理LOCで、recorded上限1,500 LOC以内である。

| 区分 | ファイル | 内容 |
| --- | --- | --- |
| domain | `scripts/formal-verif/fixture-registry-domain.ts` | strict closed schema、7/5 universe、total root mapping、canonical identity |
| proof | `scripts/formal-verif/fixture-proof.ts` | U2専用`ProofProcessPort`、closed Git、実baseline/injected tree、parent/hunk binding、verified proof issuance |
| scan | `scripts/formal-verif/fixture-scan.ts` | manifest bijection、64 KiB bounded one-pass hash/scan、30秒absolute deadline、3分類zero-finding receipt |
| policy | `scripts/formal-verif/fixture-registry.ts` | immutable seal、freeze-bound disclosure、ledger refold、permission binding、canonical promotion manifest |
| store | `scripts/formal-verif/fs-fixture-registry.ts` | native `#private` deny-all promotion authority、durable owner lock、固定1,258,291,200-byte capacity、atomic seal/disclosure/materialization、promotion前の全binding再検証、crash recovery |
| export | `scripts/formal-verif/index.ts` | U2 public surfaceの追加 |

U3 private store/portの共通化は行わず、U2専用portとsuccessor lifecycleを実装した。promotion permissionではU1 `FoldedLedger.events/head`を再fold・再検証し、closed D-COUNTとsingle-use UUID nonceを同じ能力へ結合した。Iteration 4で、production/testingのCoordinator composition factory 2件を削除し、authority membershipをnative `#issuedPromotionPermissions`へ移した。repo内に`.add`経路はなく、direct construction、test factory、別instance、barrel/direct module、手組み・再hash、同名public `WeakSet` shadowの全経路はdeny-allである。U2ではpromotion-ready状態までを閉じ、実際のproduction promotion、nonce retry、promotion indexのpositive E2EはE-FVEU2CGR5のrecorded裁定によりU8 final-root integrationへ延期した。proofとscan receiptもproduction moduleが発行したobjectだけを受理し、構造的な手書き・spread偽造をfail-closedにした。

## Test Coverage

追加したtestは計画どおりUnit 4ファイル、Integration 2ファイル、E2E 1ファイル、support 1ファイルで、Iteration 1〜4固定回帰を含め合計753物理LOCである。

- U2 Unit focused: **43 pass / 0 fail / 74 expects / 4 files**
- U2 Integration focused: **17 pass / 0 fail / 74 expects / 2 files**（store **16/70** + proof **1/4**）
- U2 E2E focused: **3 pass / 0 fail / 49 expects / 1 file**
- U2 focused合計: **63 pass / 0 fail / 197 expects / 7 files**
- 全formal-verif regression: **394 pass / 0 fail / 753 expects / 26 files**
- tier runner: Unit **16 files / 269 assertions**、Integration **7 files / 92 assertions**、E2E **3 files / 33 assertions**、すべてPASS
- `bun run typecheck`: PASS
- `bun run lint:check`: PASS（advisory complexity warningのみ）
- `bun run check`: PASS
- `bun run dist:check`: 6 harness PASS

主な反証は、6/8件または不完全な5-root mapping、偽造proof/scan receipt、baseline red/target非red/non-target波及、wrong parent/merge/hunk escape、manifest欠損・重複・余剰、3分類match、freeze/arm/worktree/destination drift、#1252順序違反、D-COUNT/nonce/ledger drift、live/malformed lock、capacity lifecycle違反、response lossとcrash window、未承認promotionである。

## Sensor証跡

2026-07-21T06:07Z〜06:08Zに当初の全14変更TSへlinter/type-check sensorを発火し、28件すべてPASSした。Iteration 2是正で再変更した7 TSは2026-07-21T06:34:07Z〜06:34:21Z、Iteration 3是正で再変更した7 TSは2026-07-21T07:11:56Z〜07:12:10Zに再発火し、各14件すべてPASSした。e2の同一C1 spot-checkで見つかったpure generator迂回の是正後、変更4 TSを2026-07-21T07:20:43Z〜07:20:51Zに再発火し、8件すべてPASSした。Iteration 4是正後の最終変更4 TSは2026-07-21T08:30:16Z〜08:30:20Zに再発火し、8件すべてPASSした。各fileの最新証跡は後掲の最終再発火表を正本とする。

| 出力 | linter | type-check |
| --- | --- | --- |
| `fixture-registry-domain.ts` | `95d34279` | `fb4a9cdd` |
| `fixture-proof.ts` | `0b4dbffe` | `b00491fd` |
| `fixture-scan.ts` | `72d1fe6b` | `5243ee62` |
| `fixture-registry.ts` | `12171307` | `772096a5` |
| `fs-fixture-registry.ts` | `bab707b4` | `f3ebd495` |
| `index.ts` | `97ab81f0` | `6b688b00` |
| `t-formal-verif-fixture-domain.test.ts` | `2d2bd255` | `2232704e` |
| `t-formal-verif-fixture-proof.test.ts` | `9a745527` | `afdf359d` |
| `t-formal-verif-fixture-scan.test.ts` | `952bcfe1` | `0b8537b6` |
| `t-formal-verif-fixture-registry.test.ts` | `afda2d4d` | `cd697657` |
| `t-formal-verif-fixture-store.integration.test.ts` | `d482d19c` | `db38e635` |
| `t-formal-verif-fixture-proof.integration.test.ts` | `400cdee8` | `af324708` |
| `t-formal-verif-sealed-fixture-registry.test.ts` | `2482c836` | `df7ee73e` |
| `sealed-fixture-registry-harness.ts` | `619ee204` | `c4070bbc` |

`answer-evidence`はcode-generationで新規・変更した`*-questions.md`がないため非該当である。

### Iteration 2是正後の再発火

| 出力 | linter | type-check |
| --- | --- | --- |
| `fixture-registry-domain.ts` | `9207905f` | `5129723e` |
| `fixture-registry.ts` | `ee35be5e` | `817a49ce` |
| `index.ts` | `5965158c` | `e18ef885` |
| `t-formal-verif-fixture-domain.test.ts` | `3822c68f` | `e12e863e` |
| `t-formal-verif-fixture-registry.test.ts` | `6ea4cdf2` | `fdb5671a` |
| `t-formal-verif-fixture-store.integration.test.ts` | `921709e3` | `0d9b5e6d` |
| `t-formal-verif-sealed-fixture-registry.test.ts` | `58bc39de` | `4defe9e7` |

### Iteration 3是正後の再発火

| 出力 | linter | type-check |
| --- | --- | --- |
| `fixture-registry.ts` | `6f6c7649` | `1d5fb63a` |
| `fs-fixture-registry.ts` | `6f5e8b39` | `98e78c63` |
| `index.ts` | `de73f664` | `2a20c7c4` |
| `t-formal-verif-fixture-registry.test.ts` | `6d5aad93` | `37899921` |
| `t-formal-verif-fixture-store.integration.test.ts` | `bfa65f0b` | `810b34fc` |
| `t-formal-verif-sealed-fixture-registry.test.ts` | `ebe1c206` | `07b5fd26` |
| `sealed-fixture-registry-harness.ts` | `eaa106e1` | `7f1461b6` |

### Iteration 4是正後の最終再発火

| 出力 | linter | type-check |
| --- | --- | --- |
| `fs-fixture-registry.ts` | `f02f597a` | `9b40f831` |
| `sealed-fixture-registry-harness.ts` | `c8ed3c0e` | `d4a89334` |
| `t-formal-verif-fixture-store.integration.test.ts` | `3d9aa6b6` | `4e5352c2` |
| `t-formal-verif-sealed-fixture-registry.test.ts` | `7b3c5935` | `e6660ef6` |

## 境界確認と計画差分

- production実測は1,048 LOCで、E-FVEU2CGR5が維持した上限1,500 LOC以内である。承認済み責務、Unit境界、依存方向、test strategyの削減はない。plan Step 13のpositive promotion E2Eだけは、成立不能なtrusted-root境界を6名で再裁定したE-FVEU2CGR5によりU8 final-rootへ延期した。
- 禁止依存scan（arm adapter、eligibility/Pareto、report、network、credential、external election store）は0件。
- `packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`の境界差分は0件。dependency、test configuration、framework、setup、dist、lockfileを変更していない。
- `tsconfig.json`とU1/U3の既存dirty差分は本U2着手前から存在し、U2では変更していない。state/auditの更新はorchestrator/sensor経由であり、手編集していない。
- Biomeの既存advisory complexity warningは残るが、linter/sensorはPASSである。上限内で承認済み責務を閉じるための分割を新たに発明していない。
- 実装・検証上の未解決blockerはない。commit/mergeはrecorded禁止事項に従い実施していない。

## 独立reviewへの引継ぎ

独立architecture reviewerには、承認済みplanとE-FVEU2CGR5、U2 production/test/support全差分、closed 7/5 universe、verified proof/scan issuance、U1 ledger refold、native `#private` deny-all authority、D-COUNT/nonce binding、lock/capacity/crash反証、上記検証とsensor証跡を渡す。Iteration 5結果が出るまでは自己閉包せず、追加実装・次Unit・次stageへ進まない。

## Review — Iteration 1

- **Verdict:** REVISE
- **Counts:** Critical 2 / Major 5 / Minor 0
- **GoA:** No-Go。Critical / Majorの反証を閉じ、focused negative testsを追加してから再reviewする。
- **Reviewed at:** 2026-07-21T05:07:04Z

### Findings

1. **Critical — 開示順序とfreeze認可がcaller入力だけで迂回できる。** `scripts/formal-verif/fixture-registry.ts:122` の公開authorizerは`riskFirstAlias`と`priorFixtureAliases`をcallerから受け、`scripts/formal-verif/fixture-registry.ts:141`でその申告を正本としている。さらに`FsFixtureRegistry.publishDisclosure`は`authorizationIdentity`を公開canonical hashで再計算するだけで、ledger eventやauthorizer発行能力を検証しない（`scripts/formal-verif/fs-fixture-registry.ts:142`）。反例として、2件目fixture自身を`riskFirstAlias`に指定すると`authorizeDisclosure`が成功し、存在しない`frozenEventId`を持つ手組みauthorizationも`publishDisclosure`が成功した。期待値は#1252 aliasをRegistryの閉じたpolicyとして固定し、prior disclosuresをdurable eventから導出し、ledgerに存在する同arm freezeへ結合された発行不能なauthorizationだけをstoreが受理すること。推奨はcaller申告の順序情報をAPIから除き、ledger + durable disclosure stateをlock内で再検証するopaque/issued capabilityに置き換えること。
2. **Critical — storeがproof/scan発行経路を通らない偽造sealを受理する。** `createSealedFixture`はissued proof/receiptを検査する一方、`scripts/formal-verif/fs-fixture-registry.ts:134` の`publishSeal`は公開canonical hashとpayload identityだけを再計算する。既存fixtureの`proofIdentity`を`ff…ff`へ変え、公開関数で`sealIdentity`を再計算した入力がpublish成功し、そのsealを含むpromotionも成功した。期待値はproduction runner/scannerが発行しbranch/proof/manifest/scanを再検証したsealだけをdurable化できること。推奨は`SealedFixture`をunforgeable issued capabilityにするか、publish時にuniverse、row、proof、branch、manifest、scan receiptを再検証してsealをstore内部で生成すること。
3. **Major — materializerがcommit済みevent側のidentity/linkageを再検証しない。** `scripts/formal-verif/fs-fixture-registry.ts:145` はgrant identityだけでpairを探索し、`scripts/formal-verif/fs-fixture-registry.ts:148` は`grant.eventId === event.eventId`しか検査しない。保存済みeventの`arm`を`tla`から`ts`へ、`frozenEventId`を任意値へ改変してもmaterializationが成功した。期待値はevent identityを本文から再計算し、event/grantのarm、fixture、freeze、seal、disclosure hash、grant identityを双方向に一致させ、片側改変をfail closedにすること。推奨はclosed schema validatorとevent/grant cross-link verifierをmaterialization前に必須化すること。
4. **Major — promotionがdurable disclosure集合と順序を検証しない。** `scripts/formal-verif/fs-fixture-registry.ts:152` の`promote`はsealの存在とpermission/manifestだけを確認し、arm-fixture disclosure pair、#1252先行、全identity chainをrevision indexから照合しない。反例ではdisclosureを1件もpublishせず、両freeze/skeletonを表すledgerとpermissionだけでpromotionが成功した。期待値はclosed D-COUNTのseal/proof/branch/manifest/scan identityと、必要な10/14 disclosure pairおよび順序がdurable stateに揃う場合だけpromotionすること。推奨はlock内でrevision indexを再構成し、ledger・permission・全successorのidentity chainを照合すること。
5. **Major — capacity reservationが必要量とphysical backingの継続整合を強制しない。** `scripts/formal-verif/fs-fixture-registry.ts:110` の`reserveCapacity`は任意の正整数を受理し、design所定の`7×16 MiB + 64 MiB + 1 GiB`を要求せず、claimへbacking hashも結合しない。さらに`requireActive`（同:109）はclaim identityとterminal/released markerだけを確認する。反例では1,024 bytesの過小claimが成功し、そのbackingを0 bytesへtruncateした後も`publishSeal`が成功した。期待値は所定worst-case量を物理予約し、ACTIVE claimのbacking hash/lengthが維持される場合だけseal/disclosure/promotionを開始すること。推奨は必要量を内部定数から導出し、claim identityへbacking length/hashを含め、各使用時にregular-file性とexact bindingを再検証すること。
6. **Major — falling proofのbaseline treeが実Git treeへbindされていない。** `scripts/formal-verif/fixture-proof.ts:131` は`baselineTree`へ`row.baselineSha`（commit SHA）を代入し、`GitBranchInspection`もbaseline tree hashを返さない。結果としてproofは設計が要求するbaseline/resulting tree hashの相互参照を証明できない。期待値はclosed Git inspectionがbaseline commitのtree hashを採取し、proof identityへ結合すること。推奨はinspection contractへ`baselineTreeHash`を追加し、Gitで取得した値だけをproofへ格納してbranch/proof双方で再検証すること。
7. **Major — payload scanが承認済みstream/bounded-memory設計を実装していない。** `scripts/formal-verif/fixture-scan.ts:84` は各entryを`readFileSync`で全量heapへ読み、`scripts/formal-verif/fixture-scan.ts:117`で全bytesをscannerへ渡す。これは各entryを一度だけchunk streamでhash/scannerへfan-outするNFRと`ManifestStreamPipeline`境界を満たさず、最大16 MiB entryを全量保持する。期待値は同じbounded chunkをSHA-256と3分類scannerへ一度だけ供給し、read byte countをpayload bytes以下に保つこと。推奨はscanner portをchunk/stream入力へ変更し、deadlineとbyte-countを含む境界テストを追加すること。

### Prior plan sanity closure

Iteration 0で指摘したU3 ProcessPort依存とU1 `promotionPermission()`単独信頼は、承認plan SHA-256 `9a7a1ee9b5c49b10a3283c9347d3d5acb59a9c0f08cb6fe6e50d3f5e1106e051`において、U2専用`ProofProcessPort`とU1 ledger events/headの再foldへ修正済みであり、今回実装にも反映されている。この2点はclosureとする。production 760 LOCはrecorded上限1,100 LOC以内で、Unit越境は認めなかった。

### Validation

- focused suite: 52 pass / 0 fail / 163 expects / 7 files
- adversarial probe: caller指定risk-first aliasで2件目fixtureのauthorizationが成功（期待はreject）
- adversarial probe: 存在しないfreeze eventを持つ手組みauthorizationのpublishが成功（期待はreject）
- adversarial probe: proof identityを改変して再hashしたsealのpublishと、そのsealを含むpromotionが成功（期待はreject）
- adversarial probe: persisted eventのarm/freeze改変後もmaterializationが成功（期待はreject）
- adversarial probe: disclosure 0件のままpromotionが成功（期待はreject）
- adversarial probe: 1,024 bytesの過小reservationを受理し、ACTIVE backingを0 bytesへtruncate後もseal publishが成功（期待はいずれもreject）
- production LOC: 760（上限1,100以内）

## E-FVEU2CGR1 — Iteration 1是正結果

E-FVEU2CGR1のrecorded契約に従い、Iteration 1のCritical 2件、Major 5件を同一U2内で反例先行により是正した。旧findingを非表示化せず、上記Iteration 1 recordを一次証跡として維持する。

| ID | 判定 | 是正内容 | 固定回帰 |
| --- | --- | --- | --- |
| C1 | CLOSED | caller指定のrisk-first/prior historyをAPIから除去し、`fx-1252`、durable disclosure履歴、ledger state/freeze、issued authorizationをstore lock内で再検証 | callerによるrisk-first再定義、存在しないfreezeを再hashしたauthorizationをreject |
| C2 | CLOSED | storeがfull `FixtureSealInput`を受け、issued proof、実branch tree、manifest、issued scan receipt、payloadを再検証してlock内でsealを生成 | proof identityを改変したrehashed sealをreject |
| M1 | CLOSED | event/grantをclosed schemaでparseし、双方のcanonical identity、arm/freeze/fixture/seal/worktree、event/grant IDを双方向照合 | persisted eventのarm/freeze改変と片側欠損をmaterialization前にreject |
| M2 | CLOSED | durable seal indexと両armの10/14 disclosure pairを再構成し、exact D-COUNT、alias集合、ordinal、T ordinal 0の`fx-1252`、permission/ledger chainを検証 | disclosure 0件、集合欠損、順序・identity driftをpromotion前にreject |
| M3 | CLOSED | 必要量を`7×16 MiB + 64 MiB + 1 GiB = 1,258,291,200 bytes`へ固定し、claimへbacking length/hashを結合。regular-file/no-symlink、inode、length、hash、revision/baselineをseal/disclosure/materialization/promotionで再検証 | caller指定1 byte reservationとACTIVE backing truncateをreject。test capacity factoryはpublic indexへexportしない |
| M4 | CLOSED | `GitBranchInspection.baselineTreeHash`へ実`baseline^{tree}`を格納し、branch identity、falling proof、seal cross-linkへ結合 | SHA-256 temporary Gitでcommit SHAではなく実baseline tree SHAとのexact equalityを検証 |
| M5 | CLOSED | 64 KiB以下の`AsyncIterable` chunkを1回だけread/hash/scannerへfan-outし、scanner full-drain、pre/post stat、30秒fixture absolute deadlineとAbortSignal、read/scanned bytesとdurationをreceiptへ結合 | 64 KiB+17 bytesのbounded stream、early return、exact deadlineを固定し、全量heap read APIを除去 |

### 是正後の検証

- U2 focused: **61 pass / 0 fail / 193 expects / 7 files**
- 全formal-verif: **392 pass / 0 fail / 749 expects / 26 files**
- tier runner: **26 files / 392 assertions / 0 fail**（Unit 267、Integration 92、E2E 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- linter/type-check sensors: **全14変更TS × 2 = 28件PASS**。paired fire IDは上記Sensor証跡の表に記録した
- production: **1,045 / 1,500 LOC**、test/support: **744 LOC**
- 禁止領域・依存・scope差分: **0件**。`packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`を変更していない

### Iteration 2 reviewへの引継ぎ

独立reviewerには、上記7 closure、各RED→GREEN反例、全diff、U2 design/plan、最新test/sensor証跡を渡す。実装上の未解決findingとblockerはないが、Iteration 2のREADY判定前にU2を自己閉包せず、追加修正・次Unit・次stageへ進まない。

## Review — Iteration 2

- **Verdict:** REVISE
- **Counts:** Critical 1 / Major 1 / Minor 0
- **GoA:** No-Go。Coordinator専用permissionの発行境界と、5-cluster代表proofのrow結合をfail-closedにして固定negative testを追加してから再reviewする。
- **Reviewed at:** 2026-07-21T06:17:00Z

### Iteration 1 findings closure

| ID | 判定 | 独立確認 |
| --- | --- | --- |
| C1 | CLOSED | `authorizeDisclosure`からcaller指定historyを除去し、issued authorization、固定`fx-1252`、durable prior、freeze/ledgerを再検証する。固定probeはcaller risk-first再定義と再hash forged freezeをrejectした。 |
| C2 | CLOSED | `publishSeal`はfull inputからissued proof、branch、manifest、issued scan receipt、payloadを再検証してstore内でsealを生成する。rehashed forged proof probeをrejectした。 |
| M1 | CLOSED | persisted event/grantをclosed parseし、canonical identityとarm/freeze/fixture/seal/worktreeを双方向照合する。arm/freeze tamperと片側欠損をrejectした。 |
| M2 | CLOSED | promotion前にdurable seal集合、両armの10/14 pair、ordinal、T ordinal 0の`fx-1252`、permission chainを再構成する。disclosure 0件をrejectした。 |
| M3 | CLOSED | production capacityを1,258,291,200 bytesへ固定し、regular file/inode/length/hashを各使用時に再検証する。過小予約とtruncate後sealをrejectした。 |
| M4 | CLOSED | 実Git `baseline^{tree}`を`baselineTreeHash`、branch identity、proof、sealへ結合した。temporary Git integrationがcommit SHAとtree SHAの区別を固定した。 |
| M5 | CLOSED | 64 KiB以下のsingle-pass stream、full drain、pre/post stat、30秒absolute deadline、read/scanned bytesをreceiptへ結合した。bounded/early-return/deadline probesがPASSした。 |

### Findings

1. **Critical — `ManifestPromotionPermission`を任意callerがmintでき、Coordinator専用の発行境界が存在しない。** `scripts/formal-verif/fixture-registry.ts:95` はpermission identity生成関数を公開し、同`:160-170`のvalidatorはclosed schema、ledger、freeze、skeleton、D-COUNT、nonce、自己計算hashだけを確認する。issued capability、Coordinator署名、private issuer portのいずれも検査しない。実際に`tests/unit/t-formal-verif-fixture-registry.test.ts:6-16`は通常callerがbodyとUUIDを組み立てて公開関数でhashしたpermissionをacceptedにしている。独立probeでも同じ方法で未発行のnonce `11111111-1111-4111-8111-111111111111`を作ると`{"callerMintedPermissionAccepted":true}`を再現した。これは`domain-entities.md:57`の「Coordinatorだけがmintするopaque single-use value」と`business-logic-model.md:37`の未承認promotion拒否に反する。**期待値:** Coordinator専用issuer/portが発行した表現不能または検証可能なcapabilityだけを受理し、同じ全fieldと再計算hashを持つcaller手組みpermissionをpromotion前にrejectする固定negative testを追加する。
2. **Major — 5-clusterの`representativeProofs`が同clusterの実row proofへ結合されていない。** `scripts/formal-verif/fixture-registry-domain.ts:141-144`は5つのcluster名とproof hashの個数・一意性だけを検査し、各`proofIdentity`が同じ`rootCluster`のrowに存在することを確認しない。既存positive fixture `tests/unit/t-formal-verif-fixture-domain.test.ts:24-56`もrowと無関係な5 SHAを代表proofとして渡してGREENになる。独立probeでは、全row proofと一致しない`8/9/a/b/c`の64桁SHAを各R1〜R5へ割り当てても`{"unrelatedRepresentativeProofsAccepted":true,"allRepresentativeProofsMatchRow":false}`を再現した。これは`domain-entities.md:31`の各cluster representative proof再検証契約を証拠上空洞化する。seal時の各選択row proof再検証は残るため即時の偽sealではないが、5への縮約receiptが主張する代表proofを保証しない。**期待値:** 各representative proofを同clusterに属する正準rowの`proofIdentity`へbijectionで結合し、unrelated SHA、別cluster proof、重複row representativeをrejectする固定negative testを追加する。

### Validation

- U2 focused: **61 pass / 0 fail / 193 expects / 7 files**
- 全formal-verif direct: **392 pass / 0 fail / 749 expects / 26 files**
- tier runner: **26 files / 392 assertions / 0 fail**（Unit 16 files / 267 assertions、Integration 7 / 92、E2E 3 / 33）
- `bun run typecheck`: PASS
- `bun run lint:check`: exit 0（既存advisory complexity warningのみ、fixなし）
- `bun run check`: PASS（同advisory warningのみ）
- `bun run dist:check`: 6 harnessすべてPASS
- sensor: code-summary記載の14変更TS×linter/type-checkの全28 fire IDについてaudit上の`SENSOR_PASSED`を確認
- production: **1,045 / 1,500 LOC**、test/support: **744 LOC**
- 禁止領域差分: `packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`へのU2差分なし

## E-FVEU2CGR2 — Iteration 2是正結果

6名全会一致のrecorded契約に従い、Iteration 2のCritical 1件/Major 1件を同一U2内でtest-first是正した。Iteration 2のREVISE recordを上に維持し、findingを非表示化していない。

| ID | 判定 | 是正内容 | 固定回帰・独立確認 |
| --- | --- | --- | --- |
| I2-C1 | CLOSED | `CoordinatorPromotionPermissionIssuer.issue`がrefold済ledgerからstate/head、T/S freeze、skeleton、D-COUNT/universeを内部導出し、発行permissionを`Object.freeze`してmodule-private `WeakSet`へ登録する。validatorはissued objectを最初に必須化し、identity mint helperをprivate化した。issuerはgeneral `index.ts`から公開しない | valid fields、UUID nonce、canonical identityをcallerが再計算した未発行permissionをreject。REDは10 pass/1 fail、GREENはunit/store/E2E 30 pass/0 fail/134 expects。e2独立spot-check CLOSED、追加finding 0 |
| I2-M1 | CLOSED | 各5-cluster representative proofを、同じ`rootCluster`かつ同じ`proofIdentity`を持つrow exactly oneへ結合する。既存のcluster/proof一意性とrow proof一意性を合わせてbijectionを閉じた | 同clusterの全rowと無関係なproof identityをreject。REDは7 pass/1 fail、GREENは8 pass/0 fail/14 expects。e2独立spot-check CLOSED、追加finding 0 |

### 是正後の最終検証

- U2 focused: **63 pass / 0 fail / 196 expects / 7 files**
- 全formal-verif: **394 pass / 0 fail / 752 expects / 26 files**
- tier runner: **26 files / 394 assertions / 0 fail**（Unit 16 files / 269 assertions、Integration 7 / 92、E2E 3 / 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS（既存advisory complexity warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- Iteration 2で再変更した7 TSのlinter/type-check sensor: **14件PASS**。最新paired fire IDは上記再発火表に記録した
- production: **1,068 / 1,500 LOC**、test/support: **762 LOC**
- 禁止領域・依存・scope差分: **0件**。`packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`を変更していない

### Iteration 3 reviewへの引継ぎ

I2-C1/I2-M1のRED→GREEN、e2独立spot-check、全diff、U2 design/plan、最新test/sensor証跡を独立reviewerへ渡す。ここからproduction/test/supportを凍結し、Iteration 3のREADY/REVISE判定前に追加修正・次Unit・次stageへ進まない。

## Review — Iteration 3

- **Verdict:** REVISE
- **Counts:** Critical 1 / Major 0 / Minor 0
- **GoA:** No-Go。I2-C1のCoordinator専用発行境界が依然として任意callerへ公開されているため、発行能力を閉じたproduction boundaryへ移し、direct-import反例を固定negative testで拒否してから再reviewする。
- **Reviewed at:** 2026-07-21T06:43:22Z

### Iteration 2 findings closure

| ID | 判定 | 独立確認 |
| --- | --- | --- |
| I2-C1 | OPEN | 手組みpermissionの再計算hashはrejectするようになったが、`scripts/formal-verif/fixture-registry.ts:103`の`createCoordinatorPromotionPermissionIssuer`自体がexportされている。任意callerが同moduleをdirect importし、`:105-116`の`issue`を呼ぶとmodule-private `WeakSet`へ登録済みpermissionを取得でき、`:182-192`のvalidatorにacceptedとなる。barrel `index.ts`から除外しただけでは発行能力の境界にならない。 |
| I2-M1 | CLOSED | `fixture-registry-domain.ts:144`は各representative proofを同一cluster・同一proof identityのrow exactly oneへ結合する。無関係な5 SHAはreject、正準row proofはacceptとなり、5-cluster代表proof契約を満たす。 |

### Finding

1. **Critical — Coordinator専用issuerがdirect import可能で、I2-C1の任意caller mint経路が残る。** `scripts/formal-verif/fixture-registry.ts:103`は`createCoordinatorPromotionPermissionIssuer`をproduction exportし、factory自体にCoordinator identity、private composition capability、署名keyのいずれも要求しない。実際に通常test callerも`tests/unit/t-formal-verif-fixture-registry.test.ts:3,10`から同factoryをdirect importしている。独立probeではbarrel非公開と手組みhash rejectionを確認した同じprocessで、direct module callerがfactoryを取得して任意nonceを発行すると `{"directModuleCallerCanObtainIssuer":true,"directModuleCallerIssuedPermissionAccepted":true}` を再現した。これは`domain-entities.md:57`の「Coordinatorだけがmintするopaque single-use value」、`business-logic-model.md:37`のCoordinator発行permission、plan Step 8のCoordinatorから別途渡されるpermission inputに反する。**期待値:** issuerの取得をCoordinator-owned composition capabilityへ閉じ、通常application/test callerがproduction moduleをdirect importしても発行済みpermissionを作れないことを固定negative testで証明する。general barrelからの除外やfactory名だけを認可境界として扱わない。

### Validation

- freeze summary SHA-256 `8ab5dbd4c82e020d186c48b9baef2ccca29da124cfa554c2ff2a5b7259f351ab`、snapshot UTC `2026-07-21T06:36:38Z`、承認plan SHA-256 `9a7a1ee9b5c49b10a3283c9347d3d5acb59a9c0f08cb6fe6e50d3f5e1106e051`を照合
- U2 focused: **63 pass / 0 fail / 196 expects / 7 files**
- 全formal-verif direct: **394 pass / 0 fail / 752 expects / 26 files**
- tier runner: **26 files / 394 assertions / 0 fail**（Unit 269、Integration 92、E2E 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS（既存advisory warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- Iteration 2で再変更した7 TSのlinter/type-check sensor: 最新14 fire IDすべて`SENSOR_PASSED`
- production: **1,068 / 1,500 LOC**、test/support: **762 LOC**
- 禁止領域差分: `packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`へのU2差分なし。既存`tsconfig.json`差分はU2外
- I2-C1固定manual-negative: caller手組みpermissionはreject。ただしdirect exported factory経路はacceptedとなるためfindingを閉じない
- I2-M1固定negative/positive: unrelated representative proofはreject、same-cluster canonical row proofはaccept

## E-FVEU2CGR3 — Iteration 3是正結果

6名全会一致のrecorded契約に従い、Iteration 3のCritical 1件を同一U2内でtest-first是正した。Iteration 3のREVISE recordを上に維持し、findingを非表示化していない。

| ID | 判定 | 是正内容 | 固定回帰・独立確認 |
| --- | --- | --- | --- |
| I3-C1 | CLOSED | raw issuer factory、permission identity生成、manifest生成をpolicy moduleのproduction exportから除去した。`FixtureRegistryStore`ごとの`WeakSet`と高位`CoordinatorFixtureRegistryPort.promote`を同じcomposition closureへ束縛し、permissionを外へ返さず同一instanceで即時消費する。直接constructしたstoreとtest factoryは独立した空のauthority setを持つためdeny-allとなる。e2初回spot-checkで指摘されたpure manifest generator迂回も、identity/helperをprivate化しmanifest生成をstore内部へ移して閉じた | direct moduleとbarrelのissuer/identity/generator不在、manual rehash、別instance、直接constructed storeを固定negativeでreject。7/5 positive lifecycle、exact retry、drift/empty disclosure拒否を維持。e2再確認はC1 CLOSED、追加finding 0 |

### 是正後の最終検証

- U2 focused: **64 pass / 0 fail / 200 expects / 7 files**（Unit 43/74、Integration 18/77、E2E 3/49）
- 全formal-verif: **395 pass / 0 fail / 756 expects / 26 files**
- tier runner: **26 files / 395 assertions / 0 fail**（Unit 16 files / 269 assertions、Integration 7 / 93、E2E 3 / 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS（既存advisory warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- Iteration 3最終変更4 TSのlinter/type-check sensor: **8件PASS**。最新paired fire IDは上記再発火表に記録した
- production: **1,081 / 1,500 LOC**、test/support: **751 LOC**
- 禁止領域・依存・scope差分: **0件**。`packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`を変更していない

### Iteration 4 reviewへの引継ぎ

I3-C1のRED→GREEN、e2の初回bypass probeと再確認CLOSED、全diff、U2 design/plan、最新test/sensor証跡を独立reviewerへ渡す。ここからproduction/test/supportを凍結し、Iteration 4のREADY/REVISE判定前に追加修正・次Unit・次stageへ進まない。

## Review — Iteration 4

- **Verdict:** REVISE
- **Counts:** Critical 1 / Major 0 / Minor 0
- **GoA:** No-Go。I3-C1のraw issuer非公開化は成立したが、同じproduction moduleが任意callerへCoordinator authorityを返すcomposition factoryを公開しており、direct-import拒否境界を満たさない。authority取得経路を実際のtrusted composition rootへ閉じ、production/test factoryのdirect importを固定negative testで拒否してから再reviewする。
- **Reviewed at:** 2026-07-21T07:41:13Z

### 旧finding closure

| ID | 判定 | 独立確認 |
| --- | --- | --- |
| Iteration 1 C1/C2/M1〜M5 | CLOSED | 既存の各fixed negative probeとfocused/formal/tier再実行を照合し、全件の拒否経路を維持した。 |
| I2-M1 | CLOSED | 5-cluster representative proofは同一clusterの正準row proofへ結合され、unrelated proofをrejectする。 |
| I3-C1 | OPEN | raw issuer/identity/generatorは非公開になったが、`fs-fixture-registry.ts`のexported composition factoryから任意direct importerが同一instanceのCoordinator authorityを取得できる。 |

### Finding

1. **Critical — Coordinator-owned composition capabilityがproduction moduleから任意callerへ公開され、I3-C1のauthority acquisition経路が残る。** `scripts/formal-verif/fs-fixture-registry.ts:337-355`はmodule-private `WeakSet`、registry、`CoordinatorFixtureRegistryPort.promote`を同じclosureへ束縛するが、同`:368-373`はそのcompositionを返す`createCoordinatorFixtureRegistry`と`createCoordinatorFixtureRegistryForTesting`をproduction module exportにしている。factoryにはCoordinator identity、private token、注入済みtrusted rootのいずれも要求されないため、通常application/test callerもdirect importだけで`{ registry, coordinator }`を取得できる。独立probeでは`createCoordinatorFixtureRegistryForTesting`をdirect importし、正準seal/disclosureを準備した任意callerが取得した`coordinator.promote`を呼ぶと`{"ordinaryDirectImporterObtainedCoordinator":true,"promotionSucceeded":true,"promotionsWritten":5,"error":null}`を再現した。既存negative test `tests/integration/t-formal-verif-fixture-store.integration.test.ts:53-63`が検査するのは`fixture-registry.ts`のraw issuer/identity/generatorとbarrel、およびmanual rehashだけで、`fs-fixture-registry.ts`のauthority factory exportを検査しない。これは`domain-entities.md:57`の「Coordinatorだけがmintするopaque single-use value」、`business-logic-model.md:37`のCoordinator発行permission、Iteration 3の「通常application/test callerがproduction moduleをdirect importしても発行済みpermissionを作れない」という期待値に反する。**期待値:** authority-bearing compositionの生成を実際のtrusted Coordinator composition rootに閉じ、通常callerによるproduction factory、testing factory、direct constructor、別instance、manual rehashの全経路をdeny-allにする固定negative testを追加する。factory名や高位portへの包み替えを認可境界として扱わない。

### Validation

- freeze summary SHA-256 `ffce05af735354fa26e34427b7e9f1df334e4277b35db79203793bdefe3c5667`、snapshot UTC `2026-07-21T07:24:36Z`、承認plan SHA-256 `8b2b55042553bd0e1125c8002683c5fbeb037e3081627ed6578b563a0ecb3798`を照合
- U2 14-file frozen aggregateはhandoff値 `ce40e8b368cabc2e0adee48f11e581f89d18038fab9657ab1097d8aae331380f`、freeze中にproduction/test/support変更なし
- U2 focused: **64 pass / 0 fail / 200 expects / 7 files**
- 全formal-verif direct: **395 pass / 0 fail / 756 expects / 26 files**
- tier runner: **26 files / 395 assertions / 0 fail**（Unit 269、Integration 93、E2E 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS（既存advisory complexity warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- 最終変更4 TSのlinter/type-check sensor: **8件PASS**をsummary表とauditの連続`SENSOR_PASSED`で照合
- production: **1,081 / 1,500 LOC**、test/support: **751 LOC**
- 禁止領域差分: `packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`へのU2差分なし。既存`tsconfig.json`差分はU2外
- I3-C1 fixed negativeはraw issuer/identity/generator不在、manual rehash、別instance、direct constructorをrejectするが、exported composition factory direct-import経路はpromotion成功となるためfindingを閉じない

## E-FVEU2CGR5 — Iteration 4是正結果

E-FVEU2CGR4で要求された「factory export 0、U2 positive production promotion E2E維持、U8非越境」を同時に満たすtrusted-root seamは、TypeScript/ESMの同一module direct importerにも権限を渡すため成立しなかった。6名全会一致のE-FVEU2CGR5は、U2をdeny-allで閉じ、実際のpositive production promotionをU8 final-root integrationへ延期するchoice 1をrecordedした。この再裁定と追補条件に従い、Iteration 4のCritical 1件を同一U2内でtest-first是正した。

| ID | 判定 | 是正内容 | 固定回帰・独立確認 |
| --- | --- | --- | --- |
| I4-C1 | CLOSED | `createCoordinatorFixtureRegistry`と`createCoordinatorFixtureRegistryForTesting`をproduction exportから削除し、authority membershipをnative `#issuedPromotionPermissions`へ移した。外部`WeakSet`注入とrepo内`.add`経路は0件で、U2 storeは全instanceでdeny-allとなる | direct store runtime exportを`FsFixtureRegistry`と`createFsFixtureRegistryForTesting`だけへ固定し、barrel/supportのauthority-bearing export 0、runtime ownNames authority 0、同名public `WeakSet` shadow、manual canonical rehash、direct/test storeをすべてreject。durable 7/5 fixture/disclosure完備後もpromotion 0を固定。e2独立sliceはVERIFIED / READY、C/M/m=0/0/0、旧I3-C1 CLOSED、追加bypass 0 |

### RED→GREEN証跡

- RED: `bun test tests/integration/t-formal-verif-fixture-store.integration.test.ts --test-name-pattern 'denies promotion permission minting'`は、direct store export allowlistへCoordinator factory 2件が余剰となり **0 pass / 1 fail / 5 expects**。
- GREEN: 同一commandは **1 pass / 0 fail / 10 expects**。`Object.getOwnPropertyNames(store)`は`root`、`dependencies`、`inject`、`requiredCapacityBytes`だけで、authority fieldは0件。
- U2 integration 2-file aggregateのexact commandは`bun test tests/integration/t-formal-verif-fixture-store.integration.test.ts tests/integration/t-formal-verif-fixture-proof.integration.test.ts`で、store **16 pass / 70 expects**、proof **1 pass / 4 expects**、合計 **17 pass / 0 fail / 74 expects**。初回GREEN通知の「17/74」はこの2-file合計であり、store単体値ではない。
- U2 E2Eは7/5双方でseal、両arm disclosure、materialization、promotion-readyまで進み、manual permissionによるpromotionを拒否してpromotion directory 0を確認する。positive production promotion、nonce retry、promotion indexはU8 final-root integrationで検証する。

### 最終検証

- U2 focused: **63 pass / 0 fail / 197 expects / 7 files**（Unit 43/74、Integration 17/74、E2E 3/49）
- 全formal-verif: **394 pass / 0 fail / 753 expects / 26 files**
- tier runner: **26 files / 394 assertions / 0 fail**（Unit 16 files / 269 assertions、Integration 7 / 92、E2E 3 / 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS（既存advisory complexity warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- Iteration 4最終変更4 TSのlinter/type-check sensor: **8件PASS**。最新paired fire IDは上記最終再発火表に記録した
- production: **1,048 / 1,500 LOC**、test/support: **753 LOC**
- 禁止領域・依存・scope差分: **0件**。`packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`を変更していない

### Iteration 5 reviewへの引継ぎ

I4-C1のRED→GREEN、E-FVEU2CGR5のU8延期境界、e2独立slice、全diff、U2 design/plan、最新test/sensor証跡を独立reviewerへ渡す。ここからproduction/test/support/summaryを凍結し、Iteration 5のREADY/REVISE判定前に追加修正・次Unit・次stageへ進まない。

## Review — Iteration 5

- **Verdict:** READY
- **Counts:** Critical 0 / Major 0 / Minor 0
- **GoA:** PASS。E-FVEU2CGR5で再裁定されたU2 deny-all境界を満たし、positive production promotionはU8 final-rootへ明示延期されている。旧findingは全件CLOSEDで、新規findingはない。
- **Reviewed at:** 2026-07-21T08:38:58Z

### 旧finding closure

| ID | 判定 | 独立確認 |
| --- | --- | --- |
| Iteration 1 C1/C2/M1〜M5 | CLOSED | 既存fixed negative probeとfocused/formal/tier再実行を照合し、proof/disclosure/capacity/lock/promotion indexの拒否経路を維持した。 |
| I2-C1 / I2-M1 | CLOSED | caller手組みpermissionとunrelated representative proofをrejectし、正準row proof bindingを維持した。 |
| I3-C1 | CLOSED | raw issuer、permission identity helper、manifest generatorはdirect module/barrelから取得不能である。 |
| I4-C1 | CLOSED | production/testing Coordinator composition factory 2件はexport 0。store authorityはnative `#issuedPromotionPermissions`に閉じ、外部WeakSet注入とrepo内`.add`経路は0件。direct/test/別instance/manual rehash/public shadowはすべてdeny-allで、durable 7/5 fixture/disclosure完備後もpromotionは0件である。 |

### Findings

なし。

### Validation

- freeze summary SHA-256 `b13c517df9a6ec8c2c9719f85c1bf81de72c465ec89afac99091542fb62a9295`、snapshot UTC `2026-07-21T08:34:56Z`、承認plan SHA-256 `8b2b55042553bd0e1125c8002683c5fbeb037e3081627ed6578b563a0ecb3798`を照合
- U2 production/test/support 14-file frozen manifest aggregateはhandoff値 `b860f30a83b2c2974867afe501121e54ee40c48fd9900ef2a09e4f630fa8e5d8`。14ファイルの個別bytes、export surface、support re-exportをread-onlyで照合
- runtime exportは`FsFixtureRegistry`と`createFsFixtureRegistryForTesting`だけで、barrel/supportにauthority-bearing exportなし。`Object.getOwnPropertyNames`にauthority fieldなし。同名public `WeakSet` shadowを注入してもmanual permissionはexact error `promotion permission was not issued by this Coordinator composition`でrejectされ、promotion countは0
- U2 focused: **63 pass / 0 fail / 197 expects / 7 files**
- U2 integration 2-file: **17 pass / 0 fail / 74 expects**（store 16/70 + proof 1/4）
- 全formal-verif direct: **394 pass / 0 fail / 753 expects / 26 files**
- tier runner: **26 files / 394 assertions / 0 fail**（Unit 269、Integration 92、E2E 33）
- `bun run typecheck`、`bun run lint:check`、`bun run check`: PASS（既存advisory complexity warningのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- Iteration 4最終変更4 TSのlinter/type-check sensorはfire ID `f02f597a` / `9b40f831`、`c8ed3c0e` / `d4a89334`、`3d9aa6b6` / `4e5352c2`、`7b3c5935` / `e6660ef6`の全8件がaudit上で`SENSOR_PASSED`
- production: **1,048 / 1,500 LOC**、test/support: **753 LOC**
- 禁止領域差分: `packages/framework/`、`packages/setup/`、`dist/`、`package.json`、`bun.lock`へのU2差分なし。既存`tsconfig.json`差分はU2外
- E-FVEU2CGR5どおり、U2はpromotion-readyまでを所有し、positive production promotion、nonce retry、promotion indexのE2EはU8 final-rootへ延期。U8実装への越境なし

## U2 Closure

- E-FVEU2CGR6: Iteration 5 READY受理、choice 1=6-0 / GoA 6-0。
- E-FVEU2CGS13: §13追加なし・persistなし、choice 1=6-0 / GoA 6-0。surfaceは`memory_entries_total=0`、`candidates=[]`、`parked_open_questions=[]`。
- U2 `sealed-fixture-registry`は旧finding全CLOSED、新finding0、検証・sensor PASSで閉包した。後続はengine directiveに従い、同じCode Generation stageの残Unitへ進む。
