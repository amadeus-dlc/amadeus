# Logical Components — cursor-live-closure

## 上流入力

`business-logic-model.md:7-18`のU10 conditional C5/C6 sliceを既存C2/C4/C7/C8/C9へ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-CU-01 | `CursorPhaseGuard` | gate後のPhase 2 closure一致検証 |
| LC-CU-02 | `CursorCapabilityProbe` | IDE/agent/help/dist/authのread-only測定 |
| LC-CU-03 | `CursorCredentialBinding` | native authまたはsingle-run API key lease |
| LC-CU-04 | `CursorScratchBuilder` | git workspace/HOME/XDG/project-only hook |
| LC-CU-05 | `CursorSafeSpawnSpec` | closed argv/env/cwd/sandbox/prompt |
| LC-CU-06 | `CursorContainmentPort` | write-deny self-test、spawnIntoJob、kill/empty |
| LC-CU-07 | `CursorHookBrokerShim` | exact Bun commandをparent brokerへ転送 |
| LC-CU-08 | `CursorHookReceiptBroker` | status→afterShell single-use state machine |
| LC-CU-09 | `BoundedCursorOutput` | byte上限、digest、discard-drain、aux matcher |
| LC-CU-10 | `CursorStatusJourney` | receipt/state/output/leak anchorsのAND |
| LC-CU-11 | `CursorClosureDecision` | supported/unsupported/environment failureの排他分類 |
| LC-CU-12 | `CursorCleanupReceipt` | job/worker/credential/scratch/leak残存0 |
| LC-CU-13 | `CursorLeakMatcher` | API key/source pathのbounded streaming照合・zeroize |

## Ownership and Interfaces

C5はLC-CU-01〜09/11/13を所有し、C4からgeneric registrar/deadlineだけを借用する。C6はLC-CU-10を所有し、broker receiptを正本としてbounded view/disk anchorsを判定する。C4 credential brokerがLC-CU-13をopaque closureとしてC5 collectorへ貸し、secret/path bytesは返さない。C4は全体cleanup順序を所有し、C5のjob/worker cleanup receipt後にcredential/scratch/leak cleanupを続ける。LC-CU-11は既存C7/C8/C9 interfaceへsupported/unsupported候補を渡し、共通型・transactionを追加しない。

## Failure Domains and Handoff

child write/tool/processはrun-owned job、credential/leak matcherは1 lease、hook証拠はsingle-use broker+restricted script writer、capability unsupportedは完全なC7 Issue候補へ封じる。environment/transient failureは未完了hard error、ledger failureは共通hard errorのまま終端する。Code Generationには13 component、具体的なoutput/deadline/job/broker/credential/leak契約と`cursor-agent-contract` mutant名を引き渡す。追加AWS/infrastructure componentはない。
