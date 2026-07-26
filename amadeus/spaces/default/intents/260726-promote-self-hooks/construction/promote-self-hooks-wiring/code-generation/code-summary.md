# Code Summary — promote-self-hooks-wiring

実施場所: bolt worktree `.amadeus/worktrees/bolt-promote-self-hooks-wiring` (以下 WT)。本サマリのパスはすべて WT 相対。計画は code-generation-plan.md の Step 1〜6 すべて完了 ([x] 済)。

## 作成/変更ファイル

- `scripts/promote-self.ts` — FR-1: apply 経路の dist 同期完了後に `mergeKimiHooks` を実行 (新規関数、`dist/kimi/.kimi-code` 存在時のみ発火)。`runHooksMerge` / `resolveKimiHome` / `renderHooksError` を `packages/setup/src/modules/kimi-hooks.ts` から import し、ports は `createFsRead` / `createFsWrite` / `createApplyWrite` + tty 自動承認 (`confirm: async () => true`, `interactive: true` — OC-1 契約)。snippet は正本 `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml` を repoRoot 相対で読む。失敗時は `renderHooksError` を表示し非ゼロ終了。`--check` 経路は無変更 (hermetic 維持)。`promoteSelfMain` は async 化 (シグネチャ `(argv, repoRoot, freshness)` 維持)。
- `packages/framework/core/tools/amadeus-utility.ts` — FR-2 (先行サブエージェント成果、本サブエージェントは検証のみ・編集なし): `isSelfDevWorkspace` (scripts/promote-self.ts 存在判定)、`KIMI_MANAGED_BLOCK_FIX_SELF_DEV`、`kimiManagedBlockDoctorCheck(kimiHomeDir, workspaceDir?)` 分岐、`handleDoctor` からの projectDir 受け渡し。
- `tests/integration/t299-promote-self-kimi-hooks-merge.test.ts` — 新規 (FR-3a): (i) config 不在→追加+バックアップなし (かつ --check が hermetic)、(ii) 同一ブロック→noop、(iii) 旧版→replace+バックアップ、(iv) dist/kimi 不在→非発火 (`mergeKimiHooks` 直接駆動)。
- `tests/unit/t209-promote-self-dangling-symlink.test.ts` / `tests/integration/t227-project-skill-projection.test.ts` — async/await 追随 + snippet fixture 追加 + `KIMI_CODE_HOME` を mkdtemp に save/restore (実ユーザーの ~/.kimi-code 保護)。
- `tests/integration/t-kimi-doctor-arm.test.ts` — FR-3b: 文言分岐 describe 追加 (自己開発 fixture→promote-self 誘導、配布 fixture→bunx 誘導、workspaceDir 省略→bunx) + handleDoctor 出力に bunx 文言をピン。
- `docs/guide/harnesses/kimi-code.md` / `.ja.md` — doctor 修復手順に自己開発リポ分岐を最小追記。

## 主要な実装判断

- `promoteSelfMain` の async 化は `runHooksMerge` が async であることから不可避。in-process テスト seam の引数構成は維持し、既存呼び出し元 2 ファイルを機械的に await 化。
- マージ失敗は loud fail (非ゼロ終了)。noop は従来どおり成功。`not-applied` は `interactive: true` + 自動承認により到達不能のため分岐を設けない (不可能シナリオの防御コードを排除)。
- (iv) のガードは `promoteSelfMain` 経由では到達不能 (`buildExpected` が managed source dir 欠落で fail-closed) のため、`mergeKimiHooks` を export して直接検証。

## 計画からの乖離

- FR-3a のテスト配置を `tests/unit/` から `tests/integration/` に変更。新テストは fs 使用で size=medium だが、サイズ規約 (t-test-size-drift: unit=small のみ、allowlist は shrink-only ratchet) 上 unit に追加できないため。同一機構の既存例 t227 と同じ配置。allowlist には未着手。

## テスト結果 (WT で実行)

- `bun run typecheck` — パス
- `bun run lint` — exit 0 (警告は既存分のみ、変更ファイルに新規指摘なし)
- `bun test tests/integration/t299-… tests/unit/t209-… tests/unit/t200-… tests/integration/t227-… tests/integration/t-kimi-doctor-arm.test.ts` — 58 pass / 0 fail
- `bun test tests/unit/t-test-size-drift.test.ts` — 16 pass (t299 は integration×medium で適合)
- 関連ガード: t258 ×2 / t-plugin-projection-packaging / t-codex-hooks-migration — 79 pass / 1 skip / 0 fail。coverage/registry 系 (gen-coverage-registry, coverage-project-gate, t229, t257) — 110 pass / 0 fail
- `bun run distribution:check` — OK
- 実地 `bun scripts/promote-self.ts --check --no-build` (WT) — exit 0。freshness あり `--check` は Step 1 ソースの dist 未反映 (`DIFFERS: claude/.claude/tools/amadeus-utility.ts`) で失敗するが、dist 再生成は本ステージのスコープ外
- e2e `t-print-kimi-doctor.serial.test.ts` は LIVE GATE つきのため未実行 (期待値は両文言に共通の部分文字列のみで変更不要と確認)

## 残件

- dist 再生成 (`bun scripts/package.ts`) と promote は build-and-test 以降/別途実施。git 操作 (commit/add) は未実施 (bolt worktree 運用どおり)。
