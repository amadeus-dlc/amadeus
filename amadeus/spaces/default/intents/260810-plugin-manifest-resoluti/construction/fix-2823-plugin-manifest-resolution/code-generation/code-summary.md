# Code Summary — fix-2823-plugin-manifest-resolution

Intent: `260810-plugin-manifest-resoluti` / Unit: `fix-2823-plugin-manifest-resolution` / Depth: Minimal
Plan: `code-generation-plan.md`(Steps 1–8 全完了、checkbox マーク済み)

## Files modified

- `packages/framework/core/tools/amadeus-advisory-declaration.ts`
  - Added `resolvePluginManifest(projectRoot, stagingRoot, plugin, fs)` → `{ manifestPath, pluginRoot } | null`; candidate 1 = authoring face `<projectRoot>/plugins/<name>/plugin.json`, candidate 2 = staging face `<stagingRoot>/<name>/plugin.json`; `pluginRoot = dirname(manifestPath)`(FR-1)
  - Added `resolveEvaluatorArgv(argv, pluginRoot)`: relative path-like elements (not absolute, not `-`-prefixed, containing `/`) are joined to the plugin root; flags/values/bare commands/tokens untouched(FR-2)
  - Added `DeclarationWarn` + `defaultDeclarationWarn`(stderr) + `missingPluginManifestWarning(...)`; both `declaredAdvisoriesForPlugin` and `declarationFor` warn exactly once per plugin per call when no face holds a manifest, fail-open preserved(FR-4)
  - `declaredAdvisoriesForPlugin` / `declaredFormalCheckArgv` / `declaredHandoffStage` gained optional trailing `stagingRoot?` / `warn?` params (backward compatible); evaluator argv resolved via `resolveEvaluatorArgv` before `runEvaluator`; `spawnEvaluator` cwd unchanged(FR-2/FR-5)
  - `advisoriesForHost` computes `stagingRoot = join(hostRoot, PLUGIN_SOURCE_DIR_NAME)`(imported from `amadeus-plugin.ts`) and threads it + `warn` through(FR-1)
  - `pluginManifestPath` kept exported (compat); doc updated to "authoring face"
- `packages/framework/core/tools/amadeus-advisory-choice.ts`
  - `:735` `declaredHandoffStage` and `:955` `declaredFormalCheckArgv` call sites pass `join(activationHostRoot, PLUGIN_SOURCE_DIR_NAME)` as stagingRoot(FR-5)
  - `formalCheckRoute`(:914): hardcoded `"plugins/formal-model-check/tools/run-model-check.ts"` replaced by `resolvePluginManifest` + `join(pluginRoot, "tools/run-model-check.ts")`; when the plugin root cannot be located, falls back to the historical root-relative string and emits the same missing-manifest warn; signature gained optional `activationHostRoot`(FR-3)
- `plugins/formal-model-check/plugin.json`
  - `:61` evaluator argv `"plugins/formal-model-check/tools/tla-authoring.ts"` → `"tools/tla-authoring.ts"`(FR-3)
- `tests/integration/t445-advisory-declaration-supply.integration.test.ts`
  - FR-4 pin rewrite(:155-160): "no manifest on either face raises nothing **and warns once**"(warn spy injected)
  - New `declareAdvisoriesInStaging` fixture + `describe("...staging face (consumer layout)")`: staging-only supply + argv resolution, authoring-face precedence, `declaredHandoffStage`/`declaredFormalCheckArgv` from staging, lookup-without-manifest warns(FR-7(a)/FR-5)
  - New shipped-manifest test: both declared tool paths resolve to real files against the located plugin root(FR-3)
  - Fixture `HOLD_DECLARATION` evaluator argv moved to the plugin-root-relative convention (`tools/evaluate.ts`); `:117` seen-argv pin now expects the joined absolute path
- `tests/unit/t444-advisory-declaration.test.ts`
  - New `resolveEvaluatorArgv` unit cases (relative joined / flags+values untouched / absolute untouched / bare words+tokens untouched) and `resolvePluginManifest` unit cases (authoring wins / staging fallback / null / no-staging backward compat)
- `tests/integration/t353-plugin-install-verb.integration.test.ts`
  - New persistentInstall-arm join test: install into dot-dir harness → declaration reader finds the persisted authoring face, evaluator argv resolves to the real installed file, no warn; `declaredHandoffStage` returns `tla-authoring`(FR-7(b))
- `tests/integration/t532-plugin-manifest-argv-guard.integration.test.ts`(**new**)
  - Drift guard: git-tracked `plugins/**/plugin.json` walk — any string starting with `plugins/` fails; falling-proof + vacuity guard included(FR-6)

## Key decisions

- Warn channel fixed to one stderr line per plugin per call via injectable `warn`(default `process.stderr.write`), shared message builder so supply/lookup/runner-route never drift(reviewer NIT 反映)
- New optional params are trailing-only; every existing call site is source-compatible(NFR-1)
- `formalCheckRoute` fallback keeps the pre-fix root-relative string byte-for-byte when the manifest is unlocatable(degraded, never invented)
- Drift guard walks ALL string values in each manifest, not only argv arrays — same verdict, simpler predicate

## Test coverage

- `bun test tests/unit/t444-advisory-declaration.test.ts tests/integration/t445-advisory-declaration-supply.integration.test.ts tests/integration/t353-plugin-install-verb.integration.test.ts tests/integration/t532-plugin-manifest-argv-guard.integration.test.ts tests/integration/t526-advisory-handoff-stage.integration.test.ts tests/integration/t528-authoring-hold-end-to-end.integration.test.ts tests/integration/t529-advisory-hold-trace.integration.test.ts` → **exit 0**(87 pass / 0 fail)
- `bun test tests/integration/t458-advisory-auto-resolution.integration.test.ts tests/integration/t527-terminal-receipt-persist.integration.test.ts tests/integration/t445-tla-applicability-cli.integration.test.ts` → **exit 0**(38 pass / 0 fail)
- `bun test tests/integration/t-advisory-human-choice-boundaries.test.ts tests/unit/t203-mint-presence-classify.test.ts tests/unit/t113.test.ts`(+t528 in first run) → **exit 0**(98 pass / 0 fail)
- `bun run lint` → **exit 0**(457 warnings / 17 infos、全て pre-existing の complexity 系;touched files scoped biome check = 0 errors)
- `bun run typecheck` → **exit 0**

## Deviations from plan

- t445 `HOLD_DECLARATION` fixture argv was updated to the new plugin-root-relative convention and its seen-argv pin(:117)now expects the joined absolute path — NFR-1 の「既存テスト無修正」は FR-4 pin 以外にもう1か所及ぶが、FR-2 の argv 解決規約を導入する以上、root-relative fixture は規約違反(drift guard が赤にする対象)になるため必須の追随。挙動の pin(発火/非発火/argv vector 実行)は不変
- 同理由で t353 追加テストの `raised` 断言は「declared code が発火しないこと」に限定(fixture の裸 project では engine 自身の activation advisory `not-ready` が発火するため)
- `declaredFormalCheckArgv` が返す formalCheck argv 自体の plugin-root join は plan/contract の範囲外(evaluator argv のみ解決)のため未適用 — shipped manifest は `formalCheck: null` で実影响なし
- FR-8(consumer 実測)は plan 通り build-and-test stage へ引き継ぎ(本 stage 非対象)
