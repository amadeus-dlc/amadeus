# Logical Components — status-registry

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`を実装境界へ割り当てる。

## Component inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| `RegistryPathBoundary` | workspace canonical path解決、containment証明、rename前再確認 | traversal/symlink/path drift |
| `LifecycleLockAuthority` | private lock tokenの生成、scope終了時失効、検証 | unlocked/stale capability |
| `IntentStatusParser` | unknownから4値statusへ昇格 | malformed/unknown status |
| `IntentRegistryReader` | bytes保持、JSON decode、entry context付与 | malformed registry |
| `IntentStatusTransitions` | lock tokenと許可遷移行列 | illegal transition |
| `LegacyMigrationReader` | one-shot pathだけraw statusを保持 | legacy input限定 |
| `MigrationPlanner` | target一意性、token span、intended bytes生成 | target/byte mismatch |
| `AtomicRegistryWriter` | path証明を消費し、temp、file/directory fsync、rename、read-back | filesystem failure |
| `RegistryBenchmark` | latency/RSS/growth測定 | environment/provenance mismatch |
| `DistributionDriftGuard` | core→6 harness/self-install同期 | generated drift |

## Dependency direction

- shared core lock moduleが`LifecycleLockAuthority`を所有し、workspace lock callbackのlexical scope内だけでprivate `LockedLifecycleContext`を発行する。status-registryと後続lifecycle-transactionは同じportを消費し、互いの実装へ依存しない。
- public CLI → lock authority callback → path boundary → reader/parserまたは限定transition capability。
- one-shot migration CLI → legacy reader → migration planner → atomic writer。
- parserとtransition capabilityはmigration raw modelへ依存しない。
- benchmarkとdrift guardはproduction componentを呼ぶが、production codeはtest componentへ依存しない。

## Isolation and blast radius

- malformed registryはreader/parser内で停止し、write componentへ到達しない。
- migration raw modelはone-shot module外へexportせず、通常selector、orchestrator、auditへ流出させない。
- path boundary failureはreader/writer前に停止する。atomic writer failureは単一registry fileと同一directoryの一意tempに限定され、network、database、他workspaceへ波及しない。
- generated harnessはcoreを正本に再生成し、個別手修正を許さない。

## Shared resources

- 共有資源はworkspace lock、`intents.json`、既存atomic writer、CI runnerだけである。
- AWS、database、queue、cache、daemon、external telemetryはN/Aであり、Infrastructure Designへ新規provisioning要求を渡さない。
