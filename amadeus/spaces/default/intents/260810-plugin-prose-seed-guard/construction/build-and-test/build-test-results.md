# Build Test Results

## Upstream

- `construction/fix-2810-prose-tokenization/code-generation/code-generation-plan.md`
- `construction/fix-2810-prose-tokenization/code-generation/code-summary.md`

## このステージで実行した検証

| コマンド | Exit | 結果 |
|---|---:|---|
| `bun run build` | 0 | 8 harness dist と self-install を再生成 |
| `bun run typecheck` | 0 | production / tests とも型エラー0 |
| `bun run lint` | 0 | error 0、既存 warning 457 / info 17 |
| `bun test tests/unit/t146-core-hygiene.test.ts` | 0 | 6 passed / 0 failed / 18 assertions |
| `bun test --timeout 180000 <t532> <t2790>` | 0 | 15 passed / 0 failed / 169 assertions |
| `git diff --check` | 0 | whitespace error 0 |

## Consumer A/B 再演

| 形 | Exit | 観測 |
|---|---:|---|
| 旧 `plugins/formal-model-check/tools/run-model-check.ts` | 1 | `Module not found` |
| 新 `.codex/plugins/formal-model-check/tools/run-model-check.ts` | 2 | CLI 本体が `HARNESS_ERROR (MISSING_ARG)` を返却 |

新形の exit 2 は引数を意図的に渡さない再演の期待値であり、CLI 本体へ到達した証拠である。旧形の consumer 解決失敗は再現せず、FR-5(b) / AC-5(b) を満たす。

## 直前の Code Generation から継承した全体結果

- `bun run test:ci`: exit 0、959 files、12,870 assertions、failed 0
- `bun run coverage:ci -- -P 4`: exit 0、959 files、12,870 assertions、failed 0
- project coverage gate: exit 0、92.8424%（minimum 90%）
- distribution / source-only / graph compile / coverage registry / complexity / plugin-conformance E2E: exit 0

## 未実施

- patch coverage: clean committed tree と base ref が必要なため commit 後 CI
- isolated reproducible-build: commit 済み SHA が必要なため commit 後 CI
- formal-model-check: 本 Intent の scope では SKIP。エンジン advisory は別 stage 実行を案内済み
