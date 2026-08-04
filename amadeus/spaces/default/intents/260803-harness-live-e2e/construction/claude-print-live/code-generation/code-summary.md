# Code Summary — claude-print-live

## 実装概要

U03の承認済み設計どおり、Claude Code 2.1.220以降のprint/headless surfaceを既存live-E2E production kernelへ接続した。`claude-print`は専用opt-inとGitHub Actions hard denyを入口に、read-only version/help/dist/auth preflight、fresh project/home/tmp、project-only settings、native keychainまたは`ANTHROPIC_API_KEY` binding、closed argv、bounded output、structured result assertion、cleanup、ledger、matrixへ一方向で接続される。

Claude SDK/TUI transportはimportしていない。共有するのは、既存driverと同じproject-only settings方針を具体化したClaude family seamだけである。

## 主な変更ファイル

- `tests/harness/live-e2e/claude.ts`: Claude family context、minimum/help probe、ambient credential source、scratch allocator、print adapter、bounded stdout/stderr digest、abort/reap/credential/scratch cleanup。
- `tests/harness/live-e2e/registry.ts`: `claude-print` capability、strict opt-in、version、anchor、env/settings isolationの正本。
- `tests/harness/live-e2e/journey.ts`: literal prompt、90秒deadline、closed schema、exit/error/turn/structured-output anchors。
- `tests/harness/claude-print-live.ts`: gate-first local requirement checkとnative keychain probe。
- `tests/harness/live-e2e/testing/claude-print-contract.ts`、`testing/oracle.ts`: U02 kitへのU03 suite bindingと4 stable assertion ID。
- `tests/unit/t-claude-print-live-gate.test.ts`: GHA優先、strict opt-in、registry/journey、baseline green/mutant red。
- `tests/integration/t-live-e2e-claude-print.integration.test.ts`: fake CLIによるargv/env/cwd/settings/schema/cleanup/ledger、help不足、native binding、output flood。
- `tests/e2e/t-claude-print-kernel.serial.test.ts`: real CLI/model/authの明示opt-in serial境界。
- `docs/harness-engineering/live-e2e.md`: Claude print実行方法、credential strategy、driver trigger、generated matrix row。

## 主要な判断

1. GHA/opt-in gateはcommon kernelでprobeより先に評価し、helperもgate deny時にはinvalid binaryへ触れない。
2. child environmentは`PATH`,`LANG`,`LC_ALL`,`NO_COLOR`から再構成し、fresh `HOME`,`TMPDIR`を追加する。API-key modeだけ`ANTHROPIC_API_KEY`をbindingから追加し、native keychain modeはauth envを追加しない。
3. scratch `.claude/settings.json`は正確に`{"hooks":{}}`とし、argvの`--setting-sources project`、`--tools ""`、`--no-session-persistence`でuser/local settings、hooks、tools、session persistenceを遮断する。
4. stdoutは1 MiB、stderrは256 KiBまでだけbufferし、全raw bytesはincremental SHA-256へ流す。overflowはstructured resultを成立させず、green receiptを禁止する。
5. `claude auth status --json`はsource `HOME`/`CLAUDE_CONFIG_DIR`を渡さないallow-list環境でnative keychain availabilityだけを確認する。source auth/config fileはcopy・symlink・argv/env注入しない。

## Test結果

- focused 7 files: 40 pass / 1 explicit opt-in skip / 0 fail、105 assertions。
- real Claude test: `AMADEUS_CLAUDE_PRINT_LIVE`不在のためprobe/scratch/model前に明示skip。実green receiptは捏造せず、matrixは`UNVERIFIED`を維持した。
- `bun run typecheck`: PASS。
- `bun run lint`: PASS（repository既存warningのみ）。新規/変更9 filesのtargeted Biome checkはwarning 0。
- `bun scripts/package.ts --check`: PASS（全harness tree同期済み）。
- `bun run promote:self:check`: PASS。
- `bun tests/harness/live-e2e/project-matrix.ts check`: PASS。

## 計画との差異・残事項

- user storiesはBolt worktreeへ複製されていなかったため、captured intent、FR群、U03 functional/NFR designへtraceした。
- 明示opt-inがないためreal provider課金journeyは実行していない。maintainerがrunbookのcommandを明示実行し、pending-free ledger receipt、matrix update/checkを閉じる必要がある。
- 既存Bun設定でunit/integration/serial E2E discoveryを満たすため、test configuration fileは追加していない。
