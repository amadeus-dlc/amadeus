上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Build 手順 — test-pyramid-rebuild

## 対象と前提

- U1〜U3 の正式成果は record Markdown であり、application code、依存関係、runner、CI、配布物の executable delta はない。
- Build & Test では、U1/U3 の exact measurement ref 再現と、現在の worktree の repository-wide 回帰を別の証拠として扱う。
- worktree 進入時の `mise trust` は実施済み。root に `build` script はないため、CI と同じ typecheck・lint・複雑度・配布 drift・self-install drift を build verification とする。
- `node_modules/` がない環境だけ `bun install --frozen-lockfile` を実行する。既存依存がある worktree で再導入しない。

## 環境と設定

- runtime は Bun 1.3.13、package manager は Bun、TypeScript/Biome の設定は repository 既存設定をそのまま使う。
- 必須環境変数、追加config、local serviceはない。外部substrateを使うintegration/e2eは各instructionのpreflightに従う。
- U1のexact-ref検証はrepo外の一時exportで実行し、current dirty worktreeと測定refを混合しない。

## Build verification コマンド

root で次の順に実行する。

```bash
test -d node_modules
bun --version
bun run typecheck
bun run lint
bun tests/complexity-gate.ts --check
bun run dist:check
bun run promote:self:check
git diff --check
```

`bun run dist` は配布物を書き換えるため、本 intent の record-only 境界と dirty worktreeでは実行しない。`dist:check` が正本と全6 harness配布物の同値性をread-onlyに検査する。`promote:self:check` が生成投影だけのdriftを検出した場合は、対象を確認して `bun run promote:self` でproject-local self installを再投影し、同じcheckを再実行する。この修復をU1〜U3のexecutable deltaには数えない。

## 合格条件

- 全コマンド exit 0。
- TypeScript の未解決 import・型エラーが0件。
- Biomeはexit 0で、既存warning/infoを記録し、変更差分に帰属する新規findingが0件。
- 複雑度の新規違反・regression、dist drift、self-install driftが最終runで0件。
- `git diff --check` が成功し、既存 dirty 差分を本 intent の成果へ帰属させない。

## トラブルシュート

- `bunx` が Biome を取得しようとする場合は network依存として記録し、tool unavailableをPASSへ縮退させない。
- `dist:check` が失敗した場合は正本・全dist面の差分を特定し、`bun run dist`で上書きする前に既存dirty差分との所有関係を確認する。
- `promote:self:check` が失敗した場合はdiff面を列挙し、canonical sourceと生成投影だけの差であることを確認してから `bun run promote:self` を1回実行する。無関係なdirty差分は修復対象に含めない。
- test runner の赤は初回と同じ原因と推定せず、当該runのstdoutで再帰属する。
