# Build and Test Results — team-up Codex safety-wait

## Execution

実行UTCは2026-07-21T10:46:38Z、対象は単一Unit `team-up-safety-wait` である。[Code Generation Plan](../team-up-safety-wait/code-generation/code-generation-plan.md) と [Code Generation Summary](../team-up-safety-wait/code-generation/code-summary.md) のpost-I3成果物を入力に、repository rootから実行した。

| Command | Exit | Result |
| --- | ---: | --- |
| `bun run typecheck` | 0 | application/test TypeScript compile PASS |
| `bun run dist:check` | 0 | claude/codex/cursor/kiro/kiro-ide/opencode parity PASS |
| `bash -n scripts/team-up.sh` | 0 | shell syntax PASS |
| `bun test tests/unit/t-team-up-codex-safety-wait.test.ts` | 0 | 17 pass / 0 fail / 73 assertions |

## Test and coverage results

Minimal strategyのfresh testは17件すべてPASSした。Enterはfake adapter内のpositive transactionで1回だけ記録され、実Herdr/current runへの入力は0件である。Code Generationから引き継いだintegration evidenceはfocused 114/114、team-up lifecycle 52/52 GREENである。

最終unfiltered coverage artifactは389 files / 2 failed / 5,538 assertions / 2 failed assertions、全体17,730/24,685 lines、helper 300/379 lines・37/45 functionsである。全体RESULTはFAILのまま記録する。

## Failure classification

- `tests/integration/t199-generated-prefix-contract.test.ts`: 他Intent election record内の既知prefix差分。team-up対象fileを変更して是正しない。
- `tests/integration/t163-reaper-steal-race.test.ts`: coverage走行時にwinner 2となった並行性flaky。runner 0後の単独再実行は2 pass / 0 fail。
- `bun run promote:self:check`: team-up差分外の`.codex/.tmp-*` orphan 91件で失敗。削除、stash、resetを行わない。

上記を全PASSへ読み替えない一方、team-upのproduction caller、exact positive、fixture非到達、閉三値、unknown latch、Enter 1回の安全境界に新Critical/Majorはない。

## Readiness

Build READY、unit READY、integration evidence READY、deployment非対象である。既知Minorはproduction差分763行の保守コストのみで、Code Generation Formal I3はREADYだった。source/testの追加変更、外部Codex検証、実pane入力は行っていない。
