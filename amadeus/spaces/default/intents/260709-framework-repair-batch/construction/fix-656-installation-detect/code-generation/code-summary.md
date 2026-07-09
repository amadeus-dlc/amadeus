# Code Summary — fix-656-installation-detect

> Bolt: `fix-656-installation-detect` / Issue: [#656](https://github.com/amadeus-dlc/amadeus/issues/656)(P0)
> Branch: `bolt/fix-656-installation-detect`(base: origin/main `f27bcb9e2`)/ commit `fe0402578`(未push、PR未作成)
> Worktree: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/agent-aa0ac07b5ec2d899d`

## 変更ファイル

- `packages/setup/src/domain/installation.ts` — 実装(FR-656-1、FR-656-2)
- `tests/unit/setup-installation.test.ts` — 新規回帰テスト(両修正)
- `tests/unit/setup-upgrade.test.ts` — E2E 回帰テスト新設(実 `Installation.detect` → `UpgradeSource.fromInstallation(force=true)` → unsupported-layout 拒否)
- `tests/unit/setup-cli-wiring.test.ts` — fake Manifest fixture 6件に `requiredPaths: () => []` スタブ追加(FR-656-2 の新ディスク検証契約への追随。ベースライン worktree で「本変更起因の赤」であることを検証済み)

## 赤先行実証(NFR-4)

修正前: 新テスト3件が期待どおり赤(`partial`期待/`manifested`受領、`manual-or-unknown`期待/`none`受領 ×2)、3 fail / 34 pass。修正後: 37 pass / 0 fail。

## 検証結果(実測 exit code)

- `bun run typecheck` → 0
- `bun run lint` → 0(警告17/情報6は既存・本 Bolt 変更ファイルにゼロ件を grep 確認)
- `bash tests/run-tests.sh --ci` → 259 ファイル中 t92.test.ts の1アサーションのみ失敗 — クリーン origin/main worktree で同一失敗を再現しベースライン(=#657 の修理対象)と確認
- setup 系 unit+integration 全 228 pass / 0 fail(stale-binary 対策: 各実行前に `packages/setup/dist/cli.js` 削除 — team.md 学習遵守)

## 計画からの逸脱

1. FR-656-2 のディスク実在検証が `setup-cli-wiring.test.ts` の bare fixture を新規に壊すことを発見 → `requiredPaths: () => []` スタブ追加で追随(no-real-I/O のテスト設計は維持)。ベースライン比較で「本変更起因」を実証してから修正
2. クリーンベースライン取得は stash でなく `git worktree add --detach origin/main`(sandbox の unlink 制約回避)
3. git fetch / bun install 等は sandbox バイパスで実行(成果物への影響なし)
