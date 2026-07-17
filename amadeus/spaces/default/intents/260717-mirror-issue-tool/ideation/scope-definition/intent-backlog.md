# Intent Backlog(proto-Units)— amadeus-mirror ツール

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## Proto-Units(実装候補の分割素案)

| # | Proto-Unit | 内容 | 依存 |
|---|---|---|---|
| P1 | state-reader | 決定的ソース(summary --json / intents.json / amadeus-state.md)から状態スナップショットを組み立てる純関数層。park 状態の正フィールド確定(raid-log R1)を含む | なし |
| P2 | mirror-template | 定型3要素の本文テンプレート生成(P1 のスナップショットを入力) | P1 |
| P3 | create コマンド | gh issue create + intent-mirror ラベル + Issue 番号の intent 側記録 | P2 |
| P4 | sync コマンド | gh issue edit による状態セクション書き換え(冪等) | P2, P3 |
| P5 | close コマンド | intent 完了の機械検査 → gh issue close(不成立 exit 1) | P1, P3 |

## Notes

- 規模感: 全体で小さな単一 CLI(数百行以下想定)。unit 分割は units-generation 段で確定し、概算行数レンジを併記する(N1 準拠)
- 本 intent は ideation で park するため、backlog は inception 再開時の入力
