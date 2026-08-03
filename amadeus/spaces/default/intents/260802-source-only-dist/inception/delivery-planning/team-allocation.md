# Team Allocation — 260802-source-only-dist

上流入力(consumes 全数): unit-of-work(Unit 規模 — 割当の分量根拠)、unit-of-work-dependency(並行可能性)、bolt-plan.md(Bolt 編成)、requirements(承認境界 — 人間の役割)、unit-of-work-story-map / components(参照)。

> 注記: team-formation ステージは SKIP のため、存在しない named mob は捏造しない(approval-handoff:c3)。本 intent は**ソロモード**(AMADEUS_OPERATING_MODE=team 未設定)で、役割は帽子(責務)として conductor が工程ごとに担い、実装・レビューはサブエージェントへ分離する。

## 役割割当(ソロモード)

| 役割 | 担い手 | 責務 |
|---|---|---|
| conductor | 本セッション(live /amadeus) | engine ループ駆動、Bolt ディスパッチ、ゲート提示、§13、PR 収束・承認伺い |
| builder | Bolt ごとの worktree 分離サブエージェント(swarm 経路は referee = amadeus-swarm.ts) | Unit 実装(TDD)。engine 操作禁止・逸脱は実装前停止を毎回プロンプトに明記 |
| reviewer | §12a reviewer(per-unit、reviewer-runtime 経由)+ PR レビュー | 自己実装の自己レビュー禁止を builder/reviewer の分離で担保 |
| 人間(ユーザー) | 全ステージゲート、Bolt 1 / Bolt 7 ゲート、全 PR マージ、ノルム PR 承認、リリース実行 | 不可逆・外部境界の承認(P4) |

## 並行度

- 同時アクティブ builder 上限 4(parallel-bolts)。Bolt 2/3/4/6 が並行帯
- レートリミット等の資源制約下では手空きを許容(rate-limit-idle-allowance)— 稼働率埋めのディスパッチはしない

## スケジュール

期日なし(scope-definition Q1 裁定)。マイルストーンは Bolt 完了(= PR マージ)で刻む。Construction の autonomy mode は Bolt 1 出荷後のラダープロンプトで人間が選択し、amadeus-state.md に永続化される(org.md)。
