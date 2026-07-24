# Build and Test Results — watcher-timeout-fix

参照元: `code-generation-plan.md`、`code-summary.md`。

## Build Results

初回 `bun run typecheck` は依存未導入により `tsc: command not found`（exit 127）となった。
`bun install --frozen-lockfile` で257 packagesを導入後に再実行し、exit 0でPASSした。
コード修正は不要だった。

`bun run lint` はexit 0。リポジトリ全体の既存warning 255件を報告したが、変更した
`tests/integration/t-team-up-watcher-arming.test.ts` の単体checkはwarning 0でPASSした。

## Test Results

| コマンド | Total | Passed | Failed | Skipped | 結果 |
|---|---:|---:|---:|---:|---|
| `bun test tests/integration/t-team-up-watcher-arming.test.ts` | 11 | 11 | 0 | 0 | PASS |

assertionは47件。既定値90、既定再送1、never-arm時の再送1回、1回再送後の回復、
非ゼロ終了と既存正常系を検証した。

## Distribution Results

- `bun run dist:check`: 6ハーネスすべて同期、PASS。
- `bun run promote:self:check`: claude/codex/cursor/opencodeの4面が同期、PASS。

## Failure Details and Coverage

実装起因の失敗はなし。初回typecheckの環境起因失敗は依存導入で回復した。
固定の数値カバレッジ閾値はMinimal戦略で要求されていないため未計測。
要件カバレッジはFR-1〜FR-4、NFR-1a〜1c、NFR-2を対象テストと配布同期チェックで確認した。
