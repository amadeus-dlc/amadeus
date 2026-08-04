# Logical Components — kiro-acp-live-e2e

## 境界と依存方向

本構成は [Functional Design の共通 kernel と adapter の責務](../functional-design/business-logic-model.md#L7)、[processing sequence](../functional-design/business-logic-model.md#L9)、[cleanup と finalize](../functional-design/business-logic-model.md#L18)、[containment state machine](../functional-design/business-logic-model.md#L85) を実装可能な component 境界へ写像する。すべて Bun test process 内の短命 component であり、AWS、daemon、database、queue は追加しない。

依存方向は `LiveJourneyRunner → policy/ports → KiroAcpAdapter → injected mechanics` とし、transport mechanics から policy、ledger、matrix projector への逆依存を禁止する。

## Component inventory

| Component | 責務 | Input | Output / 不変条件 |
|---|---|---|---|
| `LivePolicyGate` | GHA deny と exact opt-in の順序固定 | env、capability | deny 時の副作用 0 を証明する `GateDecision` |
| `AcpPreflight` | binary/version、entrypoint、binding、readiness、containment capability の評価 | executable、binding plan、platform capability | `DirectEligible` または sanitized `FollowUpRequired` |
| `AcpDispositionResolver` | direct/follow-up を全必要証拠の積で裁定 | preflight proofs | measured-only や unknown を direct にしない |
| `RunResourceRegistry` | resource の planned→created→closed を所有 | run/attempt identity | 部分作成を含む cleanup target |
| `ScratchAndBindingFactory` | run-private home/project、opaque source binding、allowlisted env の生成 | declaration、source handle | ambient env と source ownership を持ち込まない `PreparedRun` |
| `ProcessContainmentPort` | pre-exec boundary、member 管理、boundary-wide terminate、empty 証明 | run/attempt identity、spawn spec | `BoundaryEmptyProof`。best-effort 実装は capability を自己申告しない |
| `OwnedWaitableChildren` | direct/adopted child の stable identity と wait status 回収 | spawn/adoption events | 全件分の `DirectChildReapReceipt` |
| `AcpTransportPort` | ACP 起動、initialize/readiness、send/cancel、frame 受信 | prepared run、AbortSignal | raw frame stream。policy/ledger を所有しない |
| `AcpMessageDecoder` | bounded incremental JSON-RPC parse | raw frames | validated message または protocol failure |
| `RequestCorrelator` | namespace、request ID、method、terminal 一意性 | validated message | correlated message または ID/duplicate failure |
| `StructuredAnchorVerifier` | tool name/result schema/exit/status の積を検証 | correlated tool update | model prose に依存しない anchor receipt |
| `CleanupBarrier` | cancel→terminate→empty→owned wait→resource close を直列化 | execution outcome、resource registry | `ClosedCleanup` または `FailedCleanup` |
| `AcpOutcomeProjector` | retry、canonical outcome、ledger 可否を決定 | attempt result、cleanup terminal result | cleanup failure は必ず外側 `cleanup-barrier-failed`、ledger なし |
| `FollowUpPublisher` | 構造的 blocker を公開可能な evidence に変換 | sanitized blocker、再開条件 | qualified Issue body と registry link。秘密値なし |

## 実行シーケンス

1. `LivePolicyGate` が allow を返した場合だけ `AcpPreflight` を呼ぶ。
2. `AcpDispositionResolver` が follow-up を返した場合は、spawn せず `FollowUpPublisher` 用の sanitized evidence を生成する。
3. direct の場合、`RunResourceRegistry` が containment lease、scratch、binding、session を作成前登録する。
4. `ProcessContainmentPort` が強い境界を確立し、`ScratchAndBindingFactory` の allowlisted env で `AcpTransportPort` をその境界内に起動する。
5. frame は `AcpMessageDecoder → RequestCorrelator → StructuredAnchorVerifier` の一方向 pipeline を通る。
6. 正常、失敗、timeout、abort の全経路が `CleanupBarrier` に合流する。新 attempt は `ClosedCleanup` 後だけ開始できる。
7. `AcpOutcomeProjector` は cleanup closed のときだけ canonical receipt を ledger へ渡す。failed cleanup は error payload のみに元 outcome を保持する。

## Failure domains と blast radius

| Failure domain | 隔離境界 | 上位への投影 |
|---|---|---|
| Policy | `LivePolicyGate` | side-effect-free skip |
| Auth/config binding | run-private binding | preflight/prepare failure。source は変更しない |
| ACP protocol | decoder/correlator/anchor | non-retryable protocol/assert failure |
| Provider capacity | attempt identity | anchor 前の allowlisted transient のみ最大1 retry |
| Process tree | strong containment boundary + owned wait set | empty/reap 不成立なら cleanup failure |
| Scratch/session | `RunResourceRegistry` | close 不成立なら cleanup failure |
| Durable evidence | one-line ledger append | cleanup closed receipt だけを受け入れる |

一つの run/attempt の resource、request namespace、boundary、scratch は他 run と共有しない。capability probe は transport ごとに直列化し、外部課金・rate limit とローカル credential の blast radius を増やす並列化を行わない。

## Interface contracts

- `DirectEligible` は safe binding proof、correlation proof、anchor capability、strong containment capability を必須 field とし、不完全状態を表現不能にする。
- `ProcessClosureReceipt` は `BoundaryEmptyProof` と `DirectChildReapReceipt` の両方なしに構築できない。
- `CleanupTerminalResult = ClosedCleanup | FailedCleanup` とする。前者だけが通常 receipt/ledger を生成でき、後者は `CleanupFailureReceipt` を生成して PASS、green、supported 投影を拒否する。
- `FollowUpRequired` は blocker kind、sanitized evidence、推奨 seam、再開条件、検証可能 acceptance criteria を持つ。
- `AcpTransportPort` は raw frame を durable sink へ公開しない。診断は sanitizer と byte cap を経由する。

## Verification seams

fake port はテスト側にのみ置き、production 分岐を追加しない。failure injection で、malformed frame、response ID mismatch、duplicate terminal、cancel failure、境界離脱、member 列挙失敗、PID 再利用、boundary empty 後の zombie、binding/scratch close failure を注入する。各ケースで `CleanupBarrier` と `AcpOutcomeProjector` の結果を検証し、cleanup 未完了から ledger/PASS/supported が生成されないことを契約テストで固定する。
