# Build Instructions — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- U1 `grant-authorization-domain` の `code-generation-plan.md` / `code-summary.md` — 新規 canonical module `amadeus-grant-authorization.ts` と `amadeus-lib.ts` への型・gate policy 残置という import-cycle-free 境界を引き、typecheck 対象面を確定した。
- U2 `solo-gate-transaction` の `code-generation-plan.md` / `code-summary.md` — `amadeus-directive.ts` / `amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-presence-reservation.ts` / `amadeus-mint-presence.ts` の変更面を引き、再生成が必要な core 面を確定した。
- U3 `harness-contract-and-regression` の `code-generation-plan.md` / `code-summary.md` — 全6 harness への投影と `tests/.complexity-baseline.json` を `--update` で受容せず実装分解で通す方針を引き、下記ドリフト検査とコンプレキシティゲートの扱いを確定した。

測定 ref: worktree `/Users/j5ik2o/.codex/worktrees/c179/amadeus`、ブランチ `codex/solo-standing-grants`、HEAD `b399c31c4`、merge-base（`origin/main`）`c4c9531ee`。

## 前提条件

| 項目 | 内容 |
|---|---|
| ランタイム | bun（`package.json` の Build System）。TypeScript は `tsc --noEmit` による型検査のみで、実行時のトランスパイル成果物を持たない |
| 依存インストール | `bun install --frozen-lockfile`（requirements.md Assumptions 4） |
| 追加依存 | なし。本 intent は `package.json` / `bun.lock` を変更していない（`git diff --name-only c4c9531ee HEAD -- package.json bun.lock` が空） |
| 環境変数 | ビルドには不要。テスト側の決定的 clock / revocation seam は各テストが自前で注入する |

## ビルド手順

本リポジトリの「ビルド」は、canonical source から配布物とセルフインストールツリーを再生成する操作である（`project.md` Mandated）。

```
bun install --frozen-lockfile
bun scripts/package.ts        # packages/framework/core + harness → dist/<harness>/ 6面
bun run promote:self          # 正本 → project-local self-install ツリー
```

## ビルド検証

```
bun run typecheck             # tsc --noEmit (tsconfig.json + tsconfig.tests.json)
bun run lint                  # biome check tests/ packages/setup/ packages/framework/core/ scripts/
bun tests/complexity-gate.ts --check
bun run dist:check
bun run promote:self:check
bun tests/gen-coverage-registry.ts --check
git diff --check
```

`tests/complexity-gate.ts` は `--check` のみを使う。`--update` による baseline 受容は本 intent では禁止で、U3 の code-summary が記録するとおり実装の分解でゲートを通す方針が確定している。

## 実測結果（本ステージでの独立再実行）

exit code はパイプを経由せず直接捕捉した。

| コマンド | exit code | 出力の要点 |
|---|---:|---|
| `bun run typecheck` | 0 | 両 tsconfig ともエラーなし |
| `bun run lint` | 0 | `Checked 874 files`、Found 292 warnings / 19 infos（`noExcessiveCognitiveComplexity` の informational warn 帯。エラー 0 のため exit 0） |
| `bun tests/complexity-gate.ts --check` | 0 | `complexity gate: OK — 0 new violations, 0 regressions, baseline 59 entries (worst CCN 65), threshold 15` |
| `bun run dist:check` | 0 | `package --check: all harness trees in sync with packages/framework/core + harness.` |
| `bun run promote:self:check` | 0 | `promote-self --check: project-local self install is in sync` |
| `bun tests/gen-coverage-registry.ts --check` | 0 | `coverage registry: OK (fresh, guards green, ratchet held)` |
| `git diff --check` | 0 | 空白エラー・競合マーカーなし |

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| `dist:check` が差分を報告する | `dist/` を直接編集した可能性。`project.md` Forbidden に従い正本を直し、`bun scripts/package.ts` で再生成する |
| `promote:self:check` のみ失敗 | core 変更後に `bun run promote:self` を実行していない |
| complexity gate が NEW_VIOLATION を出す | 匿名関数の ordinal ずれの可能性（`cid:code-generation:complexity-baseline-ordinal`）。まず匿名関数を増やさない形へ整形し、`--update` では受容しない |
| `gen-coverage-registry --check` が FRESHNESS DIFF | 複数 unit 統合でテスト宇宙が変わっている。registry を再生成してから再検証する |
