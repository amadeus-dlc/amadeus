# Team Allocation — 260816-open-bug-batch-7

## 割当

team-formation(1.5)は self-fix スコープで SKIP のため、**全 Bolt を AI(amadeus-developer-agent 系統)が実行**する。実装の実働は swarm/バッチ fan-out 時に `amadeus-builder-agent`(unit builder)が担い、conductor が fan-out・リトライ・収束確認を所有する(SKILL の invoke-swarm 契約)。

| Bolt | Unit | 実行主体 | レビュー |
|---|---|---|---|
| 1 | nsd-provenance | amadeus-builder-agent(worktree 分離) | §12a reviewer + PR 収束(リモート CI 正) |
| 2 | pi-distribution | 同上 | 同上 |
| 3 | sensor-docs-sync | 同上 | 同上 |

## 人間の関与点

- 各 Bolt PR のマージ: 常任マージ承認(team.md — 必須 CI green ∧ 収束判定 converged:true の実測時のみ)に従う。条件を満たさない場合はユーザーへ諮る
- fail-closed の裁定(梯子が human-required を返した場合)のみ人間へ回送(full autonomy の契約)
