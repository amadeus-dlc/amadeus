# PR Convergence Report

## 判定

本 Unit のローカル実装と検証を完了した。PR の作成・レビュー・CI 収束は後続の pr-convergence stage で実施する。

## 実行証拠

- Unit: `sensor-gate`
- Requirements: `FR-1`〜`FR-8` を実装面・テスト面・文書面へ追跡。
- Build: `bun run build` — 成功。
- Typecheck: `bun run typecheck` — 成功。
- Lint: `bun run lint` — 成功（既存 warning 474 件、exit 0）。
- Target tests: `bun test --timeout 120000 tests/unit/t511-blocking-sensor-severity.test.ts tests/integration/t511-blocking-sensor-gate.integration.test.ts tests/integration/t92.test.ts` — 111 pass / 0 fail。
- Blocking regression: exit 127 の `tool-unavailable` が t511 unit/integration で refusal となり、state を変更しないことを確認。
- Audit regression: t92 が `SENSOR_PASSED` + `Note: tool-unavailable` を維持することを確認。
- Spawn-failed separation: t511 unit `spawn-failed remains a distinct script-error and is rejected by the blocking gate` が `spawnFailedOutcome("ENOENT", 1)` → `script-error: spawn-failed: ENOENT` と blocking evaluator の `script-error` refusal を検証。t92 Group E test 19 の exit 2 は別分岐としてのみ確認し、spawn-failed の証拠には使用しない。
- Test configuration: 既存の Bun test、`tsconfig.json` / `tsconfig.tests.json`、Biome 設定を確認し、設定ファイルの変更なし。
