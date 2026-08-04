# Logical Components — kiro-tui-live

## 上流入力

`business-logic-model.md:7-20`のU08 C5/C6 sliceを既存C2/C4/C7/C8/C9へ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-KT-01 | `KiroTuiPhaseGuard` | gate後のPhase 1 closure検証 |
| LC-KT-02 | `KiroTuiCapabilityProbe` | scratch envのtmux/CLI/help/whoami/dist検査 |
| LC-KT-03 | `PrivateTmuxSpec` | nonce-bound socket/session/200x50/closed argv |
| LC-KT-04 | `KiroChatSpawnSpec` | fixed shell、exact child env、empty tool trust |
| LC-KT-05 | `BoundedPaneCollector` | capture上限、ANSI除去、digest/pattern ID |
| LC-KT-06 | `TerminalStateClassifier` | unsupported/readiness/timeoutの排他分類 |
| LC-KT-07 | `KiroTuiStatusJourney` | literal prompt、pane/disk anchors |
| LC-KT-08 | `PrivateTmuxOwnerReceipt` | server/socket/session/pane/PID/start/PGID ownership |
| LC-KT-09 | `KiroTuiCleanupTarget` | signal前再検証とserver-loss fallback |
| LC-KT-10 | `KiroTuiCleanupReceipt` | pane/server/socket/group残存0 |
| LC-KT-11 | `KiroTuiClosureBuilder` | unsupported/post-start blockerのsanitized C7 evidence |
| LC-KT-12 | `ProcessContainmentPort` | backend probe、job create、atomic spawnIntoJob、signal/kill/empty |
| LC-KT-13 | `RunProcessJob` | PGID非依存の全descendant ownership |

## Ownership and Interfaces

C5はLC-KT-01〜06/08〜10/12/13を所有し、C4からgeneric registrar/deadlineを借りてclosed tmux/child specsを`spawnIntoJob`で最初の命令実行前からrun-owned job内に生成する。C6はLC-KT-07を所有し、bounded pane viewとno-follow disk anchorsだけをAND判定する。C4はregistrar、scratch、全体cleanup順序を所有し、`cleanupKiroTui(target)`のreceiptを受けた後もscratch/leak cleanupを続ける。LC-KT-11はU08内でC7へclosure候補を返す。C8/C9には既存interfaceだけを渡す。

## Failure Domains and Handoff

default tmuxは到達不能、pane leader loss/PGID escapeはrun-owned job、server/socket lossはjob handle、containment capability不足は1 sanitized closure候補へ封じる。gate denyはPhase/scratch前、ledger failureは共通hard failureのまま終端する。Code Generationには13 component、具体的なcapture/deadline/owner identity/job cleanup契約、`kiro-tui-contract` mutant名を引き渡す。追加AWS/infrastructure componentはない。
