# Build & Test Results — dynamic-test-size(#699)

> 実行環境: conductor record worktree(claude-engineer-1、PR #732 マージ後の origin/main 統合済み、コミット e7c778202)。実行日: 2026-07-10。

## Build(検査)結果

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | 初回 exit 2 は node_modules 未更新(main マージで入った fast-check 未インストール)が原因。`bun install --frozen-lockfile` 後に 0 — 本 intent の変更とは無関係(ベースライン起因)と特定 |
| `bun run lint` | 0 | |
| `bun run dist:check` | 0 | 本 intent は core/harness 非接触 |
| `bun run promote:self:check` | 0 | 同上 |

## テスト結果(`bash tests/run-tests.sh --ci`)

- Test files: **276 / Failed files: 0**
- Total assertions: **3993 / Failed assertions: 0**
- RESULT: **PASS**
- 新規テスト: `t-test-size-dynamic`(26 tests)PASS、静的 guard `t-test-size-drift`(13 tests)PASS、exit 契約 `t112.serial` PASS

## 動的サイズ計測の実出力(本 intent の成果物が本番動作)

- summary matrix: TOTAL small 45 / medium 297 / large 3(345 files、size-annotated 34)
- `wall-clock drift: 0 file(s)`(誤検出ゼロ)
- `tests/logs/test-size-report.json`: schemaVersion 1 / 252 records / driftCount 0 / **records は file 辞書順(sorted: True を実測)**

## 失敗と診断(Step 10 の On failure 記録)

1回目の実行で typecheck exit 2 + Failed files 4 を観測 → 原因診断: main マージ(#722/#726 の PBT ファイル)に対し record worktree の node_modules が stale(fast-check 不在)。`bun install --frozen-lockfile`(2 packages)で解消し、2回目は全緑。本 intent のコードに起因する失敗は 0 件。

## CI(リモート)

PR #732 上で全チェック pass 実測済み: typecheck·lint·drift·tests / Coverage Report / Codecov Status / codecov/patch / CI Success / Cursor Bugbot。artifact `amadeus-test-size-report` の upload ステップは merge 済み ci.yml に配線(次回 main push の CI 実行から取得可能)。
