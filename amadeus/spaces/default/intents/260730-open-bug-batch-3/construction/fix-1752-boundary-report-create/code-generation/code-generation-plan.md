# Code Generation Plan — fix-1752-boundary-report-create

上流入力(consumes 全数): requirements.md — FR-3(#1752、裁定 Q3=A = create receipt 存在判定)を実装対象とし、受け入れ基準1〜4をテスト計画の導出元とした。

## 計画(実施順)

1. 実装前 RE: `handleReport` の mirror boundary 分岐、`classifyReceipt` の receipt 語彙、`MirrorStateSnapshot.receipts` seam、`tests/integration/t265-engine-boundary.integration.test.ts` の既存 fixture 構造を実読で確定。
2. ブランチ `bolt/fix-1752-boundary-report-create` を HEAD(3f73823b1)から作成(worktree 隔離)。
3. **Red**: t265 integration の fixture に create receipt 注入オプション(`seededMirrorBlock(createReceipt?)`)を追加し、受理系の失敗テストを先行追加 → exit 1 実測。途中、`attemptedAt` 欠落で mirror block が invalid になり修正前でも green になる偽 green を probe で検出 — fixture に `parseMirrorStateDocument` の妥当性 assert を追加して封鎖し、Red を取り直した。
4. **Green**: `amadeus-mirror-state-codec.ts` に `succeededMirrorCreateExists(document)` を新設(`mirrorIssueNumberFromDocument` と同じ document 導出関数群に配置)し、`amadeus-orchestrate.ts` の拒否条件 `(answer === "create" && hasMirrorIssue)` を `(answer === "create" && !createRan)` へ最小差分で置換。
5. 同根棚卸し(grep 全参照): 「report が自分の実行結果を再評価して拒否する」同型は他に無しを確定。
6. 配布同期: `bun scripts/package.ts` → `bun run promote:self`。
7. 検証: typecheck / lint / dist:check / promote:self:check / 対象テスト(実在確認+Ran 照合) / mirror 隣接5スイート / complexity / coverage patch / フル coverage:ci。
8. coverage allowlist 行ピンの機械 remap(difflib equal opcode)+全40ピンの行内容バイト一致照合(cid:code-generation:c1-allowlist-mechanical-remap 準拠、再適用の二重シフトを検出し commit 版へ復元のうえ再検証)。
9. deslop(行数中立を維持)→ 再生成・全検証再実行。
10. コミット → push → PR 発行(#1802)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T01:10:47Z
- **Iteration:** 1
- **Scope decision:** none

PR #1802 の実装は FR-3a〜3d と受け入れ基準を過不足なく満たし、record 成果物は PR の実態と一致する。

### Findings

- None
