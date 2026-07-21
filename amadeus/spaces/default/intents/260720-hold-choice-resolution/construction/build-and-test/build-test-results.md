# Build Test Results — tie-choice-resolution

上流入力: `construction/tie-choice-resolution/code-generation/code-generation-plan.md`、`construction/tie-choice-resolution/code-generation/code-summary.md`。

## 実行結果

| 検証 | 確定値 | 判定 |
| --- | --- | --- |
| `bun run typecheck` | exit 0 | PASS |
| `bun run lint` | exit 0、error 0（既存 warning 208 / info 16） | PASS |
| `bun run dist:check` | exit 0、6 harness tree 同期 | PASS |
| `bun run promote:self:check` | exit 0 | PASS |
| 関連回帰6ファイル | 36 tests / 260 assertions / 0 fail、exit 0 | PASS |
| `bun run coverage:ci` | 391 files / 5,525 assertions / 0 fail、exit 0 | PASS |
| `bun tests/coverage-project-gate.ts --check` | 71.7514%、baseline 40.9395%、+30.8119pp、exit 0 | PASS |
| `AMADEUS_PATCH_BASE_REF=origin/main bun tests/coverage-patch-gate.ts --check` | measured 24 / covered 24 / allowlisted 0 / uncovered 0、exit 0 | PASS |

全量 suite では Claude substrate が必要な23ファイルを runner の既定判定で SKIP した。今回の変更面は substrate 非依存であり、新規 unit/integration と関連 e2e を含む6ファイルを別途全数実行している。wall-clock drift は既存 `t-codex-hooks-migration.test.ts` 1件のみで、assertion failure ではない。

## 失敗経路と是正

初回の関連回帰コマンドで `t236` / `t242` の配置を unit と誤記したため、Bun は存在しない引数を失敗にせず4ファイルだけを実行した。出力の `Ran 19 tests across 4 files` と期待6ファイルの不一致で自己捕捉し、実在パスを `rg --files tests` で再解決して integration 配下へ訂正した。訂正後は上表どおり6ファイル、36 tests / 260 assertions を exit 0 で実測した。最終報告値に初回値は使用しない。

## 追補規範の適用開始

2026-07-20T07:58:31Z に origin/main の merge commit `3b1f13469` を取り込み、memory 層（org / team / project / construction / build-and-test）を再読した。`cid:build-and-test:test-path-set-completeness` を本ステージから適用する。上表の関連回帰は、実行前に6 path の実在を `rg --files tests` で確認し、実行後に期待6ファイルと runner の `Ran ... across 6 files` を照合済みである。

## 判定

**PASS** — build、静的検査、関連回帰、全量回帰、project/patch coverage の全ゲートが green。二値・構文不正・非実在 choice の拒否と失敗時の tally bytes 不変を含み、PR レビュー開始条件を満たす。
