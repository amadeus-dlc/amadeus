# Code Generation Plan — fix-answer-manual-binding(Issue #1548)

上流入力(consumes 全数): requirements.md(FR-1〜4 / NFR-1〜3 の導出元)。units-generation SKIP のため unit 系 consumes 不在(degrade 様式)。

## 実装環境

- 専用 worktree `.claude/worktrees/answer-manual-binding`、ブランチ `fix/1548-answer-manual-binding`、base `origin/main`

## Steps(regression-first)

1. **Red の固定(FR-2)**: t282 へ manual ask→answer 往復テスト3ケース(approve / skip / 封鎖解除)を新設。再現シード = 先行 manual create の非終端 receipt → 後続 prompt モード boundary の reconciliation ask(`expectedPrompt.event.boundary.kind === "manual"` assert)。現行コードで 1,2 が「Manual Mirror lifecycle requires an operation and invocation ID」赤・3 が「expected prompt could not be persisted」連鎖の赤であることをログ実文で確認
2. **FR-1**: `runMirrorLifecycleAnswer`(lifecycle:969-985)で `expected.event.boundary.kind === "manual"` のとき `manualOperation: expected.operation`・`invocationId: expected.event.boundary.instance` を補填。guard・coordinator 無変更
3. **FR-3**: 既存 guard negative(t282:435)グリーン維持を確認
4. **NFR-1**: package.ts + promote:self → dist:check / promote:self:check グリーン(13コピー同期)
5. **NFR-2**: typecheck / lint / run-tests.sh --ci / coverage:ci 全 exit 0、lcov patch 未カバー 0
6. **code-summary.md** 作成(FR 対応表・red/green 対照ログ・実測 exit code)

## 制約

- 変更は lifecycle の補填+t282 テストのみ(surgical)。逸脱は実装前停止。検証は同期完遂

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T01:50:57Z
- **Iteration:** 1
- **Scope decision:** none

実装は surgical で FR-1〜3・裁定 B・実装形申告と全数一致。代替実装形(consume-expected-prompt 遷移+operationId 再利用)の不変量保全と goal 達成を builder の説明でなく独立再導出で検証(fresh 経路の二重 consume なし・fresh skip 非破壊・executionAuthorization/guard/reducer 無変更を diff 実測)。t282 の3新ケースは consume まで実 assert・検証劇場なし。allowlist 再ピンは E-FSPBTS13 全数照合で無音転位なし。Critical/Major/Minor とも 0 件。

### Findings

- None
