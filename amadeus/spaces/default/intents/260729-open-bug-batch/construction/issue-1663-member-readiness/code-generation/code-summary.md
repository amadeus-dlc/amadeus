# Issue #1663 Code Generationサマリー

上流入力(consumes全数): `requirements.md`、Issue #1663、Issue #1336の実装・テスト証跡

## 入力と実装基準点

`unit-of-work.md`はexpected absentのため補完せず、`requirements.md`のFR-CROSS-1〜4、FR-1663-1〜3とIssue #1336依存を含む既存Bolt証跡からスコープした。基準点は[PR #1688](https://github.com/amadeus-dlc/amadeus/pull/1688)のhead commit [`3597bfb7c`](https://github.com/amadeus-dlc/amadeus/commit/3597bfb7c20642922e8970490d58a97eebbd864d)である。Request Changes是正はこのcommitをHEADとする専用worktreeへ未コミット差分として実装し、以下の最終実測を証拠とする。新しいcommit、push、変更提案は作成していない。

## 実装結果

- 一回の`git worktree list --porcelain`全体観測を完了の唯一の根拠にせず、memberごとの`registered`、`checked-out`、`ready`をrun recordへ保存する。
- registrationは直列、checkout並列度は4のまま維持し、親は起動したcheckout PIDを明示的に待つ。
- `registered`は個別registrationと物理パス一致の確認後、`checked-out`はcheckout成功後、`ready`は`path`と`branch`の書き込み後に保存する。
- 不足時は`member(registration|checkout|record)`で停止段階を診断する。
- 各証拠を`schemaVersion`・`run`・`member`・`stage`へ束縛したcanonical JSONとし、同一member directoryの一時ファイルからrenameして原子的に確定する。
- 完了集約はファイル存在ではなくexact payloadを照合し、partial／別run／別member／別stage／余剰field／crash残骸をfail-closedで拒否する。

## 変更・生成ファイルとblast radius

| 区分 | パス |
|---|---|
| 正本 | `packages/framework/core/tools/team-up.sh` |
| test | `tests/integration/t295-team-up-worktree-parallel.test.ts` |
| unit（新規） | `tests/unit/t-team-up-member-readiness.test.ts` |
| E2E（新規） | `tests/e2e/t-team-up-member-readiness.serial.test.ts` |
| clean-env回帰（変更） | `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts` |
| self-install | `.claude/tools/team-up.sh` |
| self-install | `.codex/tools/team-up.sh` |
| self-install | `.cursor/tools/team-up.sh` |
| self-install | `.kimi-code/tools/team-up.sh` |
| self-install | `.opencode/tools/team-up.sh` |
| dist | `dist/claude/.claude/tools/team-up.sh` |
| dist | `dist/codex/.codex/tools/team-up.sh` |
| dist | `dist/cursor/.cursor/tools/team-up.sh` |
| dist | `dist/kimi/.kimi-code/tools/team-up.sh` |
| dist | `dist/kiro/.kiro/tools/team-up.sh` |
| dist | `dist/kiro-ide/.kiro/tools/team-up.sh` |
| dist | `dist/opencode/.opencode/tools/team-up.sh` |
| 成果物 | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1663-member-readiness/code-generation/code-summary.md` |
| 成果物 | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1663-member-readiness/code-generation/code-generation-plan.md` |

blast radiusは、上記team-up launcherを配布するClaude、Codex、Cursor、Kimi、Kiro、Kiro IDE、OpenCodeでのfresh team run作成と、run recordを読む運用・診断である。外部API、database、CLI引数、branch命名、Issue #1336のsafety-wait payload、CI workflowは変更していない。

## readiness証拠のライフサイクル

| 観点 | 確認した実装事実 | 結論 |
|---|---|---|
| run/member束縛 | marker pathに加え、payloadの`run`と`member`を走査中のexact値へ照合する | path＋内容で束縛 |
| 初期化 | fresh runは既存`RUN_ROOT`または`RUN_RECORD`を拒否し、新規directoryだけを作る | 以前のrun recordを初期値として再利用しない |
| 段階順序 | 個別registration検証→`registered`、checkout成功→`checked-out`、`path`→`branch`→`ready`の`&&`順、全PID待機→集約 | 通常実行の順序あり |
| cleanup | production CLIのEXIT trapはagent起動前の通常失敗でworktree・branch・`RUN_RECORD`を削除する。t295はpartial failureとunregistered huskを検証 | 通常失敗をcleanup |
| stale拒否 | 同一`RUN_ID`の既存run path/recordを`refusing stale member readiness evidence`で拒否し、別run/member/stage payloadも集約で拒否する | staleを現runの成功証拠へ再利用しない |
| 原子性 | `write_member_readiness_evidence`が同一member directoryの一時ファイルへcanonical JSONを書き、`mv -f --`で確定する | partial finalを公開しない |
| abnormal crash | SIGKILLではrecordや一時ファイルが残り得るが、同一IDの再利用を拒否し、一時ファイル／partial finalを集約しない | 自動回収ではなく安全なfail-closedを保証 |
| marker真正性 | schemaVersion 1とexact run／member／stageだけを受理し、空・partial・余剰fieldを拒否する | 内容真正性を検証 |

したがって、atomic rename、marker内容検証、partial／stale／crash残骸の拒否は実装済みである。SIGKILL後の自動回収とdirectory fsyncによる電源断耐久性は保証せず、安全側に再実行を拒否する。

## Comprehensiveテスト戦略と要件対応

Comprehensiveの期待量はsoft guidelineとして10〜15件/componentで、unit＋integration＋E2Eを含む。対象component`create_run()`について確認できた構成は次のとおりである。

| テスト層 | 実績 | 対応要件・限界 |
|---|---|---|
| Unit | `tests/unit/t-team-up-member-readiness.test.ts`: 4 pass | exact payload、unsafe identity、canonical受理、stale／partial／余剰field拒否を直接検証 |
| Integration | `tests/integration/t295-team-up-worktree-parallel.test.ts`: 16 pass | real Git/FSで全member三段階canonical JSON、temp除去、改ざん、partial/crash、stale run、直列registration、checkout上限4を直接検証 |
| CLI integration | `tests/integration/t-team-up-codex-resume.serial.test.ts`: 56 pass | 実`bash team-up.sh`とreal Git/FS、fake Herdr/agmsgでFR-1663-3を回帰 |
| E2E | `tests/e2e/t-team-up-member-readiness.serial.test.ts`: 3 pass | 実`team-up.sh` CLIとreal Git/FSで成功、ready改ざん時のfail-closed＋rollback、crash-stale拒否を検証 |
| CI | [PR #1688 Tests job](https://github.com/amadeus-dlc/amadeus/actions/runs/30455810027/job/90589003902): 653 files / 9,010 assertions / 0 fail、`RESULT: PASS` | clean checkoutで全unit/integration/E2E suiteを実行。ただしIssue #1663専用E2Eの代替とはしない |

要件別の直接証拠は次のとおりである。

| 要件 | 証拠 |
|---|---|
| FR-CROSS-1 | [PR #1688](https://github.com/amadeus-dlc/amadeus/pull/1688)は`Closes #1663`のみを宣言し、CI成功後にmerge |
| FR-CROSS-2 | t295の制御shimで初回registry観測から`engineer-4`だけを欠落させ、修正後もreal Git・marker・path・branchが揃って成功 |
| FR-CROSS-3 | 正本1面、self-install 5面、dist 7面を生成し、package/promote drift guardが全対象OK |
| FR-CROSS-4 | 本表で受け入れ条件、テスト、未解決事項を対応付け |
| FR-1663-1 | unitのexact payload、t295の全member canonical JSON／改ざん拒否、E2Eの成功／ready改ざん拒否を検証 |
| FR-1663-2 | registration peak=1、checkout peakは2以上4以下、初回registry欠落Greenをt295で検証 |
| FR-1663-3 | safety-wait unit 20件とfull CLI integration 56件がGreen、共有safety-wait実装面に差分なし |
| NFR-1 | atomic rename、exact payload、partial final／crash temp／stale record拒否をunit・integration・E2Eで検証 |
| NFR-2 | timeout・固定sleepを変更せず、registration直列とcheckout上限4を維持 |
| NFR-3 | authorization、identity、gate provenance、secret logging境界に差分なし。追加security検査は非適用 |
| NFR-4 | macOSの一時展開treeとLinux GitHub Actionsの双方で検証 |
| NFR-5 | `create_run()`へ限定した最小差分で、汎用frameworkを追加していない |
| NFR-6 | 同一制御fixtureのRed/Green、対象suite、typecheck、lint、配布drift、統合CIを対応付け |

## 検証と配送

- 修正前parentへ修正後t295を重ねたRed再実行: 9 pass / 4 fail。欠落marker、初回観測から消した`engineer-4`の偽陰性、段階なし診断2件で意図どおり失敗。
- PR commitを一時展開したfresh treeでt295を再実行: 13 pass / 0 fail / 101 expect。
- 同じtreeでIssue #1336 unitを再実行: 20 pass / 0 fail / 88 expect。
- 同じtreeでfull CLI integrationを再実行: 56 pass / 0 fail / 619 expect。
- 同じtreeで`bash -n packages/framework/core/tools/team-up.sh`: exit 0。
- 同じtreeで`bun scripts/package.ts --check`: Claude、Codex、Cursor、Kimi、Kiro、Kiro IDE、OpenCodeの全対象OK。
- 同じtreeで`bun run promote:self:check`: Claude、Codex、Cursor、OpenCode、Kimiの全対象OK。
- [PR #1688のCI](https://github.com/amadeus-dlc/amadeus/actions/runs/30455810027)は`CI Success`を含む必須checkが成功し、2026-07-29にmerge済み。
- Request Changes是正後の最終重点suite（#1663 unit／integration／E2E、clean-env回帰、#1336 unit／integration）: 104 pass / 0 fail / 942 expects。
- 是正後の`bash -n packages/framework/core/tools/team-up.sh`、`bun run typecheck`: exit 0。
- 是正後の`bun run lint`: exit 0。既存のcognitive-complexity 293 warnings / 21 infosのみで、新規errorなし。
- 是正後の`bun scripts/package.ts --check`と`bun run promote:self:check`: 全対象OK。

## 逸脱・未解決

- 固定sleep、timeout延長、worktree addの並列化、全体直列化は行っていない。
- Issue #1663専用unit 4件、integration 16件、E2E 3件を追加し、既存CLI integrationやPR CIとは区別して記録した。
- NFR-2は既存timeout・固定sleepを変えない制約、NFR-3は今回変更しないauthorization/provenance境界であるため、追加performance/security testは生成していない。
- SIGKILL後の自動cleanupとdirectory fsyncは保証しない。代わりに既存run recordを再利用せず、一時／partial／stale証拠を成功へ転用しないfail-closedを保証する。

## Revision 2 follow-up配送

- [PR #1713](https://github.com/amadeus-dlc/amadeus/pull/1713)をdraftで作成した。commitは`6a345bb633c41b29039955f2e4c2054aed3cc2da`。
- 最新`main`上で専用unit／integration／E2E／clean-env回帰を再実行し、28 pass／235 expectsだった。
- `bun run typecheck`、`bun run lint`、`bun scripts/package.ts --check`、`bun run promote:self:check`は成功した。Linux CIはdraft PRのcheckで確認する。
