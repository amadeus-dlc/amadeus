# ユニットテスト手順 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

## 方針

本 intent の変更対象はシェル関数・tmux・実ファイルシステム境界であり、純関数層が存在しない。`project.md` の `cid:build-and-test:wtfbt-c1` に従い、孤立モックの新規ユニットテストを作らず、承認済み NFR 経路を直接観測できる既存の integration seam を最小検証集合とする。

したがって**本 intent はユニット層へのテスト追加を行わない**。これは検証の省略ではなく層の選択であり、実際の検証は integration 層で行う（`integration-test-instructions.md`）。

## 既存ユニット層への影響

無し。`packages/framework/core/tools/team-up.sh` はユニット層のテストから参照されていない。

## 実行

```bash
bash tests/run-tests.sh --ci   # unit を含む全層
```
