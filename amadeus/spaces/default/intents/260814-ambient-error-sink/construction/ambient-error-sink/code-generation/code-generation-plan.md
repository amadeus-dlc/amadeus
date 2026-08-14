# Code Generation Plan — ambient-error-sink(Issue #3004)

> スコープ: self-fix(units-generation SKIP)。要件 `<record>/inception/requirements-analysis/requirements.md` FR-1〜FR-7 から直接スコープ。User stories SKIP のため各ステップは FR へ遡る。変更対象: `packages/framework/core/tools/amadeus-orchestrate.ts` + 新規回帰テスト1ファイル(`tests/integration/`)。

## Steps

- [ ] Step 1: TDD 落ちる実証(→ FR-4) — 新規回帰テスト(env 段 undefined 形、t258 直系: ambient fixture + argv 中和 + OTel リセット)を先に書き、**未修正コードで赤**(ambient fixture の shard 1件 ≠ 期待の空)を実測。marker 段テスト(t481 idiom)も同時に書き赤を実測(→ FR-5)。
- [ ] Step 2: main の dispatch 前解決(→ FR-1) — `main()` の4 dispatch 呼出で `resolveProjectDir(projectDir)` を適用(式置換、CCN +0)。
- [ ] Step 3: in-process 3入口の fail-closed 拒否(→ FR-2) — `handleNext`(既存ガード `refuseBlockedNextEnvironment` へ畳み込み、本体 CCN 不増)/ `handleReport` / `handleFailureRuling` の冒頭で `projectDir === undefined` を検出し `emitStateNeutralError` 形で early return。新規ヘルパは CCN ≤ 15。文言は英語で projectDir 明示を要求(新規)。
- [ ] Step 4: handlePark の型狭め(→ FR-3) — `projectDir: string` へ(ランタイムガードなし)。
- [ ] Step 5: `bun run build`(core 変更 → 全ハーネス dist 再生成、追跡ファイル不変確認)→ 新規テスト green(shard 空+拒否 directive)、t214(dist import)/t258 単独 green(→ FR-6 前半)。
- [ ] Step 6: 検証 — 対象テスト群単独、`bun run typecheck`、`bun run lint`。フルスイートは conductor が build-and-test で1回通す(→ FR-6 後半)。

## Traceability(step → FR)

Step 1 → FR-4/FR-5 / Step 2 → FR-1 / Step 3 → FR-2 / Step 4 → FR-3 / Step 5-6 → FR-6。FR-7(PR・収束)は pr-convergence ステージで実施。

## Test configuration

既存ランナー構成不変。新規テストは `tests/integration/` に1ファイル追加(test path 集合へ自然編入、`.serial.` 不要 — 全 fixture が自前 temp dir)。
