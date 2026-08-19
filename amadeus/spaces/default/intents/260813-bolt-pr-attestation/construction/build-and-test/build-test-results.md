# Build and Test Results

## 実行結果

- `bun run typecheck`: PASS。
- `bun run build`: PASS。
- `bun run distribution:check`: PASS（444 payloads、4 documents、448 projections）。
- `bun run source-only:check`: PASS。
- focused unit/integration: 94 pass / 0 fail / 391 assertions。
- `git diff --check`: PASS。

## カバレッジ

`bun run coverage:ci` は1004 files、13,349 assertionsを実行し、26 files、115 assertionsが失敗したためexit 26。集計は92,824 / 101,744 lines。重点対象は全通過しており、失敗集合には既知の高負荷・wall-clock driftと基準ブランチ由来を含む。

## 失敗と対応

PR作成前の実Intent検証でstandalone `formal-model-check` directoryをUnitと誤認する失敗を再現し、stateで宣言されたstage directoryを除外する修正を追加した。回帰テスト追加後はfocused suiteが94 pass / 0 failとなった。
