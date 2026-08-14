# Code Generation Plan — unit fmc-macos-provider(intent 260814-fmc-macos-provider)

対象: Issue #2361 / requirements.md FR-1〜FR-7。depth Minimal / Test Strategy Comprehensive(TDD 必須、実 TLC・Docker 実行なし — fake port / タイミングシームで検証)。

## 設計決定: フォールバック挿入点 = (b') 合成 planner(auto 専用、planner 層で完結)

RE scan §4-1 の3択の裁定(要件 Open Question の委任先=本計画):

- **(c) 選択時の同期 probe のみ** — JDK バージョン不一致(#2361 の実観測ケース)を捕まえられないことが実測確定済み。棄却。
- **(a) selectTlcSpawnPlanner の async 化 + 可用性 probe 前倒し** — signature 変更が referee 経路(`tla-referee-toolchain.ts:224`、platform 未注入)へ波及し、inspectDarwin が probe と snapshot の2回走る(JDK 起動2回)。棄却。
- **(b') 採用: auto 時のみ合成 planner(`AutoTlcSpawnPlanner`)を返す** — `selectTlcSpawnPlanner` は同期のまま、auto+darwin では「sandbox-exec を先に試し、`snapshotEnvironment` 失敗時に docker planner で再試行する」合成 planner を返す。フォールバックの意思決定が planner 選択層に留まり(toolchain 側へ漏れない)、実走 planner の receipt がそのまま使われるため FR-4(receipt=実走 provider)が構造的に成立する。auto+非darwin は従来どおり docker 単独。明示 provider は従来どおり単一 planner(FR-3)。
- 判断の割れ: なし((b') が surgical性・signature 不変・JDK 単回起動・receipt 整合の全軸で優位)。ソロ選挙は不要と判断し、本計画の梯子裁定(plan 承認)に含めて確定する。

## Plan 承認

full autonomy ladder による AUTO_DECIDED(`auto-decision-0230a868e7cb52b2315e78a40c423701`、2026-08-14、recommendation 採用・solo-election 不在の loud degradation 記録)。挿入点 (b') の採用と TDD 10 ステップを含めて承認。

## 実装ステップ(TDD: 各ステップ Red → Green の vertical slice)

- [ ] Step 1: Bolt worktree 準備 — `git worktree add`(base `origin/main`、branch `fix-2361-fmc-provider-fallback`)+ `bun install` + `bun run build`(source-only 境界下の自己インストール面再生成)
- [ ] Step 2(FR-5 Red→Green): JDK major 26 受理の失敗テストを追加(`26.0.2` 受理 / `25.x`・`27.x` 拒否)→ 6面を緩和: (A) `FIXED_JDK_RUN_PROFILE.version` の意味を major 契約へ(`majorVersion: "26"`)、(B) `createJdkDistributionManifest` の比較を major 一致へ、(C) `JdkDistributionManifest` 型リテラルの拡張、(D) `tlc-spawn-planner.ts:152` の正規表現、(E) `fs-tlc-toolchain.ts:1331` の正規表現、(F) `DARWIN_INSPECTION_PLAN` expected 文字列。エラー文言も major 契約表現へ更新
- [ ] Step 3(FR-5 続き): エラー文言依存の既存テスト(`t-formal-verif-run-model-check.integration.test.ts:263-272` 等)と値転記テスト(`t-formal-verif-tlc-toolchain.test.ts` / `t401` / `tla-toolchain-harness.ts`)を新契約へ更新
- [ ] Step 4(FR-1 Red→Green): auto+darwin フォールバックの失敗テストを追加(darwin 検査失敗 + docker 検査成功 → docker 経路で成立、planner 種別まで assert)→ `AutoTlcSpawnPlanner` 実装 + `selectTlcSpawnPlanner` の auto 分岐置換
- [ ] Step 5(FR-2 Red→Green): 両検査失敗 → `ENVIRONMENT_UNAVAILABLE` + errorDetail に両理由包含のテスト → 実装
- [ ] Step 6(FR-3/FR-4 Red→Green): 明示 provider 非フォールバック + fallback 経路 receipt 整合(`createNotRunPlannerReceipt` の auto 判定と選択の同期維持)のテスト → 実装
- [ ] Step 7(FR-6): README 内部矛盾の統一(`:60-62` / `:74-79` を major 26 契約へ)+ `mise.toml:3-5` コメント更新(ピン値は維持 — 裁定 Q1=A)。patch 完全一致宣言の残存ゼロを grep で確認
- [ ] Step 8: coverage patch allowlist の意味的セレクタ fingerprint 再計算(`tests/.coverage-patch-allowlist.json:1469-1477`、患部 128-185 行の編集に追随)
- [ ] Step 9: Bolt worktree で検証 — `bun run typecheck` / `bun run lint` / 関連テスト(unit: t-formal-verif-tlc-spawn-planner・tlc-toolchain、integration: t-formal-verif-run-model-check ほか formal-verif 系)
- [ ] Step 10: conductor ツリーへ取込(mirror)→ `bun run build` → フルスイート `bash tests/run-tests.sh --ci` を conductor が実行(cid:code-generation:c3-conductor-runs-full-suite / c1-mirror-and-rebuild-before-review)

## トレーサビリティ(step → FR / intent)

- Step 2-3 → FR-5, FR-6(文言), FR-7 / Step 4 → FR-1 / Step 5 → FR-2 / Step 6 → FR-3, FR-4 / Step 7 → FR-6 / Step 8 → Constraints(fingerprint) / Step 9-10 → FR-7(検証)
- user stories はスコープ SKIP のため、各 step は Issue #2361 + requirements.md の FR へ直接対応付ける(degraded input の記録)

## 触ってよいファイル(owned set)

`plugins/formal-model-check/tools/{tlc-spawn-planner,tlc-toolchain,fs-tlc-toolchain,run-model-check}.ts`、`plugins/formal-model-check/README.md`、`mise.toml`(コメントのみ)、`tests/unit/t-formal-verif-*.test.ts`、`tests/unit/t401-directive-and-toolchain-rejections.test.ts`、`tests/integration/t-formal-verif-*.integration.test.ts`、`tests/formal-verif/support/*.ts`、`tests/.coverage-patch-allowlist.json`(該当エントリのみ)。それ以外への変更は禁止(要件 Constraints)。

## 検証コマンド(受入)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`(フル)/ 落ちる実証は TDD の Red 実測で担保(注入→赤→revert の1セット規律は新設ゲートがないため通常 TDD Red で足りる)
