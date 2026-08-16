# Code Generation Plan — pi-distribution(#2363)

方式 = D2(kimi 先例踏襲 + 2 方向検証)。traceability: 全 step → FR-PI-1〜3。depth Minimal。クロスレビュー成立済み(ESTABLISHED_WITH_REFINEMENTS — 実害は self-install 経路のみ、model ピン主張は不成立、persona 15)。

- [ ] Step 1: TDD Red — 固定件数ピンの 3 テスト(`t-plugin-projection-packaging.test.ts:148-149`、`t-plugin-projection.test.ts:308`、`t209-promote-self-dangling-symlink.test.ts:143-150`)の期待集合を pi 込みへ更新し Red を実測(FR-PI-3 の Red 点)。あわせて vendor 非脱落(`git ls-files` 前後一致)と `.pi/agents` 集合一致(件数フリー、dist との parity)の検証をテストへ追加
- [ ] Step 2: 3 面へ pi を追加 — `scripts/plugin-projection.ts:59` `SELF_INSTALL_HARNESSES`、`scripts/promote-self.ts:64-71` `managedDirs`({ src: "dist/pi/.pi", dst: ".pi" })、`packages/framework/core/tools/data/self-install-allowlist.ts:12-19` `GENERATED_SELF_INSTALL_ROOTS`(FR-PI-1)。pi dot-gitignore の `!/.pi/vendor/` と生成 ignore の両立(FR-PI-2)
- [ ] Step 3: `bun run build` + promote-self 実行 → 配送先述語の実測: `.pi/agents/` 集合 = `dist/pi/.pi/agents/` 集合、`amadeus-architecture-reviewer-agent.md` の `tools: read, grep, find, ls` 逐語、`bun run source-only:check` green、`git status` 追跡汚染 0 件、vendor `git ls-files` 前後一致(FR-PI-1/2)
- [ ] Step 4: docs 同期 — `docs/reference/11-contributing.md:47` の self-install ルート列挙(en/ja)ほか関連面へ pi を追加(FR-PI-3)
- [ ] Step 5: 台帳 resync(テスト変更 → coverage-registry regen 要否確認)+ core 正本変更のため全ハーネス build 不変検査
- [ ] Step 6: typecheck / lint / 対象テスト(Step 1 の Green 化)→ commit → push → PR 作成(push-first)
