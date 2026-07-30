# Issue #1662 Code Generationサマリー

## 入力と変更境界

`unit-of-work.md`はexpected absentのため補完せず、`requirements.md`のFR-1662-1〜3、FR-CROSS-1〜4、NFR-5〜6と既存Bolt／変更提案証跡からスコープした。[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)を1 Issue = 1 Bolt = 1 [PR #1686](https://github.com/amadeus-dlc/amadeus/pull/1686)として配送した。

実装コミットは`b8c635d667cddd8b4dc2bbab5ccaf5430da2b688`、マージコミットは`af3d313ac036466aca475343b92cb73b838f2a25`である。実装変更は`tests/coverage-patch-gate.ts`と`tests/integration/t229-coverage-patch-gate-check.test.ts`に限定し、core／harness正本とCI workflowは変更していない。

## 根因証拠

修正前親コミット`22ee27dbe`の`runCheck()`は、最初にLCOV pathを解決してcurrent working tree由来のLCOVを読み、その後に`AMADEUS_PATCH_DIFF`または`git diff <base>...HEAD`からcommitted diffを取得していた。`git status`またはsnapshot同一性の検査は存在しなかった。この入力非対称により、未コミットの行挿入・削除があるとLCOVの行番号とcommitted diffの行番号が別snapshotを指し得た。

実装コミット`b8c635d66`は`runCheck(repoRoot)`の先頭へ`git status --porcelain=v1 --untracked-files=all`を追加した。status失敗またはporcelain出力ありの場合はexit 1でreturnし、その後にあるLCOV path解決・LCOV parse、diff取得、allowlist parse／stale判定、coverage verdictへ進まない。

## 修正前Redと修正後Green

同じ最終回帰fixtureを使うため、隔離cloneで修正前親コミット`22ee27dbe`へ`b8c635d66`のintegration testだけを適用してRedを再取得した。

- **Red**: unit／integrationは19 pass / 3 fail / 113 expect。失敗は「unstaged trackedを事前拒否」「staged／untracked non-ignoreを事前拒否」「Git status失敗を事前拒否」の3ケースで、いずれも期待exit 1に対して修正前実値0だった。
- **Green**: 実装コミット`b8c635d66`の同一unit／integrationは22 pass / 0 fail / 124 expect。unstaged、staged、untracked non-ignore、Git status失敗はexit 1となり、clean、ignored-onlyと既存coverage／allowlist契約はGreenだった。
- **実CLI dirty確認**: 実装コミットの隔離cloneをstaged dirtyにして`bun tests/coverage-patch-gate.ts --check`を実行するとexit 1、stdout 0 bytesとなり、stderrはcommitted diffとLCOVのsnapshot不一致、およびcommit／stash／clean worktreeでの再実行を示した。

## dirty時のLCOV／allowlist非到達

証拠は実装順序と観測結果の両方で固定した。

1. `b8c635d66`の`runCheck()`ではGit status guardと2つの早期returnが先にあり、その後にLCOV読込、allowlist stale判定、coverage summary出力が並ぶ。
2. integration testはunstaged dirtyとGit status失敗についてstdoutに`Patch coverage gate:`が含まれないことをassertする。
3. 上記実CLI dirty確認でもstdoutは0 bytesで、LCOV missing、stale allowlist、uncovered verdictのいずれも出力されなかった。

したがってdirty時の結果はcoverage違反やstale allowlistではなくsnapshot検証不能だけであり、FR-1662-2の「誤った判定を出力しない」を満たす。

## 要件別Greenと双方向トレーサビリティ

| 要件 | 実装・Green証拠 | 逆参照するtest／検証 |
|---|---|---|
| FR-1662-1 | 全非ignore dirtyをLCOV／diff比較前にexit 1。ignored-onlyは通過 | `an unstaged tracked change...`、`staged and untracked non-ignored...`、`ignored-only files...` |
| FR-1662-2 | stderrにsnapshot不一致とcommit／stash／clean worktreeを表示し、dirty時summaryを出さない | `an unstaged tracked change...`のstderr／stdout assertions、`a repository-status failure...`、実CLI dirty確認 |
| FR-1662-3 | clean fixtureと既存coverage／allowlist判定を維持。実CIのclean checkout patch gateがPASS | `uncovered added line...`、`stale allowlist entry...`、`git branch: HEAD...HEAD...`、[Coverage Report (head)](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385264) |
| FR-CROSS-1 | #1662だけをcloseする1 Bolt／1 PRとして配送 | [PR #1686](https://github.com/amadeus-dlc/amadeus/pull/1686)の`Fixes #1662`、実装コミット`b8c635d66` |
| FR-CROSS-2 | 同一最終fixtureで修正前19/3 Redから修正後22/0 Greenへ遷移し、関連unitもGreen | 隔離cloneのRed／Green再実行、PR CIのt229 unit／integration PASS |
| FR-CROSS-3 | core／harness投影を変更せず配布差分を作らない | 実装コミットの変更対象、[Dist and self-install drift](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385164) |
| FR-CROSS-4 | Issue、実装、test、PR、CIを対応付け、未追加E2Eを成功へ丸めず下記へ記録 | [PR #1686](https://github.com/amadeus-dlc/amadeus/pull/1686)、[CI run 30443569131](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131) |
| NFR-5 | `runCheck(repoRoot)`の先頭に既存`spawnSync`パターンのguardだけを追加し、pure verdictを変更しない | 実装コミット`b8c635d66`の2実装／testファイル差分、typecheck、対象回帰suite |
| NFR-6 | 対象test、typecheck、lint、統合`test:ci`を実行。投影変更はない | [Typecheck](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385310)、[Lint and complexity](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385217)、[Tests](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385281) |

逆方向では、dirty matrixの3 testがFR-1662-1／2、ignored-onlyと既存verdict群がFR-1662-1／3、PRのclean Coverage Report E2EがFR-1662-3、対象suiteとCI quality jobsがFR-CROSS-2／4・NFR-6へ戻る。要件にもtestにも孤立項目はない。

## Comprehensiveテスト戦略

- **Unit**: `tests/unit/t229-coverage-patch-gate.test.ts`のLCOV／diff parser、verdict、allowlist契約を実行した。
- **Integration**: `tests/integration/t229-coverage-patch-gate-check.test.ts`の一時Git repositoryでdirty matrix、ignored-only、clean、Git status失敗を実行した。
- **E2E**: [PR #1686の`Coverage Report (head)`](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385264)がclean checkout後に`bun run coverage:ci -- -P 4`を実行し、実CLI `bun tests/coverage-patch-gate.ts --check`まで到達した。結果はmeasured added 18、covered 18、allowlisted 0、uncovered 0でPASSだった。

dirty専用の恒久E2E test／workflowは追加していない。GitHub Actionsの正規境界はclean checkoutであり、dirty化は外部system結合ではなくローカルGit状態の意図的変更だけだからである。この境界はintegrationの一時repositoryで決定的に検証し、別途、実CLIのstaged dirty確認もexit 1で成功した。これは未実行をGreenへ丸めたものではなく、Comprehensive戦略を実在境界へ比例適用した根拠付き逸脱である。

## 検証と配送

- 隔離再実行: 修正前19 pass / 3 fail / 113 expect、修正後22 pass / 0 fail / 124 expect。
- [PR CIのtarget integration](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385264): 12 pass / 0 fail / 104 expect。target unitもPASS。
- [Tests](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385281): `bun run test:ci -- -P 4`がSUCCESS。
- [Typecheck](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385310): `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json`がSUCCESS。
- [Lint and complexity](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385217): SUCCESS（293 warnings / 21 infosの既存baseline）。
- `git diff --check b8c635d66^ b8c635d66`: PASS。
- core／harness投影を変更していないためpackage／promote再生成は非適用。[Dist and self-install drift](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385164)はSUCCESSだった。
- [PR #1686](https://github.com/amadeus-dlc/amadeus/pull/1686)はCI Success後、2026-07-29にmerge済み。

## 逸脱

- working tree差分の自動合成や一時snapshotは作らず、要件どおり事前拒否を採用した。
- dirty専用の恒久E2Eは上記理由で追加せず、integration fixture、実CLI dirty確認、clean CI E2Eの組み合わせで検証した。
