# Team Allocation — Codex Duration Bounds

## Upstream Inputs

本配置は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を入力とする。Team FormationはSKIP済みのため、stage定義の既定に従い、全Boltのamadeus-developer-agentを実装driverとする。

## Operating Model

- 実行形態: ソロモードのAI mob。Boltごとに分離worktreeを使う。
- 実装driver: `amadeus-developer-agent`。設計工程は各stageのlead/support persona、品質工程は `amadeus-quality-agent` の契約に従う。
- conductor: engine指令ループ、状態、センサー、worktree、受入証跡を所有。
- 人間: walking-skeleton gate、autonomy ladder、各GitHub review/merge、仕様変更を所有。AIはmerge/release/publishを自発実行しない。
- 実装は直列。技術DAG上の並列可能集合があっても、本delivery計画では前段のmerge/rebase/conformance後に次Boltを開始する。

## Bolt Assignment

| Bolt | Driver | Design/quality perspectives | Human owner | Handoff target |
|---|---|---|---|---|
| `execution-observability-baseline` | amadeus-developer-agent | architect + quality | ユーザー/reviewer | `convergence-budgets` |
| `convergence-budgets` | amadeus-developer-agent | architect + quality | ユーザー/reviewer | `interaction-budgets` |
| `interaction-budgets` | amadeus-developer-agent | architect + quality | ユーザー/reviewer | `bounded-unit-pool` |
| `bounded-unit-pool` | amadeus-developer-agent | architect + quality | ユーザー/reviewer | 統合dogfood / Intent closeout |

## Responsibility Matrix

| Activity | Conductor | Developer | Architect | Quality | Human |
|---|---|---|---|---|---|
| stage・Bolt・label・worktree routing | A/R | I | I | I | I |
| functional/NFR design | A | C | R | C | gate |
| TDD implementation | A | R | C | C | I |
| deterministic/package/promote verification | A | R | C | R | I |
| change review readiness | A | R | C | R | approve/request changes |
| merge | I | I | I | I | A/R |
| release/publish | N/A | N/A | N/A | N/A | 本Intent外 |

`A`=Accountable、`R`=Responsible、`C`=Consulted、`I`=Informed。同一エージェントが異なるstageで複数personaを担う場合も、builder/reviewer境界とengine所有は混ぜない。

## Capacity and Escalation

- 1 Boltずつ開始し、coverageや生成物の書き手を単独所有にする。
- recoverableな既存retry経路は共通budget内で自動回復。仕様変更、不可逆操作、split election、unknown/canonical failureは人間へエスカレートする。
- 各Boltの失敗時はengineのhalt-and-ask/election指令に従い、成功済みworktreeと証跡を保存する。
