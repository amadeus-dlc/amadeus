# Build/Test 実行結果

## 上流参照

全9 Unit の `code-generation-plan.md` と `code-summary.md` に記載された実装・検証項目を、2026-08-03にIntentブランチ `source-only-dist` で再検証した。

## Build結果

| コマンド | 結果 | 証跡 |
|---|---|---|
| `bun run build` | PASS | 7 harnessの配布面を再生成し、self-install更新に成功 |
| `bun run source-only:check` | PASS | `source-only boundary: clean` |
| `bun run distribution:check` | PASS | 412 payloads、registry `23529fe0aafd`、4 documents / 44 topics、416 files |
| `bun run typecheck` | PASS | 2つのtsconfigでエラー0 |
| `bun run lint` | PASS | 終了コード0、既知warning 390、info 11 |

## Test結果

| 実行 | Pass | Fail | Skip/制約 |
|---|---:|---:|---|
| `bun run test:ci` | 765 / 766 files | 1 timeout file | live AWS/Claude substrateテストは環境に応じてskip |
| assertions | 10,326 / 10,327 | 1 timeout扱い | assertion内容の不一致は0 |
| `bun test --timeout 120000 tests/integration/t-team-up-codex-resume.serial.test.ts` | 57 | 0 | 0 |

初回失敗は `team-up run lifecycle > continue reuses the current run worktrees and restores its runtime` の15秒timeoutである。隔離再実行では8.57秒で成功し、ファイル全体も116.61秒で57 pass / 0 failとなった。constrained VMで既知の並列負荷timeoutに一致し、再現する機能欠陥ではない。

## CoverageとCI証跡

[PR #2140](https://github.com/amadeus-dlc/amadeus/pull/2140) のCoverage Report、base/head coverage、Tests、Typecheck、Lint、Reproducible build、Source-only and graph invariantsは成功した。[PR #2148](https://github.com/amadeus-dlc/amadeus/pull/2148) でもTests、Typecheck、Lint、Reproducible build、Source-only and graph invariants、plugin E2E、Intent Mirror contractが成功した。

ローカルBuild and Testの最終判定は **PASS**。未解決failureは0である。
