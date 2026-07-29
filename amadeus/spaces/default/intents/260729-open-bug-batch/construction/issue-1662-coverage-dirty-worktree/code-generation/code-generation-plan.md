# #1662 Code Generation計画

## 対象と追跡

- 対象Issue: [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)
- 対応要件: FR-1662-1〜3、FR-CROSS-1〜4、NFR-5〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 変更方針: committed diffとLCOVのsnapshot不一致を、全非ignore dirty変更の事前拒否で最小修正する。working tree差分の自動合成や一時snapshot生成は行わない。

## Blast Radiusとbaseline

| 区分 | 対象 | 影響 |
|---|---|---|
| 実装 | `tests/coverage-patch-gate.ts` | CLIの`--check`開始時だけにdirty guardを追加する。pureなLCOV／diff評価は変更しない |
| integration | `tests/integration/t229-coverage-patch-gate-check.test.ts` | staged、unstaged、untracked、ignore済み、cleanのprocess境界を追加する |
| unit | 既存coverage patch gate unit test | dirty判定をpure seamへ切り出す場合だけ追加する |
| CI | `.github/workflows/ci.yml` | clean checkout契約の確認対象。変更しない |

実装前baselineとして、対象unit／integration、`bun run typecheck`、`bun run lint`を記録する。作業worktreeは計画・record更新を除くapplication sourceがcleanな状態から開始し、Red fixture自身が作るdirty状態と混同しない。

## 実装手順

- [x] **Step 1 — 現行契約を固定する**: FR-1662-3へ追跡し、clean fixture、`AMADEUS_PATCH_DIFF`指定fixture、unknown base refの既存結果をbaselineとして記録する。
- [x] **Step 2 — 修正前Redを追加する**: FR-1662-1〜2へ追跡し、temp git repositoryでcommitted patchとLCOVを用意した後、(a) unstaged tracked、(b) staged、(c) untracked non-ignoreを個別に作り、`runCheck()`がLCOV parse／stale allowlist／coverage verdictより前に非0となることを検証する。
- [x] **Step 3 — 例外境界を固定する**: `.gitignore`対象だけが存在するfixtureとclean fixtureはdirtyとして拒否されないことを検証する。`AMADEUS_PATCH_DIFF`指定時もLCOVがcurrent worktree由来である以上、同じdirty guardを通す契約を固定する。
- [x] **Step 4 — 最小dirty guardを実装する**: `git status --porcelain=v1 --untracked-files=all`相当をshellなしの引数配列で実行し、出力あり、spawn失敗、非0終了をfail-closedに扱う。guardはLCOV読み込みとdiff評価より前へ置く。
- [x] **Step 5 — actionable stderrを実装する**: committed diffとLCOVが異なるsnapshotであるため検査できないこと、commit／stash／clean worktreeでの再実行を案内する。ファイル内容や秘密情報は出力しない。
- [x] **Step 6 — Greenと互換を確認する**: 新規dirty matrix、既存t229、関連unitを実行し、dirty時にcoverage違反やstale allowlist結果へ到達しないこと、clean時の結果が不変であることを確認する。
- [x] **Step 7 — 品質検証を行う**: `bun run typecheck`、`bun run lint`、対象test、`git diff --check`を実行する。core／harness正本は変更しないためpackage／promote生成差分がないことを確認する。
- [x] **Step 8 — 変更提案証拠をまとめる**: 修正前Red、修正後Green、対象suite、未実行検証と理由をcode-summaryへ記録し、[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)だけをclose対象とする。

## 完了条件

- staged、unstaged、untracked non-ignoreの各dirty状態が比較前に非0となる。
- ignore済み生成物だけの状態とclean CIは従来どおり検査できる。
- stderrがsnapshot不一致と解消手順を示し、誤ったcoverage／allowlist判定を出さない。
- 対象test、typecheck、lint、diff checkがGreenである。
