# Issue #1663 Code Generation計画

上流入力(consumes全数): `requirements.md`、Issue #1663、Issue #1336の実装・テスト証跡

## 入力とスコープ

- 対象: [Issue #1663](https://github.com/amadeus-dlc/amadeus/issues/1663)
- 要件: FR-CROSS-1〜4、FR-1663-1〜3
- 変更種別: `amadeus-bugfix`
- 実装証拠の基準点: [PR #1688](https://github.com/amadeus-dlc/amadeus/pull/1688)のhead commit [`3597bfb7c`](https://github.com/amadeus-dlc/amadeus/commit/3597bfb7c20642922e8970490d58a97eebbd864d)。Request Changes是正はこのcommitをHEADとする専用worktreeへ未コミット差分として実装し、実測テストを証拠とする。
- `unit-of-work.md`は`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`と既存Bolt証跡からスコープした。
- Issue #1336のreadiness契約を取り込んだ後に、`create_run()`のmember worktree完了判定だけを変更する。

## 変更・生成パスとblast radius

| 区分 | パス |
|---|---|
| 手編集した正本 | `packages/framework/core/tools/team-up.sh` |
| 回帰テスト | `tests/integration/t295-team-up-worktree-parallel.test.ts` |
| unit（新規） | `tests/unit/t-team-up-member-readiness.test.ts` |
| E2E（新規） | `tests/e2e/t-team-up-member-readiness.serial.test.ts` |
| clean-env回帰（変更） | `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts` |
| self-install生成面 | `.claude/tools/team-up.sh` |
| self-install生成面 | `.codex/tools/team-up.sh` |
| self-install生成面 | `.cursor/tools/team-up.sh` |
| self-install生成面 | `.kimi-code/tools/team-up.sh` |
| self-install生成面 | `.opencode/tools/team-up.sh` |
| dist生成面 | `dist/claude/.claude/tools/team-up.sh` |
| dist生成面 | `dist/codex/.codex/tools/team-up.sh` |
| dist生成面 | `dist/cursor/.cursor/tools/team-up.sh` |
| dist生成面 | `dist/kimi/.kimi-code/tools/team-up.sh` |
| dist生成面 | `dist/kiro/.kiro/tools/team-up.sh` |
| dist生成面 | `dist/kiro-ide/.kiro/tools/team-up.sh` |
| dist生成面 | `dist/opencode/.opencode/tools/team-up.sh` |
| 新規成果物 | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1663-member-readiness/code-generation/code-generation-plan.md` |
| 新規成果物 | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1663-member-readiness/code-generation/code-summary.md` |

blast radiusは、正本と5つのself-install面・7つのdist面からteam-upを起動する全ハーネスである。run recordには各memberの`registered`、`checked-out`、`ready`が追加される。CLI引数、worktree branch命名、registrationの直列性、checkout並列度4、Issue #1336のsafety-wait形式、CI workflowには変更を加えない。

## 実装手順

- [x] **Step 1 — Redを固定する**: 初回の全体registry観測から任意memberだけを欠落させ、実際の登録・checkout・record完了後でも旧実装が偽陰性になる制御fixtureを追加する。
- [x] **Step 2 — member単位の証跡を実装する**: serial registration後の`registered`、checkout後の`checked-out`、record完了後の`ready`を永続化する。
- [x] **Step 3 — 完了集約を修正する**: 起動したcheckout PIDを明示的に待ち、全memberの三段階証跡が揃うまで成功しないようにする。
- [x] **Step 4 — 診断を具体化する**: 欠落を`member(registration|checkout|record)`形式でstderrへ出す。
- [x] **Step 5 — 回帰テストを実行する**: t295、Issue #1336のunit/integration、shell構文を検証する。
- [x] **Step 6 — 配布面を同期する**: 正本から全dist／self-install面を再生成する。
- [x] **Step 7 — 品質ゲートを実行する**: typecheck、lint、test:ci、package／promote drift、diff checkを実行する。
- [x] **Step 8 — テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。
- [x] **Step 9 — 証拠をcanonical JSONへ強化する**: schemaVersion・run・member・stageを完全一致で束縛したpayloadを同一directory内の一時ファイルへ書き、renameで原子的に確定する。
- [x] **Step 10 — partial／stale／crashをfail-closedにする**: 空・部分・別run・別member・別stage・余剰fieldを拒否し、同じrun IDの既存recordを再利用せず明示診断で停止する。
- [x] **Step 11 — 専用unit／integration／E2Eを追加する**: pure shell契約、real Git/FSの段階証跡、実`team-up.sh` CLIの成功・改ざん・crash-stale拒否をそれぞれ固定する。
- [x] **Step 12 — 是正後の最終ゲートを通す**: #1663専用テストと#1336回帰、shell構文、typecheck、lint、package／promote drift、diff checkを実装後に再実行する。

## readiness証拠の実装契約

| 観点 | 実装事実 | 判定 |
|---|---|---|
| run束縛 | marker pathに加え、canonical payloadの`run`がexact `RUN_ID`と一致する場合だけ受理する | path＋内容でrun束縛あり |
| member束縛 | marker pathに加え、canonical payloadの`member`が走査中memberと一致する場合だけ受理する | path＋内容でmember束縛あり |
| 初期化 | fresh run開始時に`RUN_ROOT`または`RUN_RECORD`が存在すれば拒否し、存在しない場合だけ新規作成する | 古いrecordを初期状態として再利用しない |
| 順序 | `registered`は個別registration検証後、`checked-out`はcheckout成功後、`ready`は`path`と`branch`書き込み後に保存する。親は起動したPIDを明示待機する | 段階順序あり |
| cleanup | 通常の非ゼロ終了かつagent起動前ならEXIT trapがworktree・branch・`RUN_RECORD`を削除する。t295はpartial failureとhusk cleanupを検証する | 通常失敗のcleanupあり |
| stale拒否 | 同じ`RUN_ID`の既存`RUN_ROOT`／`RUN_RECORD`を`refusing stale member readiness evidence`で拒否し、marker内容が別run／member／stageなら集約でも拒否する | staleを完了証拠へ再利用しない |
| 原子性・真正性 | `write_member_readiness_evidence`が同一member directoryの一時ファイルへcanonical JSONを書き、`mv -f --`で確定する。集約は3段階すべてをexact payload比較する | partial finalと内容改ざんをfail-closedで拒否 |
| crash後 | SIGKILLでrecordや一時ファイルが残り得るが、同一`RUN_ID`再実行はrecord全体を拒否し、一時ファイルやpartial finalは成功判定へ使わない | 自動回収ではなく安全なstale拒否を保証 |

異常終了後の自動回収は保証しない。保証するのは、partial／stale／改ざん済み証拠を現runの完了へ転用しないfail-closed境界である。

## Comprehensiveテスト戦略

対象componentはshell関数`create_run()`であり、Comprehensiveの期待量はsoft guidelineとして10〜15件/component、種類はunit＋integration＋E2Eである。

| 層 | 適用と量 | 要件対応 |
|---|---|---|
| Unit | `tests/unit/t-team-up-member-readiness.test.ts`の4件。exact payload、unsafe identity、canonical受理、stale／partial／余剰field拒否をpure shell境界で検証する | FR-1663-1、NFR-1 |
| Integration | `tests/integration/t295-team-up-worktree-parallel.test.ts`の16件。real Git・real filesystemで全memberのexact三段階JSON、原子的一時ファイル除去、改ざん、partial/crash、stale run、直列registration、checkout上限4を検証する | FR-CROSS-2、FR-1663-1〜2、NFR-1 |
| E2E | `tests/e2e/t-team-up-member-readiness.serial.test.ts`の3件。実`bash team-up.sh` CLIとreal Git/FSで成功、ready改ざん時のfail-closed＋rollback、crash-stale拒否を検証する | FR-1663-1〜2、NFR-1、NFR-6 |
| CI | [PR #1688のTests job](https://github.com/amadeus-dlc/amadeus/actions/runs/30455810027/job/90589003902)はunit/integration/E2Eを含む全suiteをclean checkoutで実行したが、Issue #1663 markerを実Herdr/agmsgで観測する専用E2Eではない | 配送回帰。専用E2Eの代替とはしない |

#1663専用でunit 4件、integration 16件、E2E 3件を持ち、Comprehensiveの層を満たした。Herdr/agmsgはtest substrateへ置換するが、製品`team-up.sh`、real Git、real filesystem、実CLI exit／stderr／cleanupを通すため、member readinessのsystem boundaryを直接検証する。NFR-2はtimeout・固定sleepを変更しない負の制約、NFR-3は今回変更しないauthorization/provenance境界である。

## 要件と検証の対応

| 要件 | 実装・テスト |
|---|---|
| FR-CROSS-1 | [PR #1688](https://github.com/amadeus-dlc/amadeus/pull/1688)はIssue #1663だけを`Closes`し、根因・Red・Green・検証を記録 |
| FR-CROSS-2 | t295の制御shimが初回registry観測から`engineer-4`だけを欠落させ、修正前の偽陰性と修正後Greenを固定 |
| FR-CROSS-3 | 上記正本1面からself-install 5面・dist 7面を生成し、package/promote drift guardで同期確認 |
| FR-CROSS-4 | 本表と`code-summary.md`で受け入れ条件・テスト・未解決事項を双方向対応 |
| FR-1663-1 | unitのexact payload、t295の全member canonical JSONと改ざん拒否、E2Eの成功／ready改ざん拒否 |
| FR-1663-2 | t295のregistration peak=1、checkout peak 2〜4、初回registry欠落Green |
| FR-1663-3 | Issue #1336 unit 20件、resume integration 56件を回帰実行し、safety-wait実装面は変更なし |
| NFR-1 | 同一directoryの一時ファイル＋rename、exact payload照合、partial final／crash temp／stale record拒否をunit・integration・E2Eで検証 |
| NFR-2 | timeout値・固定sleep・registration/checkoutのserial/parallel分類を変更せず、t295で並列上限を検証 |
| NFR-3 | agent role・intent・gate・secret出力の境界は変更なし。追加security検査は非適用 |
| NFR-4 | macOSでPR commitの対象suiteを再実行し、Linux GitHub Actionsでも全suite Green |
| NFR-5 | `create_run()`だけの最小差分とし、汎用supervisor/frameworkを追加せず配布driftを検証 |
| NFR-6 | 同一制御fixtureのRed/Green、対象suite、typecheck、lint、package/promote drift、統合CIを実行 |

## 完了条件

- `git worktree add`は直列、checkout並列度は4のまま維持される。
- 一回の全体観測を完了の唯一の根拠にしない。
- [PR #1688](https://github.com/amadeus-dlc/amadeus/pull/1688)がIssue #1663だけをcloseし、CI成功後にmergeされている。
- readiness証拠は原子的なcanonical JSONであり、partial／改ざん／stale／crash残骸を成功証拠へ再利用しない。
- Issue #1663専用unit／integration／E2EとIssue #1336回帰、品質gateがGreenである。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:06:32Z
- **Iteration:** 1
- **Scope decision:** none

member単位の待機方針は要件に沿うが、配布差分・再実行時の証拠契約・Comprehensiveテストの記録が不足し、実装の安全性を確認できない。

### Findings

- Major: code-summary.mdは正本とテストの2パスしか列挙せず、「全生成面を同期した」とだけ記載しているため、必須の作成・変更ファイル一覧を満たさず、配布同期の完全性と変更のblast radiusを検証できない。
- Major: 永続化するregistered／checked-out／ready証拠についてrun・memberへの束縛、開始時初期化、失敗時cleanup、原子的更新、再試行時の古い証拠拒否が計画・要約に定義されておらず、crash/retryで旧markerを現runの完了証拠として誤受理する可能性が残る。
- Major: 要件のテスト戦略はComprehensiveだが、計画と要約は対象回帰・unit・integrationのみでE2Eテストファイル、各要件との対応、期待テスト量を示しておらず、ステージが要求するunit＋integration＋E2Eの検証を満たしたと確認できない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:15:28Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の記録不足は是正されたが、文書化によって未実装保証が顕在化しただけで、必須の信頼性保証とComprehensiveテスト契約は未充足のままである。

### Findings

- Major: readiness markerは直接書き込みで、集約はファイル存在だけを検査するため、原子的更新、内容真正性、partial marker拒否が保証されていない。さらにSIGKILL後のrecord回収とcrash/retry fixtureもなく、code-summary自身がこれらを未解決と認めている。永続的な完了証拠を導入する変更としてNFR-1のcrash/retry・冪等性保証を満たさず、READYにはできない。
- Major: activeなComprehensive戦略は対象componentについてunit・integration・E2Eを要求するが、Issue #1663の直接証拠はintegration 13件だけで、専用unitおよびE2Eは未実装である。Issue #1336のunit/CLI integrationや全体CIはFR-1663-1〜2の専用E2Eを代替せず、計画と要約も明示的に未充足と認めている。ステージの必須テスト契約を満たしていない。

## Request Changes是正（2026-07-30）

- readiness証拠を`schemaVersion`・`run`・`member`・`stage`へ束縛したcanonical JSONとし、同一directoryの一時ファイルからrenameして確定する実装へ変更した。
- 集約を`-f`からexact payload照合へ変更し、空・partial・別run・別member・別stage・余剰fieldを拒否する。crash後の自動回収ではなく、既存run recordの再利用拒否と一時／partial証拠の非受理を安全境界とした。
- 専用unit 4件、integration 16件、E2E 3件を追加・強化した。#1336回帰を含む最終重点suiteは104 pass / 0 fail / 942 expects、typecheck／lint／package／promote driftも成功した。

## Revision 2 follow-up配送

- commit: `6a345bb633c41b29039955f2e4c2054aed3cc2da`
- draft PR: [PR #1713](https://github.com/amadeus-dlc/amadeus/pull/1713)
- 最新`main`起点の1 commitとして、正本、生成済み全harness面、専用unit／integration／E2Eを配送した。
- push前検証: 28 pass／235 expects、typecheck／lint／package／promote drift成功。Intent runtimeのstate／auditは含めていない。
