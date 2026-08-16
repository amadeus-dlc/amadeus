# Build and Test Results — intent 260815-priority-bug-batch-2

> 実行日: 2026-08-17。対象 tree: branch `bugfix-0815-1` の record 作業ツリー(コード断面は PR #3101 head `268f0d742` と同一 — 差分は record ファイルのみ。測定時スナップショットは本 intent の最終 checkpoint コミットに同内容で収録)。remote-first 方針(team.md `cid:code-generation:c2`)に従い、フルスイート・coverage の blocking 正本はリモート CI。本書の対象は `code-generation-plan.md` が計画し `code-summary.md` が申告する修正一式の着地後検証。

## ビルド

| 項目 | コマンド | 結果 |
|------|----------|------|
| ビルド | `bun run build` | exit 0 |
| 追跡ファイル同期 | `git status --porcelain`(audit シャード除外) | 追跡ファイル変更なし(新規 untracked は本ステージ成果物のみ)|
| 型検査 | `bun run typecheck` | exit 0 |
| リント | `bun run lint`(Biome) | exit 0 |

## ローカル targeted テスト(regression seam)

コマンド(実行前に 4 path の実在を機械確認済み):

```bash
bun test \
  tests/integration/t3077-election-full-retally.integration.test.ts \
  tests/unit/t246-routing-and-autonomy-guards.test.ts \
  tests/integration/t246-routing-and-autonomy-guards.test.ts \
  tests/integration/t224-upstream-v2-migration-cli.test.ts
```

結果(runner 出力からの転記): **115 pass / 0 fail、Ran 115 tests across 4 files [71.85s]**、exit 0。期待ファイル数 4 = runner 報告ファイル数 4。

## リモート CI(blocking 正本)

- PR #3101 は merge queue 経由で MERGED(mergedAt 2026-08-15T07:44:15Z)。マージコミット `361e82f2` の check-runs を取得(`gh api repos/amadeus-dlc/amadeus/commits/361e82f2.../check-runs`): **CI Success = success**(必須集約)。Tests / Coverage Report / Reproducible build / Source-only and graph invariants / Plugin conformance E2E / Lint and complexity いずれも success
- cancelled 2 件(`Refresh review-thread state`)は post-merge の非 required ワークフローで、同名の success 実行が別途存在(帰属判定は `cid:code-generation:c1-landed-rollup-attribution` に従う)。skipped 3 件(CI Review Thread Gate ×2 / Formal model check ×2 のうち条件不成立分・Metrics Snapshot)は条件付きジョブ
- coverage: 変更本番行の lcov DA uncovered ゼロ(builder 実測、`code-summary.md` §検証)。Patch/Project Coverage Gate は PR #3101 の required check として green

## 判定

- ビルド: 成功
- テスト: ローカル targeted 全 green + リモート必須 CI green。失敗 0 のため失敗詳細なし
- 未検証面の申し送り: ローカルフルスイートは本断面では再実行していない(remote-first — マージ時 CI green を正とする)。`tests/e2e/setup-install.test.ts:94` の既存赤(base 由来、stash 比較で帰属確認済み)は本 intent 非帰属(`code-summary.md` §申し送り)
