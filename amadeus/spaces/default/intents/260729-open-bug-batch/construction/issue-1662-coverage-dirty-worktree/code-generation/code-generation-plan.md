# #1662 Code Generation計画

## 対象と追跡

- 対象Issue: [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)
- 入力fallback: `unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`とbrownfieldの既存Bolt証跡からスコープした。
- 対応要件: FR-1662-1〜3、FR-CROSS-1〜4、NFR-5〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 変更方針: committed diffとLCOVのsnapshot不一致を、全非ignore dirty変更の事前拒否で最小修正する。working tree差分の自動合成や一時snapshot生成は行わない。

## Blast Radiusとbaseline

| 区分 | 対象 | 影響 |
|---|---|---|
| 実装 | `tests/coverage-patch-gate.ts` | CLIの`--check`開始時だけにdirty guardを追加する。pureなLCOV／diff評価は変更しない |
| integration | `tests/integration/t229-coverage-patch-gate-check.test.ts` | staged、unstaged、untracked、ignore済み、cleanのprocess境界を追加する |
| unit | 既存coverage patch gate unit test | dirty判定をpure seamへ切り出す場合だけ追加する |
| E2E | `.github/workflows/ci.yml`の`Coverage Report (head)` | clean checkoutでLCOV生成から実CLI `bun tests/coverage-patch-gate.ts --check`まで通す既存経路を再利用する。workflowは変更しない |
| CI | `.github/workflows/ci.yml` | clean checkout契約の確認対象。変更しない |

実装前baselineとして、対象unit／integration、`bun run typecheck`、`bun run lint`を記録する。作業worktreeは計画・record更新を除くapplication sourceがcleanな状態から開始し、Red fixture自身が作るdirty状態と混同しない。

## Comprehensiveテスト戦略の適用

- **Unit**: `tests/unit/t229-coverage-patch-gate.test.ts`で既存のLCOV parse、diff parse、coverage verdict、allowlist契約を回帰確認する。dirty guardはGit process境界そのものであり、pure seamを新設しなかったためdirty専用unitは追加しない。
- **Integration**: `tests/integration/t229-coverage-patch-gate-check.test.ts`の一時Git repositoryでunstaged、staged、untracked non-ignore、ignored-only、clean、Git status失敗を検証する。
- **E2E**: [PR #1686の`Coverage Report (head)`](https://github.com/amadeus-dlc/amadeus/actions/runs/30443569131/job/90548385264)で、GitHub Actionsのclean checkout、依存導入、実LCOV生成、project gate、実CLI patch gateを順に実行する。結果はmeasured added 18、covered 18、allowlisted 0、uncovered 0でPASSだった。
- **dirty専用E2Eの逸脱**: CIの正規E2Eはclean checkout契約であり、dirty化は本番外部systemとの結合を増やさずローカルGit状態だけを意図的に変える。同じ`git status`／`runCheck`境界は上記integrationの一時repositoryで決定的に網羅し、実装コミットの隔離cloneで実CLIをstaged dirtyにした追加確認もexit 1、stdout 0 bytes、snapshot不一致stderrとなった。このため恒久的なdirty専用E2E test／workflowは追加しない。

## 実装手順

- [x] **Step 1 — 現行契約を固定する**: FR-1662-3へ追跡し、clean fixture、`AMADEUS_PATCH_DIFF`指定fixture、unknown base refの既存結果をbaselineとして記録する。
- [x] **Step 2 — 修正前Redを追加する**: FR-1662-1〜2へ追跡し、temp git repositoryでcommitted patchとLCOVを用意した後、(a) unstaged tracked、(b) staged、(c) untracked non-ignoreを個別に作り、`runCheck()`がLCOV parse／stale allowlist／coverage verdictより前に非0となることを検証する。
- [x] **Step 3 — 例外境界を固定する**: `.gitignore`対象だけが存在するfixtureとclean fixtureはdirtyとして拒否されないことを検証する。`AMADEUS_PATCH_DIFF`指定時もLCOVがcurrent worktree由来である以上、同じdirty guardを通す契約を固定する。
- [x] **Step 4 — 最小dirty guardを実装する**: `git status --porcelain=v1 --untracked-files=all`相当をshellなしの引数配列で実行し、出力あり、spawn失敗、非0終了をfail-closedに扱う。guardはLCOV読み込みとdiff評価より前へ置く。
- [x] **Step 5 — actionable stderrを実装する**: committed diffとLCOVが異なるsnapshotであるため検査できないこと、commit／stash／clean worktreeでの再実行を案内する。ファイル内容や秘密情報は出力しない。
- [x] **Step 6 — Greenと互換を確認する**: 新規dirty matrix、既存t229、関連unitを実行し、dirty時にcoverage違反やstale allowlist結果へ到達しないこと、clean時の結果が不変であることを確認する。
- [x] **Step 7 — 品質検証を行う**: `bun run typecheck`、`bun run lint`、対象test、`git diff --check`を実行する。core／harness正本は変更しないためpackage／promote生成差分がないことを確認する。
- [x] **Step 8 — 変更提案証拠をまとめる**: 修正前Red、修正後Green、対象suite、未実行検証と理由をcode-summaryへ記録し、[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)だけをclose対象とする。

- [x] **Step 9 — テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。

## 完了条件

- staged、unstaged、untracked non-ignoreの各dirty状態が比較前に非0となる。
- ignore済み生成物だけの状態とclean CIは従来どおり検査できる。
- stderrがsnapshot不一致と解消手順を示し、誤ったcoverage／allowlist判定を出さない。
- 対象test、typecheck、lint、diff checkがGreenである。

## Step 8実施証拠

- 修正前親コミット`22ee27dbe`へ実装コミット`b8c635d66`の最終integration testだけを適用した隔離実行は、19 pass / 3 fail / 113 expectだった。Redはunstaged拒否、staged／untracked拒否、Git status失敗の3ケースで、いずれも期待exit 1に対して修正前実値0だった。
- 実装コミット`b8c635d66`の同一unit／integration suite再実行は22 pass / 0 fail / 124 expectだった。
- 根因は、修正前`runCheck()`がcurrent working tree由来のLCOVを読みながらdiffを`<base>...HEAD`から取得し、両者のsnapshot同一性を確認していなかったことにある。実装コミットでは`git status --porcelain=v1 --untracked-files=all`と早期returnをLCOV読込より前へ追加した。
- 要件別Green、dirty時のLCOV／allowlist非到達、双方向トレーサビリティ、未追加検証の理由は`code-summary.md`へ記録した。
- [PR #1686](https://github.com/amadeus-dlc/amadeus/pull/1686)は[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)だけをclose対象とし、CI Success後にmergeされた。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T23:57:01Z
- **Iteration:** 1
- **Scope decision:** none

実装方針はFR-1662-1〜3と整合するが、Comprehensiveテスト戦略およびEvidence-first完了条件を満たす証拠が成果物に不足している。

### Findings

- Major: Comprehensive戦略はunit・integration・E2Eを要求するが、計画はintegration追加と条件付きunitだけでE2Eを含まず、逸脱理由も記録していない。
- Major: FR-CROSS-2、FR-CROSS-4、NFR-6および計画Step 8が要求する修正前Red、根因証拠、要件別Greenの記録がcode-summaryに存在せず、22 passという集計だけではFR-1662-1〜3の双方向トレーサビリティとdirty時にLCOV／allowlist判定へ到達しないことを検証できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:03:39Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の指摘は解消され、Comprehensive戦略のE2E適用・逸脱理由、修正前Red、根因、要件別Green、dirty時のLCOV／allowlist非到達、および双方向トレーサビリティが実装計画とサマリーに整合して記録されている。

### Findings

- None
