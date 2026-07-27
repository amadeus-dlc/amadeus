# Code Generation Plan — fix-1569-install-doc (260727-install-doc-mismatch)

上流入力(consumes 全数): requirements.md(inception/requirements-analysis — 本 plan の全 Step の導出元)。設計ステージ成果物(functional-design / nfr-design / infrastructure-design)と unit-of-work.md は amadeus-bugfix スコープの SKIP により不在(degrade 正常系)— 作業は requirements.md と codekb(architecture.md / code-structure.md の現在断面)からスコープした。user-stories も SKIP のため、各 Step は Issue #1569(= captured intent)へ遡及する。

- 実装ブランチ: `fix/1569-install-doc-mismatch`(origin/main 起点、worktree 分離 — cid:code-generation:solo-bolt-worktree-required)
- テスト戦略: Minimal(requirement-driven)
- トレーサビリティ: 全 Step → Issue #1569 / requirements.md FR-1〜FR-5

## Steps

- [x] **Step 1 (FR-2)**: `packages/framework/core/tools/amadeus-plugin.ts` — `.amadeus-plugin-src` リテラルを export された共有定数へ昇格し、`pluginSourceRootOf`(:278-279)がそれを参照する。命名・export 形式は近傍の既存 idiom(同ファイルの export 様式)に合わせる
- [x] **Step 2 (FR-1, FR-2)**: `scripts/plugin-projection.ts` — Step 1 の定数を import し、installDoc(:593)のコピー先を `<harnessDir>/plugins/<name>/` から `.amadeus-plugin-src/<name>/`(project root 相対、定数由来)へ変更。対象は folder-drop-auto / manual-only の copy 行のみ、native-manifest(claude)と manualComposeCommand(:557-559)は不変。`harnessDir` 引数の未使用化を実測し、未使用なら surgical に引数整理。修正後 `grep -c 'amadeus-plugin-src' scripts/plugin-projection.ts` の独立リテラル 0(定数参照のみ)を機械確認
- [x] **Step 3 (FR-5)**: リグレッションテスト — `tests/integration/t307-install-artifacts-classes.integration.test.ts` へ「installDoc 出力のコピー先 == discovery 走査パス(共有定数由来)」のアサートを追加(folder-drop-auto / manual-only の copy 行に `.amadeus-plugin-src/<name>/` が現れ、`<harnessDir>/plugins/<name>/` がコピー先として現れない。claude=native-manifest は copy 行なしを維持)。**落ちる実証**: 修正前文言の一時注入(テストが実際に読む面を注入前に実測確認)→ 赤の実測 → revert までを不可分1セットで実施し、コミットに残さない
- [x] **Step 4 (FR-3)**: dist 再生成 — `bun scripts/package.ts`(7ハーネス全て)+ `bun run promote:self`。INSTALL.md の実変化が6面(codex/cursor/kimi/kiro/kiro-ide/opencode)であることを diff で確認、claude 面は不変
- [x] **Step 5 (FR-4)**: docs — `docs/guide/19-plugins.md:183`(EN)と `docs/guide/19-plugins.ja.md:175`(JA)のコピー先記載を `.amadeus-plugin-src/<name>/` へ修正(対訳同期)
- [x] **Step 6 (NFR-2, NFR-3)**: 検証 — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / 対象テスト(t307 + plugin 系 t299/t302/t310/t311 と関連プロファイル)を全て実行し exit code を記録。ローカル lcov で diff 追加行の未カバー 0 を実測(spawn 盲点があれば in-process seam で回避)
- [x] **Step 7**: 本 plan のチェックボックス更新+`code-summary.md` 作成(変更ファイル・実装判断・テスト・逸脱の記録)

## 制約(builder への焼き込み事項)

- 割当 worktree 外での git 操作(checkout/stash/reset)禁止。scratch は repo 外で
- 要件・設計からの逸脱に気づいたら実装せず停止して報告(既存様式への準拠と判断する場合も停止対象)
- dist/ の手編集禁止(正本編集+再生成のみ)
- state 変更コマンド(amadeus-orchestrate report / amadeus-state / amadeus-log / amadeus-bolt)実行禁止
- モニタ/バックグラウンド待ちでターンを終えない — 検証は同期完遂し完了報告まで1タスク

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:30:31Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-5・NFR-2・NFR-3 は file:line・grep・exit code・lcov まで記録され検証劇場の兆候なし。落ちる実証の手順明確。plan/summary 完全一致、Open questions 2件解決。t258 是正は既決ガードへの機械的準拠で無申告逸脱に非該当。Minor 1件のみで READY。

### Findings

- [Minor] code-summary.md 検証セクション — NFR-1(挙動不変・解決値バイト同一)の直接確認記述が欠落。conductor が定数値同一性(:277)と join 同形(:285)の実測+t299/t302/t328/t338 全 pass の回帰確認を code-summary へ追記して是正済み
