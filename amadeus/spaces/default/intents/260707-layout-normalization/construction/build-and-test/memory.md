# Build and Test Memory

## Interpretations

- 2026-07-07T07:35:55Z — Issue #610 の code-generation-plan と code-summary は全 unit が documentation-only と記録しているため、Build and Test は新規テスト追加ではなく既存 guard の実行確認を主対象にする。
- 2026-07-07T07:35:55Z — Standard test strategy だが、対象が runtime code ではないため、unit/integration/performance/security instruction は「必要条件と実行対象」を明示し、不要な新規テスト作成は行わない。

## Deviations

- 2026-07-07T07:35:55Z — `bun run typecheck` は初回 `tsc: command not found` で失敗した。`node_modules` がない環境要因と判断し、`bun install --frozen-lockfile` 実行後に再実行して成功を確認した。
- 2026-07-07T07:35:55Z — `bun run lint` は終了コード 0 だが既存 test files の Biome warning を出した。今回の docs/layout intent と直接関係しないため修正せず、結果として記録する。

## Tradeoffs

- 2026-07-07T07:35:55Z — full `--ci` test suite は今回の docs-only diff に対して過大と判断し、docs legacy refs gate の targeted unit test と drift/type/lint guard を組み合わせた。
- 2026-07-07T07:35:55Z — `dist:check` と `promote:self:check` は docs-only では必須ではないが、Issue #610 の中心が workspace layout contract であるため、配布物と self-install surface の drift guard として実行した。

## Open questions

- 2026-07-07T07:35:55Z — repo-wide lint warning が既存 debt として残っている。別 intent で lint baseline を整理するかは未決定。
