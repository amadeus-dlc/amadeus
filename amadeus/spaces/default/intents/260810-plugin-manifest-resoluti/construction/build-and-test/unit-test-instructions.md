# Unit Test Instructions — 260810-plugin-manifest-resoluti

Upstream: `construction/fix-2823-plugin-manifest-resolution/code-generation/code-generation-plan.md` / `code-summary.md`

## 対象

- `tests/unit/t444-advisory-declaration.test.ts` — `resolvePluginManifest` / `resolveEvaluatorArgv` の単体ケース(FR-1/FR-2)

## 実行

```sh
bun test tests/unit/t444-advisory-declaration.test.ts
```

## 期待

- exit 0、全件 pass。failing-first 証跡は `build-test-results.md` を参照(HEAD worktree での赤確認)
