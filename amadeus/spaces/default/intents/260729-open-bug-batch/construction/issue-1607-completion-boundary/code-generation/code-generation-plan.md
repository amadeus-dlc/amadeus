# #1607 Code Generation計画

## 対象と追跡

- 対象Issue: [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607)
- 入力fallback: `unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`とbrownfieldの既存Bolt証跡からスコープした。
- 対応要件: FR-1607-1〜5、FR-CROSS-1〜4、NFR-1、NFR-4〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 変更方針: 最終`report`、mirror completion、`WORKFLOW_COMPLETED`、registry seal、cursor clearを既存receipt／outbox／workspace lock境界の中で順序付け直す。complete後audit appendの例外、新しい公開verb、汎用transaction frameworkは追加しない。
- 依存順序: 本Boltを#1681より先に着地させ、#1681→#1680の順で続ける。#1607・#1664・#1681・#1680が完了するまでOTel Intent [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679)のConstructionを開始しない。

## Blast Radius

| 区分 | 対象 | 影響 |
|---|---|---|
| completion coordinator | `packages/framework/core/tools/amadeus-orchestrate.ts` | final stageの`report`がmirror chain未確定のまま`complete-workflow`と`done`へ進まないようにする。construction phase receiptとworkflow-completed eventを別条件で扱う |
| terminal state | `packages/framework/core/tools/amadeus-state.ts` | 再試行で不変なcompletion instanceを耐久化し、mirror成功／明示skip後だけ`WORKFLOW_COMPLETED`、registry complete、cursor clearを終端適用する |
| landing／audit候補 | `amadeus-mirror-{coordinator,executor,state-store,policy}.ts`、`amadeus-audit.ts` | Redが必要性を示したファイルだけ変更する。同一completion transactionのlanding evidenceを認めつつ、complete後append封鎖と`ARTIFACT_UPDATED`禁止は維持する |
| Project completion | `amadeus-mirror-project-{contract,executor,gateway,ledger-reducer,reconciliation-reducer,verification}.ts` | 原則変更しない。全Project rowのDone確認後にcloseする既存gateを関連suiteで回帰確認する |
| primary regression | `tests/unit/t265-engine-boundary.test.ts`、`tests/integration/t265-engine-boundary.integration.test.ts`、`tests/e2e/t265-engine-boundary.test.ts` | phase/completion identity、multi-intent実CLI、final reportからcursor releaseまでを固定する |
| retry／invariant | `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts`、`tests/e2e/t113.test.ts`、`tests/integration/t243-post-complete-audit-stop.test.ts` | crash matrix、terminal audit順序、post-complete sealを固定する |
| distribution | 7つの`dist/`面と5つのself-install面 | core正本変更後に既存generatorで再生成する。生成面を手編集しない |

新規package、database、常駐service、test runner設定は不要である。テスト設定は既存の`bun:test`、`tests/harness/cli-target.ts`、`--timeout 120000`を再利用し、設定ファイルを増やさない。

## 実装前baseline

- `bun test ... --timeout 120000`で、t265 unit／integration／e2e、t361 completion、t113 terminal ordering、t243 audit sealの6ファイルは**80 pass / 0 fail / 325 expect**。
- Project同期のt342／t346／t360／t364の4ファイルは**43 pass / 0 fail / 169 expect**。
- `bun run lint`はexit 0。既存baselineは**293 warnings / 21 infos**で、対象外のcomplexity warningを本Boltで整理しない。
- `bun scripts/package.ts --check`は7 harnessすべてGreen、`bun run promote:self:check`は5 self-install面すべてGreen。
- `bun run typecheck`は`node_modules/.bin/tsc`欠損によりexit 127で未実行。`package.json`／`bun.lock`はTypeScript 6.0.3を宣言しているため、実装開始時に`bun install --frozen-lockfile`で依存を復元して再実行し、環境不備をGreenへ丸めない。
- 上記既存suiteがGreenのままでも、multi-intentの最終`report`後にregistry complete／cursor clearが先行する欠陥は未検出である。追加する決定的Redを修正開始条件とする。

## 実装手順

- [x] **Step 1 — 実装時baselineを再取得する**: FR-CROSS-2／4、NFR-6へ追跡し、依存復元後にt265、t361、t113、t243、Project関連suite、typecheck、lint、package／promote driftを再実行する。到達可能なHEADで#1681またはOTel #1679の共有面が既に変わっていれば、差分と競合箇所を先に記録する。
- [x] **Step 2 — multi-intent実CLIの修正前Redを追加する**: FR-1607-1／2／4へ追跡し、`tests/e2e/t265-engine-boundary.test.ts`に2件以上のIntentを持つ一時workspaceを作る。対象Intentの最終`report --stage build-and-test --result approved`から開始し、mirror chain未確定時にregistryが`complete`にならずcursorが残ること、lone-intent fallbackなしで同じIntentを解決できること、完了確定前に`done`を返さないことを期待値にして現行コードをRedにする。
- [x] **Step 3 — phase receiptとcompletion identityのRedを追加する**: FR-1607-1へ追跡し、`tests/unit/t265-engine-boundary.test.ts`と`tests/integration/t265-engine-boundary.integration.test.ts`で、(a) construction phase receiptが`completed`でもworkflow-completed boundaryは未完了として発火する、(b) final reportの再試行で同じcompletion instanceを使う、(c)別Intent／別instance／別operationのreceiptを流用しない、を固定する。
- [x] **Step 4 — crash/retry matrixを制御注入でRedにする**: FR-1607-2／3／5へ追跡し、t361の実filesystem state-storeとfake gatewayを用いて、final sync前、Project Done反映後、close前を個別に失敗させた。さらに4つのterminal audit各追記後、state Completed後、registry complete後、cursor clear後の7点を個別にprocess crashさせた。各失敗直後のcompletion instance、receipt／ledger／outbox、registry、cursor、remote mutation回数を観測し、同じidentityの再実行で外部mutationとterminal auditを重複させず単一完了状態へ収束する期待値を固定した。
- [x] **Step 5 — Redの証拠から最小coordinator seamを裁定する**: `report`側でcompletion boundaryを先行させる案と、state completionにprepare／commitを持たせる案を、Step 2〜4の失敗位置、既存lock所有者、再試行時のdurable stateで比較する。既存receipt／outbox／state codecを再利用できる最小案だけを採り、新規汎用saga層や二重の真実源を作らない。裁定と不採用理由をcode-summaryへ残す。
- [x] **Step 6 — completion prepareを最小実装する**: FR-1607-1／2へ追跡し、final stageの成果物・gate検証後に不変completion instanceを一度だけ永続化する。mirrorが有効ならfinal sync→全Project row Done→close、promptなら同じ`expectedPrompt`、契約上のskipならskip証拠へ進め、途中結果では`complete-workflow`を呼ばない。mirror無効／既存非対象経路の互換も同じdecision seamで保つ。
- [x] **Step 7 — landing evidenceとaudit順序を最小修正する**: FR-1607-3へ追跡し、registry=`complete`の事後観測ではなく、同じIntent UUID・completion instance・operation・durable revisionに結び付くcompletion transaction証拠をexecutor authorizationへ渡す。receipt、`expectedPrompt`、outbox、mirror state transitionのauditをregistry seal前に耐久化し、`amadeus-audit.ts`のcomplete後append封鎖と`ARTIFACT_UPDATED`禁止は緩和しない。
- [x] **Step 8 — terminal commitをmirror chain後へ移す**: FR-1607-4／5へ追跡し、mirror成功または明示skipの耐久証拠を確認した後だけ、`STAGE_COMPLETED`／`PHASE_COMPLETED`／`PHASE_VERIFIED`／`WORKFLOW_COMPLETED`、state `Completed`、registry complete、audit seal、cursor clearを既存lock規律で終端適用する。再reportは二重eventを出さず、別Intentへ移ったcursorを消さない。
- [x] **Step 9 — RedをGreenにし隣接不変条件を確認する**: Step 2〜4の同一testをGreenにし、t113でterminal eventが一度だけ正順序で着地すること、t243でcomplete後appendが引き続き抑止されること、t342／t346／t360／t364でProject Done／close gate、failure containment、freshnessが不変であることを確認する。本番GitHub Issueへのmutationは行わない。
- [x] **Step 10 — 正本から配布面を再生成する**: FR-CROSS-3へ追跡し、変更は`packages/framework/core/`正本とtestsに限定する。既存generatorで7つの`dist/`面と5つのself-install面を再生成し、生成物の独立編集や一部面だけの手修正を行わない。
- [x] **Step 11 — 全Greenとdrift guardを実行する**: `bun run typecheck`、`bun run lint`、対象10 testファイル、`bun scripts/package.ts --check`、`bun run promote:self:check`、`git diff --check`を通す。統合後に`bun run test:ci`を実行し、cold-compile timeoutだけが出た場合は該当ファイルを`bun test --timeout 120000 <file>`で再検証して本Issueのretry失敗と区別する。
- [x] **Step 12 — 1 Issue = 1 Bolt = 1変更提案の証拠をまとめる**: FR-CROSS-1／4へ追跡し、code-summaryと[#1607](https://github.com/amadeus-dlc/amadeus/issues/1607)専用変更提案本文へ、確定根因、修正前Red、最小seamの裁定、修正後Green、crash matrix、実行検証、未実行項目と理由を記録する。他Issueの修正や一般的mirror refactorを同じ変更提案へ含めない。

- [x] **Step 13 — テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。

## 完了条件

- construction phase receiptとは独立したworkflow-completed identityが、再試行を通じて同一instanceで耐久化される。
- multi-intent workspaceの最終`report`から、final sync／明示skip、Project Done、close、mirror receipt／audit、`WORKFLOW_COMPLETED`、registry complete、cursor clearがこの順で完了する。
- 要求上の5失敗点をremote 3点とterminal 7点の注入位置へ具体化し、同じcompletion identity／receipt／ledger／outboxを使って再開し、外部mutation、terminal audit、registry transitionを重複させず単一状態へ収束する。
- complete後audit appendと`ARTIFACT_UPDATED`は引き続き拒否され、landing evidenceのためにsealを緩和していない。
- 対象／関連suite、typecheck、lint、package／promote drift、統合`test:ci`がGreenであり、未実行検証を成功扱いしていない。
- [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607)だけをcloseする1 Bolt／1変更提案として配送される。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T23:57:01Z
- **Iteration:** 1
- **Scope decision:** none

code-summaryの変更台帳と検証証拠が具体性を欠き、要件どおりの完了境界・再試行収束を実装成果物から監査できない。

### Findings

- code-summaryの変更ファイルがbasenameと「関連state codec／types」「全dist／self-install面」という曖昧な集合で示され、作成・変更した全パスを特定できないため、stageが要求するファイル台帳および正本から生成面までの配布同期を検証できない。
- FR-1607-1〜5が要求する同一completion instance、5か所のcrash/retry、外部mutation・receipt・auditの重複防止、別Intentへ移動したcursorの保護について、対応テスト名と各結果の双方向トレーサビリティがcode-summaryにない。
- 完了条件で必須としたbun run test:ciの実行結果が明記されず、「integration tier」の実行コマンド・対象・test:ciとの関係も不明なため、統合検証を成功扱いしてよいか判断できない。
- 新設したamadeus-workflow-completion.tsの責務、公開境界、既存state・receipt・ledger・outboxとの依存方向が記述されておらず、循環依存や二重の真実源を作っていないという設計判断を検証できない。
- 逸脱欄はlive Claude substrateのSKIPだけで、計画Step 5で要求したcoordinator先行案とprepare／commit案の比較および不採用理由が記録されていない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:05:29Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の全指摘が具体的な変更台帳、要件・テスト双方向追跡、最終test:ci証拠、依存方向とtruth source、設計案の比較裁定によって解消され、要件どおりの完了境界と再試行収束を実装成果物から監査できる。

### Findings

- None
