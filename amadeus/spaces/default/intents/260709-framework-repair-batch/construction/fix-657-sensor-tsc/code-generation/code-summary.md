# Code Summary — fix-657-sensor-tsc

> Bolt: `fix-657-sensor-tsc` / Issue: [#657](https://github.com/amadeus-dlc/amadeus/issues/657)
> Branch: `bolt/fix-657-sensor-tsc`(base: origin/main `f27bcb9e2`)/ commit `2e745a561`(未push、PR未作成)
> Worktree: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/agent-a6e8ac34c20501693`

## 変更ファイル(core + 全生成複製、同一コミット)

- `packages/framework/core/tools/amadeus-sensor-type-check.ts`(正本)— `resolveTscLauncher` 導入、プローブ/本実行を統一
- `dist/{claude,codex,kiro,kiro-ide}/*/tools/amadeus-sensor-type-check.ts` + `.claude/tools/`・`.codex/tools/`(生成・昇格)
- `tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`(新設4ケース)
- `tests/integration/t92.test.ts` — test 44 fixture 強化(下記逸脱参照)

## 赤先行実証(NFR-4)

- 新設 t202: 実装前は `Export named 'resolveTscLauncher' not found` で赤 → 実装後 4/4 pass
- **根本原因の実機再現**: 隔離 tmp dir から `bunx tsc --version` → 7.0.2(グローバルキャッシュ)、repo の `node_modules/.bin/tsc` → 6.0.3。pre-fix コードを復元し、この条件下で t92 test 44 が origin/main 上で赤(exit-1)であることをライブ確認 — 捏造ではないベースライン実証

## 検証結果(実測 exit code、最終内容で再実行)

- `bun run typecheck` → 0 / `bun run lint` → 0(警告は既存・touched files ゼロ)
- `bun run dist:check` → 0 / `bun run promote:self:check` → 0
- `bash tests/run-tests.sh --ci` → **0**(260 ファイル、3870 アサーション、全 pass — t92 45/45 含む)

## 計画からの逸脱(要レビュー注視)

計画のランチャー修正だけでは test 44 は決定化しない: fixture が OS tmpdir 配下にあり祖先に `node_modules` が存在しないため、ランチャーは構造的に bunx フォールバックへ落ちる。対応として test 44 の fixture に `symlinkSync(REPO_ROOT/node_modules, <fixture>/node_modules)` を追加し、実プロジェクト同様に repo ピンの tsc を発見させた。exit code 期待値(2)は不変更。`tests/` スコープ内の変更。

## sandbox 注記

git fetch(SSH)/ dist 配下の rm/cp / bunx の tempdir 書込は sandbox 起因の失敗を確認の上バイパスで再実行(成果物への影響なし)。
