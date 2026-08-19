# Phase Boundary Verification — CONSTRUCTION → (workflow 終端)

対象 Intent: `260818-issue-3029-sensor-gate` / Scope: `self-fix` / Depth: Minimal
対象 Issue: [#3029](https://github.com/amadeus-dlc/amadeus/issues/3029)

## Artifact completeness

| Stage | Required artifacts | Status |
|---|---|---|
| code-generation(unit: sensor-gate) | code-generation-plan / code-summary / pr-convergence-report | Approved。変更面と受入条件が収束済み |
| build-and-test | build-instructions / unit-test-instructions / integration-test-instructions / performance-test-instructions / security-test-instructions / build-and-test-summary / build-test-results | Approved。対象テストと build/typecheck/lint が成功 |
| tla-authoring | applicability-assessment / applicability-receipt / human-approval | Approved。`impl-only` の terminal route |
| formal-model-check | check-outcome | `NOT_APPLICABLE`。TLC は起動しない |
| pr-convergence | pr-convergence-report | Approved。PR #3204 が converged、merge state は CLEAN |

ideation の全 stage、追加の inception stage、construction の functional-design / NFR 系 / infrastructure-design / CI pipeline は scope と実行計画により SKIP。存在しない成果物を補完しない。

## Requirements → 実装 → 検証のトレース

| Requirement | 実装 | 検証 | Status |
|---|---|---|---|
| FR-1 exit 127 の blocking gate 拒否 | `packages/framework/core/tools/amadeus-state.ts` の blocking evaluator | `t511` unit / integration | ✅ |
| FR-2 audit event schema 維持 | `packages/framework/core/tools/amadeus-sensor.ts` の既存 `SENSOR_PASSED` 契約を維持 | `t92` dispatcher truth table | ✅ |
| FR-3 `tool-unavailable` の fail-closed 意味付け | `evaluateBlockingSensors` の finding 判定 | `t511` unit / approve refusal | ✅ |
| FR-4 `spawn-failed` 分岐分離 | `amadeus-sensor.ts` の既存分岐を変更せず維持 | `t511` unit / `t92` | ✅ |
| FR-5 blocking severity 搬送維持 | sensor schema / plugin manifest / compiled graph | `t511` manifest-to-graph assertions | ✅ |
| FR-6 三層回帰テスト同期 | t511 unit・t511 integration・t92 | 111 tests / 0 fail | ✅ |
| FR-7 文書契約同期 | sensor schema / PR convergence sensor / `audit-format.md` | build-and-test の文書レビュー | ✅ |
| FR-8 変更面限定 | 許可面だけを変更 | code-summary と PR convergence attestation | ✅ |
| NFR-1〜5 | 既存監査互換性、fail-closed、決定性、最小変更、検証可能性 | build / typecheck / lint / targeted tests | ✅ |

orphan requirement は 0 件。FR/NFR は実装と検証へすべてトレースされる。

## Formal-model の判定

直前の `tla-authoring` applicability receipt は `impl-only` であり、対象は `FR-2` のみである。今回の変更は既存 audit event schema と blocking completion predicate の実装を修正するもので、TLA+ の状態遷移、不変量、model/config の意味を変更しない。

したがって `formal-model-check` は stage 契約の terminal applicability 分岐に従い、`NOT_APPLICABLE` を記録して TLC を起動しない。model-map の登録・改訂も行っていない。

## Consistency checks

- `SENSOR_PASSED` + `Note: tool-unavailable` の監査互換性と、`script-error: spawn-failed` の別分岐を維持している。
- blocking evaluator は `tool-unavailable` を正常な pass として消費せず、completion refusal に必要な finding を返す。
- `bun run build`、`bun run typecheck`、`bun run lint`、対象 t511/t92 が成功している。lint の warning 474 件は既存 warning である。
- 変更面は requirements が許可した core state gate、t511/t92 系テスト、sensor schema、audit-format、plugin sensor 文書に限定される。
- PR convergence report は PR #3204 の converged / CLEAN を記録している。

## Open issues

- なし。Bun や per-sensor script のインストール・PATH 自動修復は本 Intent の out of scope である。
