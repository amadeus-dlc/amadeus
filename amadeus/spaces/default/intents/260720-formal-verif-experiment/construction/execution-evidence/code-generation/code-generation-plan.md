# Code Generation Plan — execution-evidence

## 目的と計画境界

本計画は Code Generation の PART 1（Planning）のみを対象とし、承認前の application code、test、test configuration は変更しない。対象は Brownfield の TypeScript ESM / Bun repository に埋め込む U3 `execution-evidence` であり、arm-neutral な cell / suite 実行、raw evidence の append-only 保存、verified receipt、suite / matrix completeness を実装する。

User Stories stage は SKIP されているため story を捏造せず、`unit-of-work-story-map.md` の S-3/S-4/S-6/S-8/S-9 を story 相当の trace 単位として用いる。要件 trace は FR-4/FR-5/FR-9 と NFR-1〜NFR-4 に限定せず、各 Step に該当 scenario と requirement を明記する。

## 再利用と所有境界

- U1 `experiment-contract-provenance` の `CellResult` / `ArmSuiteResult` strict parser、`Result`、`ArmId`、canonical JSON / domain-separated SHA-256、repository path policy、safe receipt、provenance の immutable transaction / append-only chain patternを再利用する。U3 は共通 verdict schema や blind lifecycle を再定義しない。
- U3 は authorized process port、cell coordinator、raw stream / timing、evidence bundle identity、runner/store ledger cross-reference、suite / matrix completeness のみを所有する。
- concrete TLA / TS arm adapter、arm 固有 oracle / normalizer、fixture registry / promotion、defect expectation、full-matrix の orchestration / cost aggregation、eligibility / Pareto / winner、report evaluator / renderer、final CLI root は所有しない。production code からこれらを import しない。
- `full-matrix-suite` と `eligibility-report` には verified suite / incomplete findings を返すだけとし、U3 から `evaluate`、`report`、次 command を連鎖実行しない。
- application code は `scripts/formal-verif/`、test は既存 tier の `tests/` に最小差分で追加する。既存 dependency、`bun:test`、`tests/run-tests.ts`、TypeScript、Biome を再利用し、`packages/framework/`、`packages/setup/`、`dist/`、lockfile、production CI、database、network client、Dockerfile / IaC は変更しない。

## 実装予定ファイル

### Application code

| 予定ファイル | 役割 | 主 trace |
| --- | --- | --- |
| `scripts/formal-verif/execution-evidence.ts` | `SubjectId` / `SampleKey` / suite deadline、arm-neutral process / normalizer ports、cell coordinator、serial suite runner、typed execution / incomplete findings | S-3/S-4/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4 |
| `scripts/formal-verif/execution-policy.ts` | executable / cwd / argv / env allowlist、repository-relative realpath、read-only snapshot identityを検証し `AuthorizedProcessRequest` を生成 | S-3/S-4/S-8/S-9、FR-4/FR-9、NFR-1〜NFR-4 |
| `scripts/formal-verif/evidence-bundle.ts` | closed 5-payload manifest、raw byte hash / length、bundle ID、index envelope hash、payload上限、verified receipt / ledger coordinateの型と再検証 | S-3/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-4 |
| `scripts/formal-verif/fs-evidence-store.ts` | same-filesystem staging、capacity reservation、single-writer lock、bundle + runner/store ledgerのatomic transaction publish / read / retry / corruption検査 | S-4/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-3 |
| `scripts/formal-verif/evidence-completeness.ts` | canonical subject / sample key、suite exact-order検証、warmup分離、5 measured verdict一致、complete / incomplete matrix proof | S-3/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4 |
| `scripts/formal-verif/index.ts` | 上記 U3 public surface の export 追加。U1 exportを維持し concrete adapter / Registry / Evaluator / Renderer は公開しない | S-8、FR-9、NFR-4 |

既存 `contract.ts`、`canonical.ts`、`repository-path-policy.ts`、`receipt.ts`、`provenance.ts`、`fs-provenance-store.ts` は再利用対象であり、原則変更しない。実装時に U1 contract の不足が判明した場合は U3 内のwrapperで解決し、U1の所有契約変更が必要なら計画外変更として停止して再承認を求める。

### Test files / support

| 種別 | 予定ファイル | 主な検証 |
| --- | --- | --- |
| Unit | `tests/unit/t-formal-verif-execution-policy.test.ts` | shell / glob禁止、PATH shadowing、env漏洩、absolute / traversal / symlink escape、executable / snapshot drift、未承認spawn 0件 |
| Unit | `tests/unit/t-formal-verif-evidence-bundle.test.ts` | closed 5 roles、raw bytes保持、hash / length、domain separation、index自己参照禁止、上限 exact / +1、同一ID異bytes |
| Unit | `tests/unit/t-formal-verif-execution-runner.test.ts` | process 1回、timeout / non-zero / schema欠損の `HARNESS_ERROR`、store error非verdict化、HARNESS_ERROR後続継続、suite deadline |
| Unit | `tests/unit/t-formal-verif-evidence-completeness.test.ts` | baseline-first、warmup / measured非衝突、missing / duplicate / handwritten / unknown、metadata drift、warmup除外、5 run verdict不一致 |
| Integration | `tests/integration/t-formal-verif-evidence-store.integration.test.ts` | staging / fsync / atomic rename、runner/store両ledger、head conflict、片側欠損、chain fork、response loss retry、capacity reservation / release |
| Integration | `tests/integration/t-formal-verif-execution-evidence.integration.test.ts` | U1 parser / canonical / provenance receiptと U3 fake process port / store / suite validatorの結合、raw stdout/stderr、deadline、complete / incomplete proof |
| E2E | `tests/e2e/t-formal-verif-execution-evidence.test.ts` | test-only arm-neutral fake adapterをBun subprocessで起動し、1 suiteの実行→atomic evidence→verified read→completenessを再現。arm oracle / fixture registry / evaluatorは結線しない |
| Support | `tests/formal-verif/support/execution-evidence-harness.ts` | deterministic monotonic / UTC clock、fake process / normalizer、temporary store、crash / timeout injection。production CLI rootにはしない |
| Fixture | `tests/formal-verif/fixtures/execution-evidence/` | synthetic command / result / tamper / capacity fixtures。sealed defect本文、secret、個人データ、外部選挙store参照は置かない |

Comprehensive test strategyに従い、各 logical componentを原則10〜15 casesのunit testで覆い、filesystem / process / ledger境界にintegration test、U3全体にtest-only E2Eを置く。

## 実装手順

- [x] **Step 1: 既存 test / compile configuration の適用範囲を再確認する。** `tsconfig.json` の `scripts/**/*.ts`、`tsconfig.tests.json` の `tests/**/*.ts`、Biome の `scripts/` / `tests/`、`tests/run-tests.ts` の tier直下 discoveryで予定ファイルが検査対象になることを確認する。既存設定で足りるため `package.json`、lockfile、`bunfig.toml`、Vitest / Jest configは変更しない。Trace: S-8、FR-9、NFR-1/NFR-4。
- [x] **Step 2: U1 contract / provenance の reuse seam を固定する。** `CellResult` は `parseCellResult`、content identityは `canonicalIdentity`、pathは `validateRepositoryPath`、safe receiptは `receiptIdentity`、append-only patternは provenance storeを参照し、U3固有 identity / ledger型だけを追加する。U1 fileを変更せず、arm adapter / report / evaluator / Registry import 0件をarchitecture testで固定する。Trace: S-3/S-4/S-8、FR-4/FR-9、NFR-1/NFR-2/NFR-4。
- [x] **Step 3: execution domain と typed ports を実装する。** `execution-evidence.ts` に `SubjectId`、`SampleKey(WARMUP/0 | MEASURED/1..5)`、`InputSetHash`、suite deadline、`ProcessPort`、`CellNormalizer`、clock、store ports、closed error / incomplete finding unionを置く。外部から完成済み `CellResult` をappendするAPIは公開しない。Trace: S-3/S-4/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4。
- [x] **Step 4: pre-spawn execution policy を実装する。** `execution-policy.ts` で executable version / content hash、cwd / input / output containment、argv array、env key allowlist、arm / subject / SHA / input-set identity、read-only content-addressed snapshotを一括検証し、`AuthorizedProcessRequest` 以外を process portへ渡せなくする。secret valueやhome / credential envをreceiptへ残さない。Trace: S-3/S-4/S-8/S-9、FR-4/FR-9、NFR-1〜NFR-4。
- [x] **Step 5: execution policy の Comprehensive unit tests を作る。** `t-formal-verif-execution-policy.test.ts` で shell metacharacterを文字列argvとして保持しshell起動しないこと、glob / substitution、PATH shadow、absolute / traversal / symlink、元path差替え、snapshot seal drift、env漏洩、identity driftをfail-closedで検証する。Trace: S-3/S-4/S-8/S-9、FR-4/FR-9、NFR-1〜NFR-4。
- [x] **Step 6: closed evidence bundle / stream bounds を実装する。** `evidence-bundle.ts` に `{result.json, command.json, stdout.bin, stderr.bin, timing.json}` のlogical role / SHA-256 / byte length、bundle / envelope domain separation、opaque raw bytes、JSON各1 MiB・stream各16 MiB・index 64 KiB・bundle総量上限、partial overflow receiptを実装する。path / mtime / index自身をbundle ID preimageへ入れない。Trace: S-3/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-4。
- [x] **Step 7: evidence bundle の Comprehensive unit tests を作る。** `t-formal-verif-evidence-bundle.test.ts` で5 payloadの欠損 / unknown role、raw byte / newline保持、hash / length drift、index自己参照、domain drift、上限-1 / exact / +1、同一identity異bytes、secret field不在を検証する。Trace: S-3/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-4。
- [x] **Step 8: cell coordinator と serial suite runner を実装する。** authorized requestを1回だけ実行し、monotonic durationとCoordinator UTCを分離し、U1 parserを通した `CellResult` とbundleを生成する。根拠ある反例のみ `DETECTED`、正常な全域完走のみ `NOT_DETECTED`、timeout / process / schema / incomplete explorationは `HARNESS_ERROR`、store / identity failureはtyped evidence errorとして保持する。120秒absolute deadlineとpublish reserveを全cellで共有し、HARNESS_ERROR後も残時間内は次subjectへ進む。Trace: S-3/S-4/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4。
- [x] **Step 9: runner の Comprehensive unit tests を作る。** `t-formal-verif-execution-runner.test.ts` でprocess call=1、raw streams、non-zero / signal / timeout / schema欠損、store failure非verdict化、canonical order、SHA / sample drift、HARNESS_ERROR後続継続、publish reserve前後、per-cell budget reset 0件を検証する。Trace: S-3/S-4/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4。
- [x] **Step 10: atomic filesystem evidence store を実装する。** `fs-evidence-store.ts` でstore外同一filesystem staging、payload再読、capacity reservation、single-writer lock、expected runner/store headsとnext sequencesの再確認、bundle + 両ledger entryを含むtransaction directory全体のexclusive atomic rename、parent sync、verified readを実装する。同一identity / 同一bytesだけidempotent successとし、overwrite / delete /片側appendを禁止する。Trace: S-4/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-3。
- [x] **Step 11: evidence store の integration tests を作る。** `t-formal-verif-evidence-store.integration.test.ts` でwrite / file sync / rename / directory sync / response loss、head conflict、片ledger、fork、orphan、same-ID different-bytes、lock競合、72/96 cell capacity、reservation競合 / abort / releaseをtemporary filesystemだけで検証する。Trace: S-4/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-3。
- [x] **Step 12: suite / matrix completeness validator を実装する。** `evidence-completeness.ts` でbaseline-firstのcanonical subjects、warmup 1件、measured 1..5、exact ordered keys、verified receipt、SHA / runner class / input hash drift、HARNESS_ERROR cell、missing / duplicate / handwritten / store failureをclosed findingsへ分類する。warmupを比較sampleから除外し、5 measured runの対応verdict不一致をcompleteにしない。eligibility / Pareto / reportは計算しない。Trace: S-3/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4。
- [x] **Step 13: completeness の Comprehensive unit tests を作る。** `t-formal-verif-evidence-completeness.test.ts` でmissing / duplicate / unknown / handwritten、identity / chain / metadata drift、HARNESS_ERROR存在cell、suite timeout、warmup分離、5-run一致 / 不一致、medianへwarmup非混入、filesystem暗黙discovery 0件を検証する。Trace: S-3/S-6/S-8、FR-4/FR-5/FR-9、NFR-1/NFR-2/NFR-4。
- [x] **Step 14: U1→U3 integration と test-only E2E を作る。** integration harnessで U1 strict parser / canonical identity / safe provenanceと U3 process / store / validatorを結び、Bun subprocess E2Eで1 suiteを evidence publishからverified completenessまで通す。fake arm-neutral normalizerだけをinjectし、TLA / TS adapter、fixture registry、evaluator、renderer、final CLI rootは作らない。Trace: S-3/S-4/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-4。
- [x] **Step 15: public export と依存境界を最小差分で確定する。** `index.ts`へU3 public types / ports / validators / filesystem adapterだけをexportし、既存U1 exportを維持する。import scanでarm adapter / Registry / eligibility / Pareto / report renderer / network / database依存0件、diffで `packages/framework/` / `packages/setup/` / `dist/`変更0件を確認する。Trace: S-8/S-9、FR-9、NFR-2/NFR-3/NFR-4。
- [x] **Step 16: focused verification と stage sensors を実行する。** U3のunit / integration / E2E、既存 `t-formal-verif-*` regression、`bun run typecheck`、`bun run lint:check`、`bun run check`、`bun run dist:check`を順に実行する。Code Generationにimportされた `linter`、`type-check`、`answer-evidence` sensorの結果とdetailを確認し、failureを無視せず計画Step / test / requirementへの回答証跡を残す。Trace: S-3/S-4/S-6/S-8/S-9、FR-4/FR-5/FR-9、NFR-1〜NFR-4。

## Test configuration 確認

- `tests/run-tests.ts` は tier directory直下の `.test.ts` をdiscoverするため、実行対象は `tests/unit/`、`tests/integration/`、`tests/e2e/`直下へ置く。`tests/formal-verif/` はsupport / fixture専用とする。
- `tsconfig.json` は既に `scripts/**/*.ts`、`tsconfig.tests.json` は `tests/**/*.ts` を含むため変更しない。
- `package.json` の既存 `typecheck` / `lint:check` / `check` と Bun native test runnerを使う。新規dependency、test script、Vitest / Jest config、`bunfig.toml` は追加しない。

## 検証予定 commands

```sh
bun test tests/unit/t-formal-verif-execution-policy.test.ts
bun test tests/unit/t-formal-verif-evidence-bundle.test.ts
bun test tests/unit/t-formal-verif-execution-runner.test.ts
bun test tests/unit/t-formal-verif-evidence-completeness.test.ts
bun test tests/integration/t-formal-verif-evidence-store.integration.test.ts
bun test tests/integration/t-formal-verif-execution-evidence.integration.test.ts
bun test tests/e2e/t-formal-verif-execution-evidence.test.ts
bun tests/run-tests.ts --unit --filter 't-formal-verif-'
bun tests/run-tests.ts --integration --filter 't-formal-verif-'
bun tests/run-tests.ts --e2e --filter 't-formal-verif-'
bun run typecheck
bun run lint:check
bun run check
bun run dist:check
git diff --exit-code -- packages/framework packages/setup dist
rg -n 'tla-arm|ts-arm|fixture-registry|eligibility|pareto|report-render|node:(http|https)|fetch\(' scripts/formal-verif/execution-evidence.ts scripts/formal-verif/execution-policy.ts scripts/formal-verif/evidence-bundle.ts scripts/formal-verif/fs-evidence-store.ts scripts/formal-verif/evidence-completeness.ts
```

最後の `rg` は禁止依存の0件を期待するnegative scanであり、0件時のexit 1を成功として明示的に判定する。全checkboxは計画承認前のため未完了のままとする。
