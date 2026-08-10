# Build and Test Memory

## Interpretations

- 2026-08-10T17:24:17Z — Code Generation の最終差分に対して直前に完走した `TEST_TIME_FACTOR=2 bun run test:ci` は Build and Test の unit / integration / e2e 実測として再利用した。同一workspace・同一差分で、結果ログが972 files / 13063 assertions / failure 0を保持しているため。

## Deviations

- 2026-08-10T17:24:17Z — ステージ本文の `test-results.md` ではなく、エンジンdirectiveが要求した `build-test-results.md` を生成した。エンジンがroutingとartifact存在判定の唯一の権威であるため。

## Tradeoffs

- 2026-08-10T17:24:17Z — DASTとサービス負荷試験は実行せず、CLIの入力境界・性能閾値分離・静的検査を採用した。本変更はBun-only test infrastructureであり、常駐サービス、認証面、新規依存関係を追加しないため。

## Open questions

