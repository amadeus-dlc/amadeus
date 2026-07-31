# Code Generation Plan — fix-1816-mirror-terminal-status

上流入力(consumes 全数): requirements.md — FR-4(#1816、裁定 Q1=A/Q2=A、追加裁定 E-OBB4-CG1 = FR-4b')を実装対象とし、受け入れ基準1〜4をテスト計画の導出元とした。

## 計画(実施順)

1. 実装前 RE: presentation の render 経路・lifecycle の snapshot 供給・compareMirrorStatus の比較面・t281/t232/t361 の assert を実読で再確定。
2. ブランチ `bolt/fix-1816-mirror-terminal-status` を worktree 隔離で作成。
3. **Red**(t281 追加): completionInstance 有り → `## Status` = Completed(現行 Running のため Red exit 1)→ **Green**(presentation の導出描画、Phase/Stage 不変)。
4. 配布同期(7ハーネス dist+self-install)→ allowlist 行ピン機械 remap+全件直読照合(1回目: 5件中 直撃/シフトを個別行写像で再グループ化、端点素朴 remap が新規行を無言 waive する罠を検出し回避。STALE loud fail した測定可能行ゼロの分割片は削除)。
5. **逸脱停止**: Bugbot 指摘を scratch で再現 — compareMirrorStatus の第2比較面(view.currentStatus = lifecycle:410 の生値)が未導出で completion 窓に偽 diverged。FR-4a の表示層限定ファイル範囲外のため実装せず停止・conductor へ報告(deviation-stop-before-implement / deviation-applicability-not-solo)。
6. **裁定 E-OBB4-CG1(案1 採用 2-0)受領後**: `mirrorSnapshotStatus` として導出を単一定義へ引き上げ、sync writer(renderMirrorIssueContent)と drift check(buildMirrorStatusRecordView.currentStatus)が同じ canonical から読む形に(c1-drift-canonical-renderer — 値の複製でなく定義の一本化)。追加は view フィールド導出限定・close 順序/状態機械/FR-4c 不変(留保転記どおり)。
7. FR-4b' の Red(t374 integration: currentStatus expected Completed received Running — expectedBody 側 assert は通過しており失敗が currentStatus 面に限局する裏付け付き)→ Green。ネガティブコントロール(実 drift は依然 diverged)を同時固定。
8. 2回目の allowlist 機械 remap+全件直読照合 → deslop → 全検証再実行 → コミット → push → PR #1823 → 収束ループ(Bugbot スレッド解決・CLEAN・全 green)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T07:21:51Z
- **Iteration:** 1
- **Scope decision:** none

PR #1823 は FR-4a〜4d+FR-4b'(裁定 E-OBB4-CG1)に file:line レベルで一致 — 単一定義化・t361 不変・ネガティブコントロール実効・allowlist 個別行写像を確認。

### Findings

- None
