# Scalability Requirements — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Capacity Model

Lifecycleはactive／explicit Intent単位の同期orchestratorであり、horizontal scalingやqueueは非適用である。

| Dimension | Target | Strategy |
|---|---:|---|
| completion operations | 最大3 | success-only bounded loop |
| active state | document 2 MiB、receipts 1,000、warnings 1,000 | State Unitのvalidated envelope |
| pending reconciliation | 最大1,000件、1 boundaryにつき最古eligible 1件 | current operationより先に収束 |
| concurrent same-event callers | 32（State Unitのwriter envelope） | state CAS winnerだけがremote permit取得 |
| active prompts | Intentごと最大1 | expected prompt binding |
| manual invocation | 1 command＝1 operation | generic batch／wildcardなし |

## Scaling Rules

- Intent数が増えても選択record以外をread／writeしない。
- pending件数が増えても1 boundaryで1件だけ処理し、burst mutationを作らない。
- concurrent callerはthroughputのためremote mutationを並列化せずCASで1 winnerへ収束する。
- rate limitやnetwork failureをlocal retry stormへ変換しない。
- status／prompt rendererはsnapshot sizeにO(N)で、remote historyをscanしない。
- 最大2 MiB／receipt 1,000／warning 1,000のstatus renderはp95 250 ms、process RSS 128 MiB以下とする。
- 1 boundaryあたりpendingを最大1件処理するため、1,000件の解消には最小1,000 eligible boundaryまたはmanual invocationが必要である。background drainは行わない。

## Degradation

2 MiB／receipt／warning capacity超過時はState Unitの予約`state-capacity` warningを保存し、remote mutationを開始せずAI-DLC workflowを継続する。CAS、outbox、GitHub failureでもpartial completion chain、別repository fallback、background catch-upを行わない。

## Acceptance

1. 32 concurrent create／sync／close fixtureで各remote mutation最大1件。
2. pending 1,000件fixtureでも1 boundaryのreconciliationは1件だけで、status p95 250 ms／RSS 128 MiB以下となる。
3. non-default Space／explicit Intentでcross-record mutation 0件。
