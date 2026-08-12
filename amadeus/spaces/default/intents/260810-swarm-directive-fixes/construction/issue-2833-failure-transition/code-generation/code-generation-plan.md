# Code Generation Plan — issue-2833-failure-transition

## 方針

U1は、swarm/non-swarmのRetry・Skip・Abort裁定を既存監査とUnit pool projectionへ接続し、Abort後の同一Unit再dispatchを止める。新規workflow state、Stop hook変更、solo Unit Pool移植は行わない。相関キー（intent・stage・unit・attempt・batch）を欠く入力は推定せずfail-closedとする。

## 実装チェックリスト

- [x] 既存 `BOLT_FAILED` / `SWARM_BATON_RETURNED` / terminal outcomeを投影する読取経路を実装する。
- [x] swarm/non-swarmのRetry・Skip・AbortをUnit pool selectorとcursorへ反映する。
- [x] Abort後は同一 `invoke-swarm` / `run-stage` を再提示せず、engine-owned `parked`へ到達する。
- [x] solo相関に明示的なstage・attempt・batch-idを保持し、`--batch` と `--batch-id` の意味を混同しない。
- [x] 欠落相関、未知Outcome、空Stage、不正監査行、監査発行失敗を診断付きfail-closedにする。
- [x] TDDで失敗遷移、report→resolve-failure、Abort再裁定拒否、監査相関を検証する。
- [x] PR #2864を作成し、CI・coverage・complexity・no-silent-drop・レビュー収束を完了する。

## 完了証拠

要件FR-OUT-1〜10、BR-OUT-1〜11、autonomous Abort→parked、Stop hook終端契約を、実装・focused test・PR CIで検証した。U2のconsume fan-out実装は変更せず、共有監査とengine selectorの境界を維持した。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T22:27:20Z
- **Iteration:** 1
- **Scope decision:** none

実装計画・コード要約・PR収束記録は要件とステージ契約を満たしており、未解決のBLOCKERはありません。

### Findings

- None
