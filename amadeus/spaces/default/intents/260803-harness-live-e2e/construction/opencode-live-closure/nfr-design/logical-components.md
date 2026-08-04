# Logical Components — opencode-live-closure

## 上流入力

`business-logic-model.md:7-19`のU11 conditional C5/C6 sliceを既存C2/C4/C7/C8/C9へ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-OC-01 | `OpenCodePhaseGuard` | gate後のPhase 2 closure一致検証 |
| LC-OC-02 | `OpenCodeModelIdParser` | provider/model grammarとtyped key table |
| LC-OC-03 | `OpenCodeCapabilityProbe` | version/help/dist/command/plugin/auth測定 |
| LC-OC-04 | `OpenCodeCredentialPort` | provider lease、one-shot handle、destroy |
| LC-OC-05 | `OpenCodeProjectBuilder` | git workspace、deny config、test plugin |
| LC-OC-06 | `OpenCodeContainmentPort` | Linux UID/mount/cgroup分離、Darwin exec deny/tool broker、atomic spawnIntoJob、kill/empty/audit |
| LC-OC-15 | `OpenCodeToolBrokerPort` | exact commandをrestricted workerへ仲介しbounded resultを返す |
| LC-OC-07 | `SupervisorCredentialPipe` | nonce/generation-bound one-shot frame |
| LC-OC-08 | `OpenCodeSafeSpawnSpec` | closed argv/env/cwd/model/status arg |
| LC-OC-09 | `OrderedPluginReceipt` | session/tool/command/terminal hash evidence |
| LC-OC-10 | `BoundedJsonEventCollector` | byte/event/queue/depth上限、digest、discard-drain |
| LC-OC-11 | `OpenCodeLeakMatcher` | credential/source path streaming照合・zeroize |
| LC-OC-12 | `OpenCodeStatusJourney` | JSON/receipt/state/leak anchorsのAND |
| LC-OC-13 | `OpenCodeClosureDecision` | cleanup barrier後のC8 append/already-present、closure commit、supported/unsupported/hard failure排他分類 |
| LC-OC-14 | `OpenCodeCleanupReceipt` | C5 cleanup barrier、全resource残存0、C8前提receipt |

## Ownership and Interfaces

C5はLC-OC-01〜11/13〜15を所有し、C4からgeneric registrar/deadline/cleanup operationsだけを借用する。C6はLC-OC-12を所有し、plugin receiptを正本としてbounded JSON view/disk anchorsを判定する。LC-OC-06はLinux childからcgroupfs writeを除去し、Darwinではraw execをdenyして全tool commandをLC-OC-15へ強制する。LC-OC-14はC5 job/supervisor/worker/credential/matcherとC4 scratch/leak receiptを集約し、`descendants-zero/reap → scan-before-delete → scratch delete → post-delete不存在 → credential destroy → matcher zeroize`を完了した後だけLC-OC-13によるC8 appendを許可する。LC-OC-13はC8 append成功または同一receiptのalready-present後に`closure-committed`へ遷移し、その状態だけがC7 supported更新、PASS、C5/C6 materialization、C9 projectionを解放する。既存C7/C8/C9 interfaceを使い、共通型・transactionを追加しない。

## Failure Domains and Handoff

credentialは1 lease/pipe、model/tool/processはrun-owned job、session evidenceはordered plugin receipt、unsupportedは完全なC7 Issue候補へ封じる。environment/auth/transient failureは未完了hard error、cleanup failureはC8未記録の`cleanup-barrier-failed`、ledger failureはbarrier成功後のreceiptを伴う共通hard errorかつ`closure-committed`未到達として終端する。Code Generationには15 component、model/config、credential/job/tool broker、JSON/receipt/deadline契約と`opencode-run-command-contract` mutant名を引き渡す。追加AWS/infrastructure componentはない。
