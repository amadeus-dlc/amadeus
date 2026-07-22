上流入力(consumes 全数): code-generation-plan, code-summary

# ビルド・テスト実行結果(2026-07-22 実測)

## フルスイート

- コマンド: `bash tests/run-tests.sh --ci`(smoke + unit + integration tier)
- 結果: **RESULT: PASS、exit 0**(対象コミット `916c3d512`、bolt/state-intent-selector)
- 注記(非ブロッキング): size-annotation の wall-clock drift 2件(`t-codex-hooks-migration` declared=medium measured=large 42.9s / `t225-upstream-v2-migration-preflight` 同 33.4s)— 実行機速度由来の既知クラスで本変更と無関係(code-summary の申告事項と同一帰属)

## 対象スイート(個別実測)

| コマンド | 結果 |
|---|---|
| `bun test tests/integration/t256-state-intent-selector.test.ts` | 16 pass / 0 fail |
| `bun test t256 + t199 + t145`(再接地後) | 31 pass / 0 fail |
| `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` | すべて exit 0 |
| `bun tests/coverage-patch-gate.ts --check` | exit 0(added 63 / covered 63 / uncovered 0) |
| `bun tests/coverage-project-gate.ts --check` | exit 0(current 79.11% / baseline 40.94%) |
| `bun tests/gen-coverage-registry.ts --check` / `bun tests/complexity-gate.ts --check` | exit 0 |

## センサー最終 verdict

linter / type-check とも `packages/framework/core/tools/amadeus-state.ts` に対し SENSOR_PASSED(fire id 84789aac / ae030109、09:25Z — 作業中間の FAILED 2件は最終状態で解消済みであることを手動再発火で確定)
