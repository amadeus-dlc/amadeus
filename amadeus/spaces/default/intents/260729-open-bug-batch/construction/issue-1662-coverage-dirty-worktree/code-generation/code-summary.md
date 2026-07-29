# #1662 Code Generationサマリー

## 結果

[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)を、1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)の境界で修正した。

`coverage-patch-gate --check`はLCOVやdiffを読む前に`git status --porcelain=v1 --untracked-files=all`を実行する。staged、unstaged、untracked non-ignoreが存在する場合は、committed diffとLCOVが異なるsnapshotを表す可能性を説明し、commit、stash、clean worktreeでの再実行を案内して非0を返す。ignore済み生成物だけのrepositoryは従来どおり検査する。Git statusを実行できない場合もfail-closedにした。

## 根因

既存実装はdiffを`<base>...HEAD`から取得する一方、LCOVをcurrent working treeから読み、両入力のsnapshot同一性を検証していなかった。そのため未コミットの行挿入や削除でLCOVの行番号だけが移動し、別snapshotのcommitted diffへ誤対応していた。

## Red→Green

- Red: unstaged tracked変更を持つ一時Git repositoryで、`runCheck()`が`0`を返してcoverage評価まで進むことを再現した。追加時の対象test結果は8 pass / 1 failで、期待`1`に対して実値`0`だった。
- Green: unstaged、staged、untracked non-ignoreをすべて事前拒否し、stderrへsnapshot不一致と解消手順を出す。
- 互換: clean、ignored-only、明示`AMADEUS_PATCH_DIFF`、unknown base ref、既存coverage／allowlist判定を維持した。
- 失敗境界: 非Git directoryではGit status失敗を報告し、coverage結果を出さず非0にした。

## 変更ファイル

- `tests/coverage-patch-gate.ts`
- `tests/integration/t229-coverage-patch-gate-check.test.ts`
- `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1662-coverage-dirty-worktree/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1662-coverage-dirty-worktree/code-generation/code-summary.md`

## 検証

- `bun test --timeout 120000 tests/unit/t229-coverage-patch-gate.test.ts tests/integration/t229-coverage-patch-gate-check.test.ts`: 22 pass / 0 fail / 124 expect
- `bun run typecheck`: PASS
- `bun run lint`: PASS（既存baselineの293 warnings / 21 infosのみ）
- `git diff --check`: PASS

`packages/framework/core/`とharness正本を変更していないため、package／promote生成は不要である。全体`bun run test:ci`は、全Bolt統合後のBuild and Testで実行する。
