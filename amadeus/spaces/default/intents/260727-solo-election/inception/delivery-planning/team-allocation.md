# Team Allocation — solo-election

上流入力(consumes 全数): unit-of-work.md(U1/U2)、unit-of-work-dependency.md(直列制約 = 並行割当をしない根拠)、unit-of-work-story-map.md(役割とジャーニー段の対応)、bolt-plan.md(Bolt 列)、requirements.md(FR-04 の main agent 不投票 = 役割境界)、components.md(builder が触る変更対象の範囲)、team-practices.md(ソロモード実践 — named mob 不在の明文根拠)。

## 割当(ソロモード)

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor / builder | 本セッションの main agent(必要に応じ builder subagent へ worktree 分離 dispatch) | Bolt 単位。逸脱は実装前停止 |
| reviewer | §12a 宣言 reviewer subagent(code-generation は amadeus-reviewer-runtime 経由) | 自己実装の自己レビュー禁止は subagent 分離で担保 |
| 承認 | ユーザー | ゲート・PR マージ(no-AI-merge) |

named mob は存在しない(ソロ運用 — 捏造しない)。Construction schedule は Bolt 2本の直列(U1→U2 依存)以上に細分しない。

## 割当の制約

- ソロモードの品質契約(実測証拠・逸脱停止・ゲート)は両モード共通(team.md Operating Modes)。builder subagent への dispatch 時は state 変更コマンド禁止・成果物外書込禁止を毎回明記する。
