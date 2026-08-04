# Logical Components — claude-sdk-live

## 上流入力

`business-logic-model.md:7-21`のSDK C5/C6を共通lifecycleへ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-CS-01 | `SdkCapabilityProbe` | dependency/settings/auth/abort/event capability |
| LC-CS-02 | `SdkWorkerSpawnSpec` | closed cwd/env/options/IPC generation |
| LC-CS-03 | `SdkChildWorker` | SDK client/session/stream sole ownership |
| LC-CS-04 | `SdkEventNormalizer` | bounded ordered event projection |
| LC-CS-05 | `SdkAbortController` | abort→TERM→KILL→reap schedule |
| LC-CS-06 | `SdkTerminalJourney` | exact terminal/permission/evidence anchors |
| LC-CS-07 | `SdkCredentialPipe` | run/generation-bound one-shot secret frame |
| LC-CS-08 | `SdkBoundedEventCollector` | byte/event/queue limits、digest、discard-drain |

## Ownership and Failures

C5 owns probe/spec/worker protocol/normalizerとcredential child-key declaration、C6 owns terminal journey、C4 owns supervisor/process/deadline/credential pipe/event collector/cleanup。C5はclosed SpawnSpecをC4へ渡しborrowed bounded event viewだけを読む。worker crash/timeoutはcurrent group、credential/event replayはrun generation、ledger failureはevidence boundaryへ封じる。

`SdkCredentialPipe`はworker handshake後に1 frameだけ許可し、read/write FD closeとbuffer zeroizeをresource receiptへ記録する。`SdkBoundedEventCollector`はsingle 65,536 bytes、total 1,048,576 bytes、4,096 events、queue 16/262,144 bytesを越えた瞬間にcollectorをterminal failureへ閉じ、worker停止中もdiscard-drainする。

## Handoff

Claude family project-only settings seamとU02 assertionsを再利用する。SDK session/stream componentをprint/TUI adapterへ共有しない。
