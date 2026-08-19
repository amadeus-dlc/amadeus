# Code Summary — sensor-gate

- **変更ファイル**: `packages/framework/core/tools/amadeus-state.ts`、`packages/framework/core/tools/amadeus-sensor-schema.ts`、`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md`、`tests/unit/t511-blocking-sensor-severity.test.ts`、`tests/integration/t511-blocking-sensor-gate.integration.test.ts`。
- **変更**: `amadeus-state.ts` の blocking evaluator に `tool-unavailable` finding を追加し、blocking completion を拒否。
- **監査互換性**: dispatcher の exit 127 → `SENSOR_PASSED` + `Note: tool-unavailable` と、spawn-failed の分岐は維持。t92 Group E test 19 の `script-error: exit-2` は別の spawn 後非ゼロ分岐として扱う。
- **テスト**: t511 unit は `SENSOR_PASSED with Note tool-unavailable fails closed for blocking sensors` と `spawn-failed remains a distinct script-error and is rejected by the blocking gate` を検証。後者は `spawnFailedOutcome("ENOENT", 1)` が `script-error: spawn-failed: ENOENT` を返し、blocking evaluator が `script-error` finding を返すことを固定する。t511 integration は approve refusal と state 未変更を検証。t92 は exit 127 の audit note 契約を検証。
- **文書**: sensor schema、GitHub PR convergence sensor、audit-format に blocking guard の diagnostic semantics を追記。
- **検証**: `bun run build`、`bun run typecheck`、`bun run lint`、対象 t511/t92（111 pass / 0 fail）を実行。lint は既存 warning 474 件のみで exit 0。
- **変更面**: 許可された core state gate、t511/t92 系テスト、sensor schema/audit-format/plugin sensor のみ。禁止面は未変更。
- **設定**: 既存の Bun test / `tsconfig.json` / `tsconfig.tests.json` / Biome 設定を利用し、設定変更なし。
- **未解決**: なし。PR 作成・CI 収束は後続 pr-convergence stage の責務。
