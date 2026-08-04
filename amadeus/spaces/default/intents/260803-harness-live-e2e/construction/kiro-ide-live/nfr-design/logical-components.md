# Logical Components — kiro-ide-live

## 上流入力

`business-logic-model.md:7-19`のU09 C5/C6 sliceを既存C2/C4/C7/C8/C9へ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-KI-01 | `KiroIdePhaseGuard` | gate後のPhase 1 closure検証 |
| LC-KI-02 | `KiroIdeCapabilityProbe` | macOS/app/version/profile/CDP/chat/auth検査 |
| LC-KI-03 | `GeneratedProfileBuilder` | exact settings/SQLite transaction/digest |
| LC-KI-04 | `KiroIdeSpawnSpec` | absolute app、closed argv/env/cwd/group identity |
| LC-KI-05 | `DevToolsEndpointClaim` | fresh no-follow file、loopback、browser identity |
| LC-KI-06 | `BoundedCdpTransport` | byte/message/queue上限、ID相関、digest-only evidence |
| LC-KI-07 | `KiroChatEditorDriver` | semantic target/context/editor/input/submit |
| LC-KI-08 | `ReadonlyLatchOracle` | no-follow freshness、counter増分、state absence |
| LC-KI-09 | `ElectronGroupSupervisor` | CDP close→TERM→KILL→ESRCH→reap |
| LC-KI-10 | `KiroIdeCleanupReceipt` | profile/process/workspace/leak全試行結果 |
| LC-KI-11 | `KiroIdeClosureBuilder` | unsupported capabilityのsanitized C7 evidence |
| LC-KI-12 | `HookCommandBroker` | exact argv、status permit、restricted adapter worker |
| LC-KI-13 | `ElectronDescendantTracker` | backend spawn/exit event、PID/start identity、全descendant監査 |
| LC-KI-14 | `IdeProcessContainmentPort` | atomic spawnIntoJob、spawn deny、job kill/empty/reap |

## Ownership and Interfaces

C5はLC-KI-01〜07/09/12〜14を所有し、C4へclosed `KiroIdeSpawnSpec`を渡してgeneric registrar/deadlineを借用し、app/helper/broker workerを全てLC-KI-14へ原子的に束縛したcontainment receiptを返す。C6はLC-KI-07/08を使い、chat proseやpixelを参照せずDOM/latch/filesystem anchorsをAND判定する。C4はgeneric registrar、scratch、monotonic deadline、LC-KI-10の全体cleanup順序だけを所有し、trusted command/CDP/Electron semanticsを持たない。LC-KI-11はU09内でC7へclosure候補を返す。C8/C9へは既存receipt/closure interfaceだけを渡し、共通型・transactionを追加しない。

## Failure Domains and Handoff

profile driftとCDP hijackはlaunch/run単位、host commandはbroker permit、renderer/helper/worker hangはrun-owned job、credential/app/host-deny/containment capability不足は1 sanitized closure候補へ封じる。gate denyはPhase/filesystem前、ledger failureは共通hard failureのまま終端する。Code Generationには14 component、profile/CDP/deadline、hook broker、atomic spawnとdescendant監査契約、`kiro-ide-contract` mutant名を引き渡す。追加AWS/infrastructure componentはない。
