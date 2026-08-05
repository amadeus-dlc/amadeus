# Logical Components — kimi-print-live-e2e

## 境界と依存方向

本構成は [Functional Design の end-to-end workflow](../functional-design/business-logic-model.md#L9)、[prepare/environment/execute](../functional-design/business-logic-model.md#L38)、[cleanup/finalize/release](../functional-design/business-logic-model.md#L43)、[verification scenarios](../functional-design/business-logic-model.md#L71) を component 境界へ写像する。すべて短命な Bun test process 内 component であり、cloud infrastructure は非適用である。

依存方向は `LiveJourneyRunner → policy/scheduler/resource ports → KimiPrintAdapter → injected process mechanics` とし、adapter が gate、canonical outcome、ledger、matrix を所有しない。

## Component inventory

| Component | 責務 | Contract |
|---|---|---|
| `LivePolicyGate` | CI deny と exact opt-in の順序固定 | deny 時の副作用0を示す `GateDecision` |
| `KimiPreflight` | binary/version/dist/auth prerequisite の副作用なし評価 | ready または canonical SKIP |
| `LiveRunScheduler` | process-wide FIFO queue とexclusive lease | active最大1、owner一致release、double release拒否 |
| `LiveRunRequestIdentityFactory` | queue参加前の副作用なしrequest ID発行 | queue entry、lease owner、run identityで同じID |
| `RunResourceRegistry` | planned→created→closed のresource lifecycle | partial prepareをcleanup対象に保持 |
| `KimiScratchFactory` | run-private project/home生成 | source credentialを所有しない |
| `CredentialBindingPort` | sourceからscratchへの短命binding | copy禁止、source non-owned、bindingだけclose |
| `ChildEnvironmentBuilder` | declaration allowlistからenv新規構築 | ambient sensitive keyを含めない |
| `KimiSpawnPort` | scratch cwdで`kimi -p`を実行 | childCreated、OS error、exit、bounded stream |
| `KimiEvidenceReducer` | 4,096-byte truncate→512-char sanitize→digest | raw prompt/outputを外へ出さない |
| `KimiAnchorVerifier` | exitとdeterministic anchorの積を検証 | model自然文をassertionにしない |
| `CleanupBarrier` | terminate/reap→binding/home/project close | `ClosedCleanup` または `FailedCleanup` |
| `KimiOutcomeProjector` | retry、canonical result、ledger可否を決定 | cleanup failureは外側error、ledgerなし |
| `LiveLedgerPort` | cleanup closed後の最終receiptを1行append | 中間attemptとcleanup failureを拒否 |

## Lifecycle

1. `LivePolicyGate` のallow後だけ `KimiPreflight` を呼ぶ。
2. ready後に request identity を発行して `LiveRunScheduler` のFIFOへ参加する。待機中はscratch、binding、spawn、journey timerを開始しない。
3. lease取得後、owner request IDを継承したrun identityを作り、resource registryを介してscratchとbindingを準備する。
4. allowlisted envとscratch cwdで `KimiSpawnPort` を起動し、bounded streamだけを `KimiEvidenceReducer` と `KimiAnchorVerifier` へ渡す。
5. 全outcomeを `CleanupBarrier` へ合流させる。retry可能なら同一lease内で新attemptを1回だけ開始する。
6. cleanup closed後だけ `KimiOutcomeProjector` が最終receiptを `LiveLedgerPort` へ渡す。
7. ledger成功/失敗、cleanup失敗、例外を包む `finally` でowner leaseを1回解放する。

## Failure domains と blast radius

| Domain | Isolation | Projection |
|---|---|---|
| Gate/preflight | side-effect-free boundary | SKIP、lease/spawn/ledger 0 |
| Scheduler | global FIFO lease | 同時spawn最大1、retry間割込み0 |
| Credential | run-private binding | source不変、secret非永続 |
| Process/evidence | injected spawn port + byte/sanitize cap | bounded execution/assert failure |
| Cleanup | per-attempt resource registry | failure時 `cleanup-barrier-failed`、ledgerなし |
| Ledger | one-line append port | receiptを保持した`ledger-write-failed`、leaseは解放 |

外部課金、provider rate limit、local credentialを共有するため、throughput向上の並列化、cache、circuit breaker、horizontal scalingは採用しない。直列FIFOと bounded retry がこのlibrary/CLI向けの信頼性・コスト制御である。

## 型と検証 seam

- `LiveRunLease` は owner request ID を必須とし、同じIDを持つ `KimiRunIdentity` だけがreleaseできる。
- `CleanupTerminalResult = ClosedCleanup | FailedCleanup` とし、前者だけを `LiveLedgerPort` の入力型にする。
- `CleanupFailureReceipt` は `originalOutcome`、cleanup findings、safety overrideを保持し、PASS/green/supportedへ投影できない。
- `BoundedKimiEvidence` は raw stream から直接構築できず、truncate、sanitize、digest の各証拠を必須にする。
- fake scheduler/spawn/resource portで、FIFO順A→B、BによるAのrelease拒否、retry中のB side effect 0、各failure後のlease解放、resource残存時のledger拒否を決定的に検証する。
