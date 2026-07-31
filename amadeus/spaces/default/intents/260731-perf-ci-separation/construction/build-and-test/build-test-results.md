# Build Test Results — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。

## 実測ログ(2026-08-01、conductor 実行・exit code は個別取得)

- `bash tests/run-tests.sh --ci` → exit 0(Test files 716 / Failed files 0 / Total assertions 9812 / Failed assertions 0 / RESULT: PASS)
- `bash tests/run-tests.sh --perf` → exit 0(Test files 6 / Failed files 0 / RESULT: PASS)
- `bun run typecheck` → exit 0
- `bun run lint` → exit 0
- `bun run dist:check` → exit 0
- `bun run promote:self:check` → exit 0
- CI 対照: main push run 30665853396(head 150634197)= success / 4 PR の CI Success 全 green(#1848: 67ca151b5、#1851: cb452fd2f、#1855: 2b1490261、#1859: 150634197)
