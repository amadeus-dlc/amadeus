# Team Allocation: Solo Standing Grant

## 計画入力

割当は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` に基づく。optional inputの`stories.md`と`mockups.md`は本scopeでは存在しない。team-formation成果物も存在しないため、stage既定に従い全Boltをamadeus-developer-agentが実行し、stageごとのarchitect/quality reviewerが契約を検証する。

## Bolt-to-Mob Assignment

| Bolt | Units | Primary executor | Required review focus |
|---|---|---|---|
| safe-solo-grant-skeleton | grant-authorization-domain, solo-gate-transaction | amadeus-developer-agent | domain boundary、TOCTOU、audit-first atomicity、typed fallback |
| harness-compatibility-and-convergence | harness-contract-and-regression | amadeus-developer-agent | all-harness semantics、team regression、test/drift convergence |

## Working Agreement

- 既存branch `codex/solo-standing-grants`上で作業し、`main`や他worktreeの変更を巻き戻さない。
- per-unit Construction stageはengineの指示単位で成果物を作る。
- code generationでnative subagent worktreeが指定された場合、各workerは割当worktree内だけを変更する。
- generated harness artifactsはcanonical sourceから再生成し、直接修正しない。
- Bolt 1のWalking Skeleton gateはhuman-onlyとし、Bolt 2の通常gateだけが有効grantの認可候補になり得る。

## Capacity and Handoffs

外部team hand-offはない。Bolt 1完了時にdirective/wire/audit contractと関連testsをBolt 2へ引き渡す。Bolt 2はそのcontractを変更せず、projection、回帰、全体収束を担当する。
