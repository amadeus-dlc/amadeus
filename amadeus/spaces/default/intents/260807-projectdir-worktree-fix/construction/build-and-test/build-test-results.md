# Build and Test Results — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan（実行対象の正本）、code-summary（builder 実測の一次転記元）

測定 ref: worktree 2352-project-dir-fix、コミット `d4f0513c5`（= PR #2413 head）。実測日 2026-08-07。

## ビルド

| 項目 | 結果 |
|---|---|
| `bun install --frozen-lockfile` | 成功（261 packages） |
| `bun run build` | 成功（manifest 発見の全ハーネス再生成） |
| build 後 `git status`（tracked） | 差分は自編集4ファイルのみ — dist/self-install の tracked 差分ゼロ |

## ローカルテスト（builder 実測 + conductor 再実行の2重確認）

| コマンド | 結果 | exit |
|---|---|---|
| `bun test tests/integration/t481-resolve-project-dir-worktree-marker.test.ts` | 7 pass / 0 fail | 0 |
| `bun test tests/integration/t144-harness-seam.cli.test.ts`（build 後） | 11 pass / 0 fail | 0 |
| `bun test t202 + t296 + t230`（hook 側無改変） | 19 pass / 0 fail | 0 |
| `bun run typecheck` | — | 0 |
| `bun run lint` | — | 0 |
| `bun test tests/integration/t408-practices-promote-latch-gate.test.ts`（閉包実証） | 4 pass / 0 fail | 0 |

TDD Red 実測（実装前、exit 1）: t481 C+env `Expected: ".../agent-fixture" / Received: ".../main"`・祖先形 B `Received: ".../agent-fixture/packages/nested"`。

## PR CI（統合証跡 — 正規判定。PR #2413、`gh pr checks` 転記）

Tests / Typecheck / Lint and complexity / Reproducible build / Source-only and graph invariants / Plugin conformance E2E / Intent Mirror distribution contract / Coverage Report (head) / Coverage Report (base) / Coverage Report / Detect CI changes / Cursor Bugbot / CodeRabbit / **CI Success** — **全 pass**。skipping = Formal model check（発動条件外）・Metrics Snapshot（非ブロッキング）。レビュースレッド 0 件・mergeable CLEAN（pr-convergence-report.md: converged true）。

## 閉包実証（汚染ベクタ消滅）

段順確定後に汚染クラスの t408 を1本実行し、実 record の不変量を前後実測: audit シャード **295 行不変**・`memory/team.md` / `memory/project.md` / `amadeus-state.md` の **md5 3点不変**・テスト書込先が temp fixture（`amadeus-test-*/...`）へ復帰。

## 失敗・修復記録

- 本ステージでの新規失敗なし。CG 段の2逸脱（E-PWF-CGDEV / E-PWF-CGDEV2）と汚染インシデント・修復は code-summary.md と CG diary に記録済み
- 既存テストの赤: なし（対象集合すべて green、PR CI 全 green）
