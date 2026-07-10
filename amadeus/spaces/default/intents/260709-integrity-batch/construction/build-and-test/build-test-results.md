# Build & Test Results — integrity-batch(実測)

実行日時: 2026-07-09(4/4 Bolt マージ後の origin/main 6ac15f7c4 を取り込んだ record ブランチ上で実測)

| 検証 | コマンド | exit code | 結果 |
|---|---|---|---|
| 型検査 | `bun run typecheck` | 0 | PASS |
| リント | `bun run lint` | 0 | PASS |
| dist 同期 | `bun run dist:check` | 0 | PASS(全ハーネスツリー同期) |
| self-install 同期 | `bun run promote:self:check` | 0 | PASS |
| フルスイート | `bash tests/run-tests.sh --ci` | 0 | **RESULT: PASS**(TOTAL 40 files / 296 tests / 3 skip、e2e 62 tests 含む) |

skip 3 は substrate ゲート(live SDK 資格情報不在)による正常スキップ。

## CI(GitHub Actions)側の実測

- 4 PR すべて typecheck·lint·drift·tests / Coverage Report / codecov/patch / Codecov Status / CI Success = pass でマージ(#713/#714/#716/#715)
- #715 は初回 codecov/patch fail → in-process ハンドラテスト追加で緑化(パッチゲートが新規行のテスト不足を正しく検出した初事例)
- マージ直列化ランブック(共有 coverage-registry)を実運用: #716 マージ後に #715 をリベース+再生成+force-push → 全 green
