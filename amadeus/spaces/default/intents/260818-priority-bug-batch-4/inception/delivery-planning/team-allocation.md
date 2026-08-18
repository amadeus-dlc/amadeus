# Team Allocation

Intent: 260818-priority-bug-batch-4(team-formation は SKIP — stage 契約の既定に従い全 Bolt を AI が実行)

上流: `bolt-plan.md`(Bolt 構成)。

| Bolt | Unit | 実行主体 | 備考 |
|---|---|---|---|
| Bolt 1 | `issue-2837-invoke-swarm-context` | amadeus-developer-agent(builder subagent へ委譲可、engine/state 変更操作は conductor 専権) | §12a reviewer は宣言 reviewer(per-unit) |
| Bolt 2 | `issue-3106-per-unit-outcome` | amadeus-developer-agent(同上) | 同上 |

ソロモード(team.md § Operating Modes)につき Program Board は非適用。conductor(本セッション)が Bolt 逐次実行・レビュー起動・ゲート・配送を所有し、判断は full グラント梯子(fail-closed は人間へ)。
