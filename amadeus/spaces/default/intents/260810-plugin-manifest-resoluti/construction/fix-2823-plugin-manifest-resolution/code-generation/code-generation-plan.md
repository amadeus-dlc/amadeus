# Code Generation Plan — fix-2823-plugin-manifest-resolution

Intent: `260810-plugin-manifest-resoluti` / Unit: `fix-2823-plugin-manifest-resolution` / Depth: Minimal / Test strategy: Comprehensive(self-fix 既定)
Consume: `inception/requirements-analysis/requirements.md`(FR-1〜8 / NFR-1〜3)。units-generation・functional-design 等は scope SKIP のため非存在(欠落ではない)

## 設計確定事項(requirements の Q 裁定 + reviewer FOLLOW-UP 反映)

- 解決規約: manifest 探索は authoring 面 `<projectRoot>/plugins/<name>/plugin.json` を第1候補、staging 面 `<hostRoot>/.amadeus-plugin-src/<name>/plugin.json` を第2候補。採用された manifest の dirname を **pluginRoot** として返す
- argv 解決: 相対かつ path 様の要素(絶対パスでない・`-` 始まりでない・`/` を含む)を pluginRoot へ join する。フラグとその値(`--model` 等)は対象外 — path separator を含まないため自然に除外される(reviewer FOLLOW-UP の区別規則)
- loud 化チャネル: **stderr 警告**1本に確定(reviewer NIT 反映。監査イベントは別機序への依存が大きく Minimal の範囲を超える)。inject 可能な `warn` を既定 `process.stderr.write` で用意し、テストから spy できるようにする
- `declarationFor` 系・activation `:925` も同一 resolver に乗せる

## Steps

- [x] Step 1: `amadeus-advisory-declaration.ts` に manifest 多面 resolver 追加 — `resolvePluginManifest(projectRoot, stagingRoot, plugin, fs)` が `{ manifestPath, pluginRoot } | null` を返す。`pluginManifestPath` は後方互換のため残し、内部で resolver を使う
- [x] Step 2: argv 解決 helper `resolveEvaluatorArgv(argv, pluginRoot)` を同ファイルに追加(相対 path 様要素を join)
- [x] Step 3: `declaredAdvisoriesForPlugin` / `declarationFor` / `declaredFormalCheckArgv` / `declaredHandoffStage` に optional `stagingRoot` を通し、evaluator argv を Step 2 で解決してから `runEvaluator` へ渡す。manifest 不在時は `warn` を発行(fail-open セマンティクス維持)
- [x] Step 4: `advisoriesForHost` が `stagingRoot = join(hostRoot, ".amadeus-plugin-src")` を計算して渡す(定数は `amadeus-plugin.ts` の `PLUGIN_SOURCE_DIR_NAME` を import)
- [x] Step 5: `amadeus-advisory-choice.ts` — `:735` / `:955` の呼出に stagingRoot を渡す。`:925` の直書き argv を同一 resolver 経由の plugin-root-relative 解決へ変更
- [x] Step 6: `plugins/formal-model-check/plugin.json:61` を `"tools/tla-authoring.ts"` へ修正
- [x] Step 7: テスト — (a) t445 系に consumer-layout(staging のみ)の advisory 供給テスト追加 + `:155-160` の pin を「非発火 + warn 発行」へ書き直し、(b) declarationFor 系の staging 解決テスト、(c) `resolveEvaluatorArgv` の単体テスト、(d) drift guard: `plugins/**/plugin.json` 内の `"plugins/` 始まり文字列を検出する新規テスト
- [x] Step 8: 検証 — `bun run lint` / `bun run typecheck` / 対象テストファイルの `bun test` が緑

## Traceability(step → FR)

- Step 1,3,4 → FR-1 / Step 2,3 → FR-2 / Step 5,6 → FR-3 / Step 3(warn),7(書き直し) → FR-4 / Step 3,5 → FR-5 / Step 7(d) → FR-6 / Step 7(a-c) → FR-7 / Step 8 → NFR-1(既存テスト無修正緑は FR-4 pin を除く)
- FR-8(consumer 実測)は build-and-test stage の責務として引き継ぐ

## 非対象(NFR-3)

- `harness-transform.ts` / `amadeus-plugin.ts:671` の拡張子限定、`amadeus-plugin-compose.ts` の digest 経路には触れない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:48:52Z
- **Iteration:** 1
- **Scope decision:** none

Plan/summary/report satisfy the contract: 8 steps traced to FRs, Comprehensive-strategy tests present, verification claims exit-code-qualified, no BLOCKERs

### Findings

- FOLLOW-UP | code-summary.md:Deviations | FR-7 failing-first の赤 half が未記録。build-and-test で事前赤を捕捉する
- FOLLOW-UP | code-summary.md:Deviations | declaredFormalCheckArgv の formalCheck argv は plugin-root join 対象外。formalCheck 宣言時に同クラスが潜伏。フォローアップ起票候補
- NIT | code-summary.md:Deviations | t445 fixture argv 書き直しの理由付けが不正確(真の理由は FR-2 の join で旧 pin が壊れること)。偏差自体は妥当
