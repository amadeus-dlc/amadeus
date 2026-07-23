# Build and Test Results

実行日: 2026-07-23。入力は全5 Unit の `code-generation-plan.md` と `code-summary.md`。

## 実行結果

| コマンド | status | 実測 |
|---|---|---|
| `bash tests/run-tests.sh --ci` | PASS | 482 files、6940 assertions、失敗0 |
| `bun run typecheck` | PASS | diagnostics 0 |
| `bun run lint` | PASS | exit 0、既存 warning 251、info 19、error 0 |
| `bun run dist:check` | PASS | 6 harness 同期 |
| `bun run promote:self:check` | PASS | 4 self-install 面同期 |
| `bun tests/gen-coverage-registry.ts --check` | PASS | fresh、guards green、ratchet held |
| `git diff --check` | PASS | whitespace error 0 |

## テスト集計

- Test files: 482
- Failed files: 0
- Total assertions: 6940
- Failed assertions: 0
- サイズ分類: small 110、medium 448、large 3

## Skip と advisory

- AWS credentials invalid/expired: live SDK/substrate tests を skip。
- Claude substrate unavailable: derived live tests を skip。
- wall-clock drift: `tests/integration/t-codex-hooks-migration.test.ts` が medium 宣言に対して 33.57秒で large。
- failure detail と stack trace: 該当なし。

## カバレッジ

coverage registry は fresh、guard green、ratchet held。U4 の doctor 経路は LCOV の実行行到達を確認済み。全体の数値率より、要件追跡、実 subprocess、fixture falling proof、副作用なし assertion を合格根拠とした。
