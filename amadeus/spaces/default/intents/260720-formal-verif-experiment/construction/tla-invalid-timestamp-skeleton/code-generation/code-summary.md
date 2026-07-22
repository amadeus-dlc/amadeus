# Code Summary — tla-invalid-timestamp-skeleton

## 実装結果

U5 `tla-invalid-timestamp-skeleton` の dedicated integration harness を実装した。freeze 済み baseline → Arm T → fixture `#1252` の composition、起動直前 worktree receipt、同一 semantic tuple の local exactly 2 attempts、trusted CI の exactly 2 rows、循環しない execution manifest / CI receipt / summary、U1 terminal outcome transaction、failure 後の stop proof を closed contract として結合する。

production は計画再評価後の3ファイルに分離し、各ファイル750 LOC以下、合計1,500 LOC以下、全function CCN 15以下を満たす。Formal Review Iteration 1の修正後実測は1,449 / 1,500 LOC、tests/supportは968 / 1,100 LOCである。barrel `index.ts` はU1〜U5の必要最小public surfaceを含む105 LOCであり、production capの対象外である。

| 区分 | ファイル | LOC | 内容 |
| --- | --- | ---: | --- |
| contract | `scripts/formal-verif/tla-skeleton-contract.ts` | 373 | issuer-backed precondition、local/CI evidence、provider bytes、manifest、summary、stopの型と検証 |
| outcome | `scripts/formal-verif/tla-skeleton-outcome.ts` | 326 | archive streaming rehash、issued outcome、U1 terminal transaction、response-loss lookup、head整合 |
| coordinator | `scripts/formal-verif/tla-skeleton.ts` | 750 | trusted precondition取得、serial local replay、CI検証、summary/outcome/ledger suffix orchestration |
| export | `scripts/formal-verif/index.ts` | 105 | U5の必要最小 façade / type export |
| unit | `tests/unit/t-formal-verif-tla-skeleton-public-surface.test.ts` | 23 | root command/export boundary |
| integration | `tests/integration/t-formal-verif-tla-skeleton.integration.test.ts` | 472 | composition source、local replay、CI provider trust/bytes、manifest/summary、failure stop |
| integration | `tests/integration/t-formal-verif-tla-skeleton-outcome.integration.test.ts` | 183 | issued outcome、transaction、response-loss、trusted suffix、head conflict |
| support | `tests/formal-verif/support/tla-skeleton-harness.ts` | 271 | U1〜U4 public portを結線するdeterministic harness |
| E2E | `tests/e2e/t-formal-verif-tla-skeleton.test.ts` | 19 | U5 dedicated command surfaceとpass trace |

## 主要な実装判断

- post-disclosureのU1 ledger、`fx-1252` alias、baseline → Arm T → `#1252`順、capacity、tree/HEAD/clean、freeze/seal/model/JAR/JDK/profile/evidence rootをtrusted `SkeletonPreconditionSourcePort`から取得し、module-private `WeakMap`でissued preconditionへ閉じた。callerが組み立てた同形object、copy、別revision向けproofは受理せず、issued valueはrun開始時にconsumeする。
- local attemptはrun number `{1,2}`をserialにだけ発行し、各attemptを起動直前receiptへbindする。両方が`DETECTED`、named invariant `InvalidTimestampRejected`、完全trace、同一semantic tuple、異なるbundle identityを持つ場合だけlocal proofを発行する。
- CI trust rootはtrusted repository、`workflow_dispatch`、baseline workflow blob/ref、run attempt 1、minimal permissions、checkout SHA、success、provider receipt identityへ固定した。archiveはproviderが返すchunk列をstreaming rehashし、実byte length・raw SHA-256・compressed/uncompressed cap、exactly 13 safe entries、link/path/secret/duplicate/case collision 0件、canonical `ci-manifest.json` bytes、local attemptsとの2-row semantic bijectionを要求する。
- execution manifestはlocal proofとexpected CI keysをCI前に固定し、CI receiptとfinal summaryをpreimageへ含めない。identity chainをmanifest → CI receipt → summaryへ一方向化した。
- terminal outcomeはmodule-private `WeakSet`でissuer instanceを追跡し、coordinatorが発行したoutcomeだけをU1へcommitできる。event ledger headとstore headを分離し、`CommitUnknownError`だけをresponse-loss lookup対象にする。head conflict、transport、lookup、corruptionはdomain failureへ変換しない。
- deterministic failureはverified partial evidenceを保持したissued stop receiptへ閉じる。`SkeletonPostFailureSourcePort`がfailure eventとcommitted store headに続くledger suffixを返し、caller申告の`afterEventId`に依存せず、suffix内にArm S start、残fixture reveal、promotion、benchmarkが1件でもあれば拒否する。
- root command surfaceはexactly `prepare`、`run-local`、`verify-ci`、`record-outcome`である。raw CI closer/issuer、Arm S、fan-out、promotion、benchmark、eligibility、reportはexportしない。

## negative-firstで固定した反証

- 最初のGREENは単一production file 1,279 LOC、CCN警告7件だったため機能追加を停止し、既決logical component境界に沿ってcontract / coordinator / outcomeの3ファイルへ分割した。Iteration 1修正後も各750 LOC以下、合計1,449 LOC、CCN > 15は0件である。
- size: smallのunit testが実filesystem/U3 storeへ接続していたため、同じbehavior testをmedium integrationへ移し、unitはpublic-surface contractだけへ限定した。
- complete patch coverageでU5 productionの未到達13行を検出し、open metadata/archive/observation envelope、reseal後のinvalid row、attempt portのthrow、CI portのnon-Error throwをnegative testへ追加した。
- artifact headerがattempt count 2を、row verifierがrun number 1/2の一意性を先に保証するため、到達不能だった重複attempt-key分岐を削除した。
- composition drift、fixture alias drift、attempt 0/3、semantic tuple drift、duplicate bundle、invariant/trace drift、CI trust/permission/checkout drift、archive cap/path/link/secret/duplicate/case collision、identity cycle、二重outcome、response-loss bytes drift、post-failure capability使用を固定回帰にした。
- Formal Review Iteration 1は3 Criticalを報告した。まず異なる`afterEventId`の禁止activity、caller-copy precondition、実byte streamなしのself-signed archiveを同時に追加し、**23 pass / 3 fail / 42 expects**のREDを確認した。
- stop findingはissued failure receiptとtrusted ledger suffix queryへ変更し、異なるanchor、copy receipt、malformed suffix、source transportを反証に固定した。precondition findingはtrusted sourceからmodule-issued capabilityを発行し、copy、別revision、source不通を反証に固定した。CI findingはprovider receiptと実chunkのrehash、canonical manifest bytes bindingを追加し、hash-only forge、bytes/hash同時改変、invalid receipt、non-byte streamを反証に固定した。2 integration filesは**29 pass / 0 fail / 55 expects**へGREEN化した。

## Test Coverage

- U5 focused: **33 pass / 0 fail / 74 expects**（Unit 3、Integration 29、E2E 1、514 ms）
- U5 production focused LCOV: **900 / 900 covered**（contract 21 / 21、outcome 267 / 267、coordinator 612 / 612、`DA:0` 0件）
- 全formal-verif regression 37 files: **531 pass / 0 fail / 1,476 expects**（3.67 s）
- `bun run typecheck`: PASS
- U5 focused Biome: PASS
- `bun run check`: PASS（既存advisory 243 warnings / 17 infosのみ）
- `bun run dist:check`: claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessすべてPASS
- `bun run promote:self:check`: PASS
- `git diff --exit-code -- packages/framework packages/setup dist package.json bun.lock .github`: PASS
- `git diff --check`: PASS
- rebase後fresh CI coverage runner（既定4並列）: **426 files / 6,100 assertions**を3分32.51秒で実行した。failureはU5外の既知2件だけで、U1〜U3 complexity 20 functionsとU1〜U3 test-size 5 filesである。coverage directoryは`/tmp/amadeus-u5-final-ci-coverage.Zl2nI4`である。
- project coverage gate: **76.1400%**、baseline 40.9395%、delta **+35.2005pp**、22,708 / 29,824 statements、PASS
- U5 focused production patch coverage: measurable added **857 / 857 covered**、allowlisted 0、uncovered 0、PASS
- checkpoint以降の全working diff coverage: measurable added **1,219 / 1,219 covered**、allowlisted 0、uncovered 0、PASS
- U5 production complexity: lizard CCN > 15は**0件**
- fresh real TLC: TLC **1.7.4**、exit 0、`NOT_DETECTED`。artifact SHAは`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`、model identityは`dee3d8a63552f041abb0bb8f64d458dd6b230cf6c91cc609ba6c7a9b71970d66`、run identityは`024eb83bb0db80e576943db88eb2bbb9b90f9bdb79fb9e4afa02e07b120a472e`である。

AWS credentialsは期限切れだったため、runner規約に従いlive SDK/substrate checksはskipになった。`t-codex-hooks-migration`のwall-clock driftはadvisoryである。

## dedicated E2E identity trace

fresh harness executionは次のpass draftを生成した。

- local run 1 bundle: `333524...f0dc6`
- local run 2 bundle: `cc64bf...a2ee`
- 両runのcounterexample identity: `f594be...bc51`
- 両runのU4 call order: `acquire → verifyOffline → prepare → run → normalize`
- execution manifest identity: `5ae3dd...ec2e`
- CI receipt identity: `56a023...2539`
- summary identity: `cae009...621a`
- U1 transaction identity: `d61452...485c`
- terminal outcome: `pass`
- response-loss recovery: `false`

2つのbundle identityは異なり、counterexample identityとsemantic tupleは一致した。local 2 attempts → CI 2 rows → pass transactionの順序以外を持たない。

## 最終output hash・Sensor証跡

下表はFormal Review Iteration 1 finding閉包後、Iteration 2開始前snapshotのSHA-256と最新sensor firingである。変更した9 TS出力のlinter/type-check計18件はすべてPASSし、FAILED / BUDGET_OVERRIDE / orphanは0件だった。

| 出力 | SHA-256 | linter | type-check |
| --- | --- | --- | --- |
| `tla-skeleton-contract.ts` | `b23a4be62a1209b020390b7193ab6833a0511e0f61567a92642e3ee855e5e60f` | `948f4b1e` | `0ebe2900` |
| `tla-skeleton-outcome.ts` | `11749393826128612560372c07e3d7f2b83864375adbba0f4e96b137bdcb7821` | `66acf304` | `0163dbfc` |
| `tla-skeleton.ts` | `775365c8069f1b706ce62238d7b13a814dae27efcf0e2d0fd90924e2c4b4f5dc` | `2a41fd72` | `ebb50573` |
| `index.ts` | `882147bc393fd1871b241f1e6960e9f12e70f34235f0360d74240d6ab876fecd` | `c27f3285` | `4c68dbcf` |
| `t-formal-verif-tla-skeleton-public-surface.test.ts` | `3eca3cf11a61b34f05ea04a2aac9b1a1a87c1222e41c86e6e46ca71973432d28` | `0ddf7903` | `7490768d` |
| `t-formal-verif-tla-skeleton.integration.test.ts` | `92564198fd1e0dc313bf9e82811c252f99e6d5f0b76f83eb6bce1dfcb855690b` | `13bf5f4d` | `06ac4544` |
| `t-formal-verif-tla-skeleton-outcome.integration.test.ts` | `4da308ab8c0f4cfa95c7238027b6f942e46df0bc8f3cacec8ea14f90b279cccd` | `9b9d9970` | `89dca564` |
| `tla-skeleton-harness.ts` | `3bc015874b91a23efe2e024d5b3ac0ab1fdf5a0b95a4d716f43c424d962b334f` | `6aa9bf34` | `9ecb177c` |
| `t-formal-verif-tla-skeleton.test.ts` | `392106261c68a1876c6d0c6e6268fc87e56c5662034290f8a40509d91bb1595b` | `eded34fc` | `d845fa3f` |

`answer-evidence`はcode-generationで新規・変更した`*-questions.md`がないため非該当である。

## 境界確認と計画差分

- 当初forecastのproduction 650〜950 LOCに対し、closed schemaとCI archive/trust validationが約480 physical LOCを占めた。単一file 1,279 LOCの時点で停止し、責務を変えずに3 production files、各750 LOC以下、合計1,500 LOC以下へ再評価した。Iteration 1修正後の最終値は1,449 LOCであり、filesystem Git/CI clientや追加public capabilityは導入していない。
- U1〜U4は公開portだけをconsumeし、U6〜U8、Arm S authoring、fixture fan-out、promotion、benchmark、eligibility/report、new workflowを実装していない。
- `packages/framework`、`packages/setup`、`dist`、`package.json`、`bun.lock`、`.github`の差分は0件である。他branch・他intentの成果物を取り込んでいない。
- checkpoint `fb7165c10b2b10ab9ced9338243434b96dfeb7ef`から作成した専用worktreeだけで作業し、ユーザー指示で`origin/main`へrebaseした後のcheckpoint-equivalent HEADは`1da36940f9e355c8c29c4ee2c96a438f94e03272`である。既存e6 worktreeと未追跡scratch `undefined/FormalElection.cfg` / `undefined/FormalElection.tla`には触れていない。
- U3/U4設計時のblockerはengine/review stateで解消済みであり、過去の設計artifactは遡及変更していない。

## issue候補

full noncoverage `--all`診断では、既知3件に加えて`tests/e2e/t113.test.ts`が単独でも失敗した。workflow完了時にactive-intent cursorをclearする現行`#1248`挙動の後、`emitError`がstateを再発見できず、testが期待する`ERROR_LOGGED` rowをappendできない不整合である。U5の責務外であり、このUnitでは修正・scope拡張しない。

## Formal Review

Iteration 1は**REVISE（Critical 3 / Major 0 / Minor 0）**だった。findingは、(1) caller申告anchorでledger suffixを絞るstop proof、(2) caller申告SHAだけで発行できるprecondition、(3) provider bytesを読まないCI archive trustである。上記negative-first testと実装により3件を閉包し、fresh test、coverage、sensor、real TLCを再検証した。

このsummaryはFormal Review Iteration 2開始前snapshotである。独立architecture reviewerへU5公式Functional/NFR文書、適用norm、plan、code/testsとIteration 1 closureを読み取り専用で引き渡す。READYならStep 15を完了し§13へ進む。REVISEの場合はiteration上限到達として新findingを固定し、stage protocolに従う。
