# Code Summary — fix-answer-manual-binding(Issue #1548)

上流入力(consumes 全数): requirements.md(FR-1〜4 / NFR-1〜3 の導出元)。code-generation-plan.md Step 2 の制約は逸脱裁定 B で一部解除(下記)。

- ブランチ: `fix/1548-answer-manual-binding`(worktree `.claude/worktrees/answer-manual-binding`)
- base: `origin/main = db92ed0bd`(rebase 確認 — up to date)
- コミット: `8ebfa227a` fix(mirror) 正本+テスト+allowlist / `2e415ce35` chore(mirror) dist+self-install 再生成
- 変更(正本+テスト): lifecycle(+8 — answer 側 manualOperation/invocationId 補填)/ coordinator(+59/-16 — skippedOutcome の operationId 再利用+handlePromptAnswer の consume)/ t282(+290 — 再現3ケース+helper)/ allowlist(±10 — 行シフト再ピン、E-FSPBTS13 の全数内容照合済み)。dist/self-install 24 ファイル同期

## 逸脱裁定の記録(2層+実装形)

1. **第2層の発見(裁定 B)**: guard 補填(FR-1 の narrow fix)だけでは expectedPrompt が consume されないことを builder が適用後実測で発見 — approve は `executionAuthorization`(coordinator :278-279)の既存 manual auth 優先が prompt-approved を上書きし `reducePrepare` :268 の消費が不発、skip は `skippedOutcome` :374 の新規 operationId が `reduceSkipForEvent` :396-400 で invalid。manual-boundary prompt は構造上常に reconcile 由来のため回避不能 → 逸脱停止 → **ユーザー裁定 B(coordinator/reducer までスコープ拡張、guard 不変。2026-07-27T01:00Z 頃)**
2. **実装形の裁定内選択**: 裁定 item 1 の字面(executionAuthorization で prompt-approved 優先)は executor の `authorizationMatches` 不変量(:287-289 — 保存 auth と kind 一致要求)に抵触し provenance block を誘発するため、**goal(consume・封鎖解除)を保ちつつ**: (a) executionAuthorization 無変更(不変量維持) (b) approve は handlePromptAnswer に `consumeAnsweredPrompt` を追加し、既定義だが未使用だった `consume-expected-prompt` 遷移(reducer :552)を発火 (c) skip は reconcile 対象 receipt の operationId を再利用(fresh は新規採番のまま)。builder が申告し conductor が受理(goal 一致・不変量非毀損・skip の consumeExpectedPrompt との対称性)

## Red→Green(regression-first、conductor 再演)

- pre-fix(正本2ファイルを origin/main へ面切替): 3ケースとも `Manual Mirror lifecycle requires an operation and invocation ID.` verbatim で赤(16 pass 3 fail)
- 復元後: **19 pass 0 fail**、ツリー clean(node_modules 除く 0)
- 中間実測(guard fix のみ)の「consume されない赤」も builder が記録(第2層の実証)

## 検証(conductor 再実測)

| コマンド | exit |
|---|---|
| bun run typecheck / bun run lint | 0 / 0 |
| t282 単体(19 tests) | 0(19 pass 0 fail) |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS) |
| bun run coverage:ci | 0(RESULT: PASS)※ |
| patch gate(origin/main base) | PASS(added 40 / covered 40 / uncovered 0) |
| bun run dist:check / promote:self:check | 0 / 0 |

※ conductor の1回目 coverage:ci は、先行の kill された coverage 実行が残した distribution writer/reader の stale ロック(`.amadeus/distribution-transaction/readers/`)で t-package-write-sweep が偽赤(exit 1)。生存プロセス 0 を確認して stale reader を回収 → 再実行で PASS(環境起因・自変更外 — 帰属は assertion 実文「distribution writer lock timed out after 5000ms」で確定)

## FR 対応表

| FR | 実装 |
|---|---|
| FR-1 answer の manual 補填 | lifecycle `runMirrorLifecycleAnswer` — manual 時のみ `manualOperation: expected.operation` / `invocationId: expected.event.boundary.instance`(parseManualArgs の元値と厳密一致)。guard 無変更 |
| FR-2 regression 3ケース | t282 新設(approve / skip / 封鎖解除 — いずれも consume = expectedPrompt null 化まで assert)。red→green 実証済み |
| FR-3 guard negative 維持 | t282「rejects incomplete manual lifecycle requests」green 維持(19 pass に含む) |
| FR-4 クローズ | PR 着地後(残作業) |
| NFR-1/2/3 | 配布24ファイル同期+drift green / 全ゲート green / answer verb の CLI 契約不変 |
