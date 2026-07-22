# Code Summary — experiment-contract-provenance

## 実装概要

U1 `experiment-contract-provenance`のrepo-local TypeScript/Bun実装を追加した。strict contract parser、canonical identity、blind provenance state fold、command-specific proof、closed handler registry、repository path isolation、safe receipt、immutable transaction / append-only successor型filesystem storeを、concrete Registry / TLC / TS arm / Evidence / Evaluator / Rendererから分離した。

Architecture Review Iteration 2では、provenance event / proofの実行時closed-shape、identity continuity、state / proof / ledger-head binding、transaction preimage再計算、durable owner lock、recursive receipt redactionを強化した。test-only E2E compositionは実dispatcher pipelineからfilesystem storeまでを通し、実child process強制終了によるcrash recoveryを検証する。

本成果物はU1単独のcontract実装であり、walking skeleton完了、fixture manifest promotion、final CLI integration readinessを主張しない。

## 作成・変更ファイル

### Application code / configuration

- `tsconfig.json`: nested `scripts/**/*.ts`をtypecheck対象へ追加。
- `scripts/formal-verif/contract.ts`: closed config、Cell / Suite schema、1 MiB cap、parse counters。
- `scripts/formal-verif/canonical.ts`: recursive canonical JSON、domain-separated SHA-256、serialize/hash counters。
- `scripts/formal-verif/provenance.ts`: event / error union、max6 event fold、promotion permission、transaction / store port。
- `scripts/formal-verif/proof-policy.ts`: start / freeze / reveal / skeleton / promotionのcommand-specific proof registry。
- `scripts/formal-verif/dispatcher.ts`: 11 commandのstrict decoder、exact handler registry、single dispatch。
- `scripts/formal-verif/repository-path-policy.ts`: relative / realpath / symlink / allowlist validation。
- `scripts/formal-verif/fs-provenance-store.ts`: durable immutable transaction object、append-only successor chain、lookup / retry / conflict / corruption検査。
- `scripts/formal-verif/receipt.ts`: private field / absolute path redactionとcontent identity。
- `scripts/formal-verif/index.ts`: U1 public exports。

### Tests / fixtures

- Unit: `tests/unit/t-formal-verif-{contract,canonical,provenance-state,provenance-transaction,proof-policy,dispatcher,path-policy,receipt}.test.ts`
- Integration: `tests/integration/t-formal-verif-{contract-dispatch,isolation,provenance-store}.integration.test.ts`
- E2E: `tests/e2e/t-formal-verif-contract-provenance.test.ts`
- Test support: `tests/formal-verif/support/contract-provenance-harness.ts`
- Synthetic fixture: `tests/formal-verif/fixtures/contract-provenance/public-manifest.json`

## Traceability

| Requirement / scenario | 実装 / test evidence |
| --- | --- |
| FR-3 / S-2 / S-4 | provenance fold、proof policy、path isolation、dirty/private/order failure tests |
| FR-4 / S-3 | closed Cell/Suite parser、canonical identity、exact dispatcher、deterministic E2E |
| FR-5 / S-7 | authoring events、transaction identity、parse/fold/hash/dispatch counters |
| S-8 | content identities、safe receipt、immutable transaction / successor、typed errors |
| NFR-1 | fixed constants、100-run parser/property checks、transaction retry identity、typecheck |
| NFR-2 | unknown schema / command、invalid transition、proof欠損、head conflict、corruptionをfail-closed化 |

## Test / verification results

- Focused direct suite: **231 pass / 0 fail、12 files、387 expect calls**。
- Tier runner: Unit **8 files / 153 assertions PASS**、Integration **3 files / 52 assertions PASS**、E2E **1 file / 26 assertions PASS**。
- `bun run typecheck`: **PASS**（source / tests）。初回は`tsc` / `bun-types`未導入のlocal `node_modules`でexit 127 / TS2688だったため、lockfile不変の`bun install --frozen-lockfile`後に再実測した。
- U1 focused Biome: **PASS / 0 errors**。
- `bun run lint:check` / `bun run check`: **PASS with repository complexity warnings**。
- `bun run dist:check`: **PASS**（6 harness tree同期）。
- `git diff --exit-code -- packages/framework packages/setup dist`: **PASS**。
- network / database / OAuth等のnegative import scan: **0 matches / PASS**。

## 制約と完成境界

- Storeはlock / transaction / successorそれぞれのwrite、file sync、rename、directory sync全12境界へfailure injectorを持ち、実child processを`SIGKILL`してretry収束を検証した。orphan temporaryとdead ownerはquarantine receiptを伴って隔離する。
- ledger-scoped single-writer lockはcomplete owner recordをstage / fsync後にexclusive publishし、live / unknown ownerを拒否してnonce一致時だけreleaseする。stale expected-head rejection、same-transaction same-bytes retry、transaction preimage / envelope再検査、commit後response-loss lookupも検証した。distributed writer / consensusは対象外である。
- 1 KiB / 64 KiB / 1 MiB / +1 byte、0/1/3/6/7 events、parse node / byte、serialize / hash、fold、handler call counters、input bytes mutation後の非依存を検証した。
- canonical propertyは固定生成100 casesで検証した。Arm S固有fast-check PBTは別Unit所有であり、U1からconcrete oracleをimportしない。
- `packages/framework/`、`packages/setup/`、`dist/`、self-install、production CI、new dependency、concrete provider、final CLI rootは変更していない。
- U1単独ではwalking skeleton完成、manifest promotion実行、final integration readinessを主張しない。
