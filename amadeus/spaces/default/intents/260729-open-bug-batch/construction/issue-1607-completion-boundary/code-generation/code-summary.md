# Issue #1607 Code Generationサマリー

## 入力と検証対象

- 要件正本: `inception/requirements-analysis/requirements.md`のFR-1607-1〜5
- 実装正本: merge commit `c3f4bbf7f7136d113a10678060c99566a7a551d6`（head commits: `9eca278b9`、`c29b03ef7`、`8b1050ed5`、`97d03eb03`、`bb14fef0d`）
- 配送: [PR #1689](https://github.com/amadeus-dlc/amadeus/pull/1689)（2026-07-29T22:27:16Z merge）
- CI証拠: [GitHub Actions run 30468383467](https://github.com/amadeus-dlc/amadeus/actions/runs/30468383467)と、その[Tests job 90632028363](https://github.com/amadeus-dlc/amadeus/actions/runs/30468383467/job/90632028363)

`unit-of-work.md`は`amadeus-bugfix`スコープでexpected absentのため補完していない。以下はPR APIの変更ファイル一覧、merge commitの実コード、テスト名、GitHub Actionsの実ログを再照合した記録である。

## 実装結果

- final approvalで`Workflow Completion Instance`、`Workflow Completion Stage`、`Workflow Completion Status`をworkflow stateへ一度だけ準備し、construction phase receiptと独立した`workflow-completed` boundaryを作った。
- mirror有効時はfinal approvalで終端コミットを保留する。completion boundaryのsync、Project Done、closeまたは明示skipがsettleし、audit outboxが空になるまで`complete-workflow`は拒否する。
- lifecycleとterminal commandへ`--intent`／`--space`を伝播し、対象Intentをcursorの現在値から独立して固定した。
- `complete-workflow --completion-instance`をreplay-safeにし、terminal audit、state Completed、registry complete、cursor clearの途中停止から再開できるようにした。
- complete後audit appendの例外や新しいCLI verb、汎用saga storeは追加していない。

## 変更ファイル台帳

PR APIで確認した変更は131ファイルである。`A`は追加、`M`は変更を表す。

### canonical core（9）

- M `packages/framework/core/tools/amadeus-mirror-coordinator.ts`
- M `packages/framework/core/tools/amadeus-mirror-executor.ts`
- M `packages/framework/core/tools/amadeus-mirror-lifecycle.ts`
- M `packages/framework/core/tools/amadeus-mirror-policy.ts`
- M `packages/framework/core/tools/amadeus-mirror-state-codec.ts`
- M `packages/framework/core/tools/amadeus-mirror-types.ts`
- M `packages/framework/core/tools/amadeus-orchestrate.ts`
- M `packages/framework/core/tools/amadeus-state.ts`
- A `packages/framework/core/tools/amadeus-workflow-completion.ts`

### project-local self-install（45）

次の5つの具体rootへ、canonical coreと同じ9ファイルを投影した。

| harness | root |
|---|---|
| Claude | `.claude/tools/` |
| Codex | `.codex/tools/` |
| Cursor | `.cursor/tools/` |
| Kimi | `.kimi-code/tools/` |
| OpenCode | `.opencode/tools/` |

各rootの変更ファイル名は`amadeus-mirror-coordinator.ts`、`amadeus-mirror-executor.ts`、`amadeus-mirror-lifecycle.ts`、`amadeus-mirror-policy.ts`、`amadeus-mirror-state-codec.ts`、`amadeus-mirror-types.ts`、`amadeus-orchestrate.ts`、`amadeus-state.ts`（M）と`amadeus-workflow-completion.ts`（A）である。rootとこの閉じたファイル名集合の直積が45パスであり、曖昧な「関連ファイル」は含まない。

### generated dist（63）

次の7つの具体rootへ、self-installと同じ閉じた9ファイル名集合（8M＋1A）を投影した。

| harness | root |
|---|---|
| Claude | `dist/claude/.claude/tools/` |
| Codex | `dist/codex/.codex/tools/` |
| Cursor | `dist/cursor/.cursor/tools/` |
| Kimi | `dist/kimi/.kimi-code/tools/` |
| Kiro | `dist/kiro/.kiro/tools/` |
| Kiro IDE | `dist/kiro-ide/.kiro/tools/` |
| OpenCode | `dist/opencode/.opencode/tools/` |

rootと上記9ファイル名集合の直積が63パスである。正本から生成された全パスは次の実コマンドで再現確認できる。

```bash
git diff --name-status c3f4bbf7f7136d113a10678060c99566a7a551d6^ c3f4bbf7f7136d113a10678060c99566a7a551d6
gh api --paginate repos/amadeus-dlc/amadeus/pulls/1689/files --jq '.[].filename'
```

### testsとstage artifacts（14）

- M `tests/.coverage-patch-allowlist.json`
- M `tests/e2e/t265-engine-boundary.test.ts`
- M `tests/integration/t-coverage-mechanism-ratchet.test.ts`
- M `tests/integration/t-solo-gate-transaction-report.test.ts`
- M `tests/integration/t265-engine-boundary.integration.test.ts`
- M `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`
- M `tests/integration/t346-amadeus-mirror-lifecycle-projects.fixture.ts`
- M `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts`
- M `tests/integration/t48-audit-event-emitters.test.ts`
- M `tests/unit/t115.test.ts`
- M `tests/unit/t265-engine-boundary.test.ts`
- M `tests/unit/t279-amadeus-mirror-executor.test.ts`
- A `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1607-completion-boundary/code-generation/code-generation-plan.md`
- A `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1607-completion-boundary/code-generation/code-summary.md`

## `amadeus-workflow-completion.ts`の設計境界

### 責務と公開面

同モジュールの公開面はTypeScript exportだけであり、新しいCLI verbではない。

- `workflowCompletionPreparation(content)`: workflow stateの3フィールドを一組としてparseし、不完全・不正stage・不正statusを拒否する。
- `prepareWorkflowCompletion(content, stage, instance)`: 未準備時だけ3フィールドを追加し、同一identityの再実行はbyte-equivalentなno-op、別identityへの差し替えはerrorにする。
- `completionMirrorDisposition(projectDir, intentOverride)`: layered mirror configを解決し、`off`なら`immediate`、それ以外なら`defer`、不正config／Intent解決不能なら`error`を返す。
- 公開型は`WorkflowCompletionPreparation`と`CompletionMirrorDisposition`だけである。

CLIの役割は分離されている。`amadeus-orchestrate.ts`は最終reportでprepare／再発行の経路を選び、selector付きの次コマンドを表示する。`amadeus-mirror-lifecycle.ts`はremote sync／Project Done／closeとreceipt／ledger／outboxを進める。`amadeus-state.ts complete-workflow`だけがsettlementを検査し、terminal audit、state、registry、cursorを終端化する。

### 依存方向とtruth source

consumerからdependencyへの方向は次のとおりで、`amadeus-workflow-completion.ts`からconsumerへの逆importはない。

```text
amadeus-orchestrate.ts ─┐
amadeus-state.ts ───────┼─> amadeus-workflow-completion.ts
amadeus-mirror-lifecycle.ts ┘          │
                                      ├─> amadeus-lib.ts
                                      └─> amadeus-mirror-config.ts

amadeus-state.ts ─> amadeus-mirror-policy.ts ─> mirror receipt/types
amadeus-mirror-lifecycle.ts ─> amadeus-mirror-coordinator.ts ─> amadeus-mirror-executor.ts
                         └─> amadeus-mirror-state-store.ts
```

- completion identity／stage／statusの正本は対象recordの`amadeus-state.md` Runtime Stateである。
- remote settlementの正本は同じrecordのMirror State blockにある、同一Intent UUID・completion instance・operationでkeyedされたreceipt、Project ledger、`expectedPrompt`、audit outboxである。
- `intents.json`の`complete`とactive-intent cursorはsettlement後に公開する終端結果であり、landing evidenceの正本にはしない。
- GitHub Issue／Projectは外部mutation先であり、ローカルcompletion transactionのtruth sourceにはしない。

この分離によりworkflow stateとMirror Stateは別の事実を所有し、completion identityをreceipt storeへ複製する新規storeや、registry=`complete`を先行条件にする循環を作っていない。

## 設計裁定: coordinator先行案とprepare／commit案

| 案 | 既存境界との適合 | crash/retry | 裁定 |
|---|---|---|---|
| coordinator先行 | final `report`からmirror coordinatorを先に実行し、その後に従来のterminal completionへ進む案。実コード上、orchestratorはstate／audit／registryのworkspace lock所有者ではなく、mirror処理も直接実行せず次のCLI directiveを表示する境界である | remote mutation前にdurable completion identityをstateへ置かなければ、process停止後のreportが同一boundary／receiptを再構成できない。coordinatorへterminal state／registry／cursorのcommit責務を移すと、既存`complete-workflow`とlock所有が二重化する | 不採用 |
| state prepare／mirror settlement／state commit | final approvalの既存state transaction内でidentityをprepareし、lifecycleは同一identityの既存receipt／ledger／outboxを進め、既存`complete-workflow`がsettlement確認後に終端commitする案 | prepare済みstate、receipt、ledger、outbox、completion instanceが各process間に残る。remote 3点とterminal 7点の注入試験で、同一コマンドの再実行が単一状態へ収束した | 採用 |

採用理由は、新しいsaga coordinatorではなく既存の所有境界を維持できることである。`amadeus-state.ts`がstate／terminal audit／registry／cursorのcommitを、mirror lifecycleがremote mutationとmirror evidenceを引き続き所有する。不採用理由は抽象的な複雑性ではなく、orchestratorにdurable stateとworkspace lockがなく、テストで必要になった「remote mutation前の同一identity」と「terminal途中停止の個別再開」を単独では満たさないためである。

## 要件・テスト双方向トレーサビリティ

| 要件／不変条件 | 対応テスト（ファイル :: test名） | 観測する事実 |
|---|---|---|
| FR-1607-1: durable completion instance | `tests/unit/t265-engine-boundary.test.ts` :: `persists one completion instance independently of construction receipts`、`refuses to replace a durable completion instance`、`does not reuse receipts from another completion instance`; `tests/integration/t265-engine-boundary.integration.test.ts` :: `completion identity is not suppressed by a completed construction receipt`、`repeated final report re-emits the prepared completion boundary without mutation` | phase receiptと独立したidentity、同一identity再利用、別instance receipt拒否 |
| FR-1607-2: completion saga | `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts` :: `a prepared in-flight completion reaches Done and close before registry seal`、`the same completion boundary resumes after %s without repeating remote mutations`; `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts` :: `sync recovers after remote success and a local completion-write failure`、`close recovers after remote success, then manual close converges without another mutation` | registry=`in-flight`のままDone／close、失敗後も同じreceipt／ledgerから再開、remote mutation非重複 |
| FR-1607-3: landing evidence／audit seal | `tests/unit/t279-amadeus-mirror-executor.test.ts` :: `workflow completion rejects non-running in-flight landing evidence`、`close rejects Project evidence from a different completion instance`; `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts` :: `a prepared in-flight completion reaches Done and close before registry seal`、`terminal commit resumes after %s without duplicate terminal audit`; `tests/integration/t243-post-complete-audit-stop.test.ts` :: `append to a complete intent is suppressed (explicit intent + advisory)`; `tests/integration/t48-audit-event-emitters.test.ts`のemitter forward／reverse checks | landingが同一instanceとRunning/in-flightに結合、terminal audit各1行、complete後append封鎖と既存audit emitter契約維持 |
| FR-1607-4: cursor終端処理 | `tests/e2e/t265-engine-boundary.test.ts` :: `final report keeps a multi-intent workflow addressable until completion mirror settles`; `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts` :: `a moved cursor keeps the original Intent pinned through lifecycle and terminal commit`; `tests/integration/t265-engine-boundary.integration.test.ts` :: `grant-backed final approval defers completion and preserves the active non-owner Intent` | 明示selectorで元Intentだけを完了し、別Intentへ移動済みcursor／state／audit／registry rowを保存 |
| FR-1607-5: crash/retry | `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts`のremote 3点matrixとterminal 7点matrix | 各停止後に同一completion instanceで再開し、remote mutation、audit、state、registry、cursorが単一結果へ収束 |
| receipt／外部mutation重複防止 | t361 remote matrixで`edit`、Project `update`、`close`が各1回; `tests/unit/t265-engine-boundary.test.ts` :: `does not reuse receipts from another completion instance`; `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`のremote-success/local-write-failure回帰 | operationとinstanceが異なるreceiptを流用せず、成功済み外部操作を再発行しない |
| audit重複防止 | t361 terminal matrixで`STAGE_COMPLETED`、`PHASE_COMPLETED`、`PHASE_VERIFIED`、`WORKFLOW_COMPLETED`が各1行、3回目実行でstate bytesとaudit count不変 | terminal途中停止とreplayでauditを二重追記しない |
| cursor保護 | t265 E2E multi-intent、t361 `a moved cursor...`、t265 integration `...preserves the active non-owner Intent` | compare-and-clearにより対象Intentを指すcursorだけを削除する |

### crash/retry要求の具体対応

| 要求失敗点 | 注入点／test iteration | failure直後とretry後のassertion |
|---|---|---|
| final sync前 | t361 remote matrix `before-final-sync` | sync receiptなし、remote edit／Project update／closeなし、registry in-flight、cursor維持。retry後は各remote mutation 1回 |
| Project Done反映後 | t361 remote matrix `after-project-done` | sync receiptとDone ledgerを保持、close未実行。retry後にProject updateを繰り返さずcloseへ進む |
| close前 | t361 remote matrix `before-close` | sync succeeded、close receipt prepared、Issue open。retry後のcloseは1回 |
| audit seal前 | t361 terminal matrixの`after-stage-completed-audit`、`after-phase-completed-audit`、`after-phase-verified-audit`、`after-workflow-completed-audit`、`after-state-completed` | registry complete前の各永続化境界から再開し、terminal audit 4種を各1行に保つ |
| cursor clear前 | t361 terminal matrix `after-registry-complete` | registry complete後も再実行可能で、対象cursorだけをclearする |
| cursor clear直後の追加回帰 | t361 terminal matrix `after-cursor-clear` | crash後の再実行と3回目replayでstate bytes／audit countが不変 |

auto modeのt361 remote matrixは各失敗snapshotで`expectedPrompt`が未設定、audit outboxがnullのままであることを確認する。prompt modeは`tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts` :: `prompt approval consumes its durable binding atomically and cannot be replayed`がdurable bindingの一度だけの消費を確認する。terminal commit側では`tests/integration/t265-engine-boundary.integration.test.ts` :: `prepared completion refuses a pending mirror audit outbox`が未flush outboxを拒否する。したがって、存在しないauto-mode promptを「再利用した」とは主張していない。

## 検証結果

### `test:ci`

- ローカルの初回`bun run test:ci`は、652 test files／9,019 assertionsを実行し、追加spawn testのmechanism ratchet未登録、terminal audit helperを追跡しない静的pairing test、そのmeta-testの計3件を検出した。これは成功扱いしていない。
- 3件の修正後、該当直接再検証は24 pass／0 fail／43 expect。
- PR最終head `bb14fef0d2b614d1d3d2e682ed6329608d0857c6`に対するGitHub Actionsの実コマンドは`bun run test:ci -- -P 4`（展開後`bun tests/run-tests.ts --ci -P 4`）。Tests jobは2026-07-29T16:05:23Zに**653 test files／9,085 assertions／0 failed files／0 failed assertions**で成功した。
- したがって最終`test:ci` Greenの証拠はローカルの無修飾再実行ではなく、上記GitHub Actions実ログである。

### Integration tier

- runnerが定義する単独実行コマンドは`bun tests/run-tests.ts --integration`（`tests/run-tests.ts --help`と`docs/reference/09-testing.md`の対応）。
- merge済みstage artifactに記録された修正後結果は**314 test files／3,819 assertions／0 failures**。
- 単独Integration実行のraw log／実行時刻はPR証跡に保存されていないため、上記結果を生ログで独立再構成できるとは主張しない。最終GitHub Actionsは`--ci` profile（smoke＋unit＋integration）でIntegrationを包含し、全体653 files／9,085 assertions／0 failuresを確認した。

### その他のgate

- PR check rollupで`Typecheck`、`Lint and complexity`、`Intent Mirror distribution contract`、`Dist and self-install drift`、`Tests`、`CI Success`はSUCCESS。
- `bun scripts/package.ts --check`と`bun run promote:self:check`はPRの`Dist and self-install drift` jobで成功し、canonical coreから7 dist／5 self-install面への同期を確認した。
- live Claude substrate依存ケースはGitHub Actionsログで`Claude substrate unavailable; derived live mechanism`としてSKIP。SKIPを成功件数へ読み替えていない。

## 配送結果

[PR #1689](https://github.com/amadeus-dlc/amadeus/pull/1689)はCI Success後にmergeされ、Issue #1607をcloseした。変更台帳には他Issueの実装ファイルを含まず、1 Issue = 1 Bolt = 1 PRの境界を維持した。
