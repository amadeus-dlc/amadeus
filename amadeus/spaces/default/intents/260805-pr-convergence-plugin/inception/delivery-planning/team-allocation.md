# Team Allocation: PR 収束 opt-in プラグイン

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map

## 割当

team-formation(1.5)は本 scope(self-feature)で SKIP のため、全 Bolt を amadeus-developer-agent(AI)が実行する。実行形態はソロモード+自律モード full(intent-grant-fd0ed2b79c48204d342920ce3b4b67f0):

| Bolt | 実装 | レビュー | ゲート |
|---|---|---|---|
| Bolt 1 seam-bridge | amadeus-developer-agent(worktree 隔離 subagent — solo-bolt-worktree-required) | §12a reviewer(独立 subagent) | walking-skeleton gate(intent-autonomy full の interaction kind 内 — engine の裁定に従う) |
| Bolt 2 convergence-toolchain | 同上 | 同上 | stage-gate(auto-approve) |
| Bolt 3 plugin-packaging-e2e | 同上 | 同上 | stage-gate(auto-approve) |

- PR マージは全 Bolt とも人間承認(no-AI-merge — C-1。autonomy full の prohibitedEffects: irreversible により auto 化されない)
- 並行度: unit-of-work-dependency の U1∥U2 非交差はあるが、walking-skeleton 単独ゲート(org.md)により Bolt 1 を先行させる — Bolt 2 以降の実行様式(自律継続かゲートか)は Bolt 1 出荷後のラダープロンプトで確定
- 検証コマンドの単独所有: coverage 計測は branch ごとに単独所有者(c1-coverage-single-owner)

## エスカレーション経路

- 設計逸脱・ブロッカーはソロ選挙(solo-election.trigger.mode=auto の3類型)、仕様変更・不可逆操作はユーザー専権(エスカレーション正準リスト)
- FR-2a 不成立(Bolt 1 の確信仮説の反証)は実装前停止して人間へ escalate(requirements A-2)
