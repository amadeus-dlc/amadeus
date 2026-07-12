# Business Rules — U1

1. tests-totals.json のキーは `{ files, failedFiles, assertions, failedAssertions }` の4キー固定(U2 との契約 — design 固定済み)。
2. 値は SUMMARY 表示と同一のカウンタから導出(二重集計を作らない — canonical 1定義)。
3. 出力先は coverage-totals.json と同一ディレクトリ(coverage/)。--coverage 実行に限らず --ci 実行で常に書く(テスト数はカバレッジ非依存)。
