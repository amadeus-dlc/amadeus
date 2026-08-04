# Logical Components — kiro-acp-live

## 上流入力

`business-logic-model.md:7-17`のU07 C5/C6 sliceを既存C2/C4/C7/C8/C9へ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-KA-01 | `KiroAcpPhaseGuard` | gate後のPhase 1 closure検証 |
| LC-KA-02 | `KiroAcpCapabilityProbe` | isolated version/help/whoami/distとsandbox backend自己検査 |
| LC-KA-03 | `KiroAcpSpawnSpec` | closed argv/cwd/env/process identity |
| LC-KA-04 | `AcpNdjsonCollector` | byte/message/queue上限、digest、discard-drain |
| LC-KA-05 | `AcpCorrelationTable` | request ID、session brand、exactly-once reply |
| LC-KA-06 | `AcpStatusJourney` | initialize/new/prompt/cancelの順序とdeadline |
| LC-KA-07 | `ReadonlyLatchOracle` | no-follow freshness、counter増分、status anchor |
| LC-KA-08 | `AcpProcessSupervisor` | cancel→close→TERM→KILL→reap |
| LC-KA-09 | `KiroAcpCleanupReceipt` | process/scratch/leakの全試行結果 |
| LC-KA-10 | `CapabilityClosureBuilder` | unsupported pathのsanitized evidence |
| LC-KA-11 | `KiroToolExposurePolicy` | empty tool setとproject-only manifest digest |
| LC-KA-12 | `AcpSandboxPort` | C5所有のfilesystem/exec deny、atomic spawn、回収receipt |
| LC-KA-13 | `ReadonlyEvidenceBroker` | C5所有のauthenticated hook signalからlatch/counter生成 |
| LC-KA-14 | `AcpEndpointBrokerPort` | endpoint identity固定、DNS/TLS/SPKI検証、redirect拒否 |

## Ownership and Interfaces

C5はLC-KA-01〜05/08/09/11〜14を所有し、C4からgeneric registrar、scratch、monotonic deadlineだけを借用する。C5はPhase guard成功直後にregistrar経由でempty HOME/TMPDIRを作り、isolated preflight後にproject contentを配置し、`AcpSandboxPort.spawn`から得たbounded message viewだけをC6へ渡す。C6はLC-KA-06/07を所有し、assistant proseを参照せずstructured ACP/latch/filesystem anchorsをAND判定する。C4のpublic APIと意味は変更しない。LC-KA-10はU07内でC7へclosure候補を返す。C8/C9には既存receipt/closure interfaceだけを渡し、新しい共通transactionや型を追加しない。

## Failure Domains and Handoff

malformed/overflow transportとhangは1 sandbox handle、stale latchは1 scratch run、tool attemptはempty exposure+sandbox、credential/sandbox capability不足は1 sanitized closure候補へ封じる。gate denyはguard/probe前に終端し、ledger failureは共通hard failureのまま保持する。Code Generationには14 component、具体的なbyte/deadline上限、empty-tool/sandbox/endpoint/evidence-broker契約、ACP correlation/latch no-follow契約、`kiro-acp-contract` mutant名を引き渡す。AWS/infrastructure componentは追加しない。
