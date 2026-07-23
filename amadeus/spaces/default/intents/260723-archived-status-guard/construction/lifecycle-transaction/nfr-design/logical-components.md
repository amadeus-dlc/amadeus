# Logical Components — lifecycle-transaction

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`を非循環のport構成へ割り当てる。

## Component inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| `LifecycleLockAuthority` | lock取得、context発行・失効・検証 | concurrent/unlocked access |
| `LifecyclePreflight` | journal recovery後にcallback実行 | corrupt/incomplete transaction |
| `JournalStore` | strict schema、atomic step persistence | malformed/write failure |
| `OperationIdentityPort` | UUID operationIdをjournal作成時に一度生成 | duplicate/invalid identity |
| `LifecycleClockPort` | HUMAN_TURN timestamp比較用の決定的clock seam | non-monotonic/test nondeterminism |
| `HumanTurnResolver` | shard/timestamp一意な未消費turn | missing/duplicate turn |
| `AuditCommitPort` | operationId検索、immutable payload照合、append | duplicate/mismatch event |
| `IntentStatusTransitions` | locked transition matrix | illegal/current status |
| `ActiveCursorPort` | active archive時だけatomic clear | cursor write failure |
| `LifecycleDiagnostics` | bounded typed fatal output | sensitive data leakage |
| `TransactionBenchmark` | latency、RSS、recovery、concurrency | environment mismatch |

## Dependency direction

- public archive/unarchive wrapper → `LifecycleLockAuthority.withLock` → `LifecyclePreflight`。
- preflight → journal、audit、status、cursor ports。command callbackだけが`OperationIdentityPort`と`LifecycleClockPort`を使って検証済みrequestから新規`FFF`を作る。各portはopaque contextを消費するが互いへ依存しない。
- `IntentStatusTransitions`はstatus-registry Unitが所有し、共有lock authorityのinterfaceだけを消費する。
- test fixtureはport fakeへ依存し、production componentはtest codeへ依存しない。

## Failure domains

- journal corruptionはcallback前にworkspace操作全体を停止する。
- audit failureはregistry/cursorへ進まず`FFF`を残す。registry failureは`TFF`、cursor failureは`TTF`を残す。
- 一つのworkspaceのfailureは他workspace、network、database、AWS resourceへ波及しない。

## Shared resources

- workspace lock、journal、audit shards、registry、active cursorが共有資源である。
- database transaction、external lock、queue、cache、daemon、telemetry SDK、cloud infrastructureは追加しない。
