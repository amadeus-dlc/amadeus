# Integration Test Instructions — 260810-plugin-manifest-resoluti

Upstream: `construction/fix-2823-plugin-manifest-resolution/code-generation/code-generation-plan.md` / `code-summary.md`

## 対象

- `tests/integration/t445-advisory-declaration-supply.integration.test.ts` — FR-4 pin(非発火 + warn 発行)、consumer-layout(staging 面)からの供給(FR-1/FR-5)
- `tests/integration/t353-plugin-install-verb.integration.test.ts` — persistentInstall=true 腕の join(FR-1/FR-2)
- `tests/integration/t532-plugin-manifest-argv-guard.integration.test.ts` — drift guard(FR-6)
- 回帰: t526 / t528 / t529 / t458 / t527 / t445-tla-applicability-cli / t-advisory-human-choice-boundaries / t203 / t113

## 実行

```sh
bun test tests/integration/t445-advisory-declaration-supply.integration.test.ts \
         tests/integration/t353-plugin-install-verb.integration.test.ts \
         tests/integration/t532-plugin-manifest-argv-guard.integration.test.ts \
         tests/integration/t526-advisory-handoff-stage.integration.test.ts \
         tests/integration/t528-authoring-hold-end-to-end.integration.test.ts \
         tests/integration/t529-advisory-hold-trace.integration.test.ts
bun run test:ci   # 全体回帰(smoke+unit+integration)
```

## 期待

- 全件 exit 0。FR-8(consumer 実測)の手順と結果は `build-test-results.md` に記録
