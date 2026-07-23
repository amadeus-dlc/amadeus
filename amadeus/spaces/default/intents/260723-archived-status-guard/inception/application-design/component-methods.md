# コンポーネントメソッド — archived intent lifecycle

上流入力: `requirements`、`architecture`、`component-inventory`、`team-practices`。詳細な業務分岐はFunctional Designへ委ねる。

## Intent Registry Domain (`amadeus-lib.ts`)

```ts
export type IntentStatus = "in-flight" | "parked" | "complete" | "archived";
export function parseIntentStatus(value: unknown): IntentStatus;
export function intentStatus(projectDir: string, intentDir: string, space?: string): IntentStatus; // wrapper owns preflight
export function completeIntentStatus(projectDir: string, intentDir: string, space?: string): void; // wrapper owns preflight
export function withIntentLifecyclePreflight<T>(projectDir: string, space: string | undefined, body: (context: LockedLifecycleContext) => T): T;
export function intentStatusLocked(context: LockedLifecycleContext, intentDir: string): IntentStatus;
export function transitionIntentStatusLocked(context: LockedLifecycleContext, intentDir: string, transition: "complete" | "archive" | "unarchive"): void;
export function recoverIntentStatusTransactionLocked(context: LockedLifecycleContext): RecoveryResult;
```

`parseIntentStatus`は不正値を例外で拒否する。registry load時とwrite時の双方で使用し、`closed` aliasは設けない。locked capabilityはexportするが、`LockedLifecycleContext`は`withIntentLifecyclePreflight`だけが生成できるopaque tokenとし、runtimeでもactive lock tokenを照合する。任意status setterは公開せず、transition名ごとのfrom/to検証を内部で固定する。

## Lifecycle Command (`amadeus-state.ts`)

```ts
function handleArchive(intentDir: string, projectDir?: string): void;
function handleUnarchive(intentDir: string, projectDir?: string): void;
```

両methodはworkspace lock内でrecovery、対象解決、status検証、HUMAN_TURN消費、journal作成、commit列を実行する。archiveはactive cursor一致時だけcursorを解除し、state fileは更新しない。unarchiveはstatusを`in-flight`へ戻すがcursorは設定しない。

HUMAN_TURNはjournal作成時に自audit shardの最新未消費行を`{shard,timestamp}`で予約する。既存lifecycle eventまたは未完了journalが同じ組を参照していれば消費済みとして除外する。recoveryはpresenceを再選択せずjournalの予約を使う。

## Guard methods

```ts
function refuseArchivedSelection(intent: IntentInfo): void;
function archivedNextGuard(projectDir: string): ErrorDirective | undefined;
function assertActiveIntentNotArchived(projectDir: string, verb: "unpark"): void;
function mayAppendToIntent(status: IntentStatus, event: AuditEventType): boolean;
export function appendAudit(projectDir: string, event: AuditEvent): AppendResult; // wrapper owns preflight
export function appendLifecycleEventOnceLocked(context: LockedLifecycleContext, event: LifecycleEvent, operationId: string): "appended" | "already-present";
```

エラーはselector/intent、現在status、拒否verb、`unarchive`による復旧手順を返す。対象不在時はstatusを要求しない。

`appendLifecycleEventOnceLocked`はcontextのproject/spaceから全shardをoperationId+event typeで検索し、0件なら同じlock内でappend、1件ならidempotent success、2件以上ならfail-closedとする。通常auditの公開wrapperは自らpreflightを所有し、lifecycle orchestrationはlocked版だけを使う。

## Migration method

```ts
type LegacyIntentRegistryEntry = Omit<IntentRegistryEntry, "status"> & { status: unknown };
function readLegacyIntentRegistryForMigration(path: string): LegacyIntentRegistryEntry[];
function migrateClosedSwarmDriverIntent(raw: LegacyIntentRegistryEntry[]): IntentRegistry;
```

migration専用raw readerだけがstrict validator前のunknown statusを読む。通常runtime readerは常に4値strictである。

| 対象dirNameの状態 | 結果 |
|---|---|
| 1件かつ`closed` | `archived`へ移行 |
| 1件かつ`archived` | idempotent no-op |
| 0件 | fail-closed（対象欠落） |
| 1件かつ他のvalid status | fail-closed |
| 重複dirName | fail-closed |
| 対象外行に不正status | fail-closed |

移行後に全行をstrict `IntentRegistry`へ昇格し、他行を変更せずatomic writeする。
