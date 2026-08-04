# Code Summary — claude-sdk-live

## 実装概要

U04の承認済み設計どおり、Claude Agent SDK 0.3.158以降のlive surfaceを既存live-E2E kernelへ接続した。`claude-sdk`は専用opt-inとGitHub Actions hard denyを入口に、SDK import/version/capability、dist、authのpreflight、fresh project/home/tmp、project-only settings、run-bound credential pipe、SDK-owning worker group、bounded sanitized events、closed journey assertion、cleanup、ledger、matrixへ一方向で接続される。

親kernelはSDK client/session/streamをimport・所有しない。SDK固有のevent/abort modelはU04 adapter/worker内へ閉じ、U03/U05へ漏らしていない。U03から再利用したのはClaude familyのscratch、project settings、credential sourceだけである。

## 主な変更ファイル

- `tests/harness/live-e2e/claude-sdk.ts`: SDK capability probe、adapter、closed worker spawn、one-shot credential frame、worker-group supervisor、bounded event collector、cleanup。
- `tests/harness/live-e2e/claude-sdk-worker.ts`: SDK唯一owner、external abort、project-only `driveAidlc`、tool/state/audit/assistant/terminalのsanitized projection。
- `tests/harness/sdk-drive.ts`: 後方互換なproject-only settings authority、external AbortSignal、複数terminalとmessage order観測。
- `tests/harness/live-e2e/journey.ts`: literal `echo ok`、exactly-one terminal、success/error/turn/permission/order/output assertions。
- `tests/harness/live-e2e/registry.ts`、`tests/harness/claude-sdk-live.ts`: `claude-sdk` capabilityとgate-first local requirement check。
- `tests/harness/live-e2e/testing/claude-sdk-contract.ts`、`testing/oracle.ts`: U02 kitへのSDK baseline/mutant bindingとstable assertion ID。
- `tests/unit/t-claude-sdk-live-gate.test.ts`: GHA優先、strict opt-in、registry/journey、CI/env/settings/credential/output mutants。
- `tests/integration/t-live-e2e-claude-sdk.integration.test.ts`: fake workerによるcredential frame、env/settings、green receipt、duplicate terminal、abort無視、overflow、old SDK skip。
- `tests/e2e/t-claude-sdk-kernel.serial.test.ts`: real SDK/model/authの明示opt-in serial境界。
- `docs/harness-engineering/live-e2e.md`: SDK実行方法、worker/credential isolation、timeout/limit契約、generated matrix row。

## 主要な判断

1. GHA/opt-in gateはcommon kernelでpreflightより前に評価する。SDK import probeもgate通過後だけchildで実行し、parentへSDK moduleをloadしない。
2. credentialは`runNonce`、generation、child key、secretをlength-prefixed stdin frameとして1回だけwriteし、worker environment/argv/filesystemへ渡さない。frame bufferはwrite直後、worker process-local credentialは終了時に破棄し、bindingはworker reap後にreleaseする。
3. workerはdetached process groupでSDK client/session/streamを所有する。90秒deadlineでSDK abort signal、10秒後SIGTERM、5秒後SIGKILL、さらに5秒以内のreapへ進み、cleanupはreap完了を待つ。
4. event collectorはsingle 65,536 bytes、total 1,048,576 bytes、4,096 events、queue 16 events/262,144 bytesを上限とする。最初の超過でgreenを閉じ、workerをabortし、残りのpipeをdigestしながらdiscard-drainする。
5. durable evidenceはraw prompt/prose/tool output/state/secretを保持せず、kind、ordinal、count、boolean、byte length、digestだけを保持する。successはexactly-one terminal result、`subtype=success`、`isError=false`、positive turns、permission denial 0、terminal-last、state/audit observation、nonempty tool/assistant evidenceをすべて要する。

## Test結果

- focused 4 files: 15 pass / 3 skip / 0 fail、41 assertions。skip内訳はreal SDK explicit opt-in 1件と、既存SDK settings fixture不在による2件。U04 unit/integration自体は14 pass、real live 1 explicit skip。
- `bun run typecheck`: PASS。
- `bun run lint`: PASS（repository既存warningのみ）。U04新規/変更10 filesのtargeted Biome checkはwarning 0。既存`driveAidlc`のcognitive-complexity warningは変更前からのbaseline。
- `bun tests/harness/live-e2e/project-matrix.ts check`: PASS。
- `bun scripts/package.ts --check`: PASS（全harness tree同期済み）。
- `bun run promote:self:check`: PASS。

## 計画との差異・残事項

- unit-of-work、story map、requirementsはBolt worktreeへ複製されていなかったため、captured intent、FR群、U04 functional/NFR designへtraceした。
- 明示opt-inがないためreal provider課金journeyは実行していない。捏造したgreen receiptは追加せず、matrixは`UNVERIFIED`を維持した。maintainerはrunbookのcommandを明示実行し、pending-free ledger receipt、matrix update/checkを閉じる。
- 既存Bun設定でunit/integration/serial E2E discoveryを満たすため、test configuration fileは追加していない。
