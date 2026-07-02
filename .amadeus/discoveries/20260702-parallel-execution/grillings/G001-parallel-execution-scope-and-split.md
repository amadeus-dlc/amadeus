# G001: 並行実行の範囲と Intent 分割方針

## 概要

- 状態: completed
- 対象: Discovery
- 反映先: [20260702-parallel-execution.md](../20260702-parallel-execution.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 並行実行の対象範囲を「1 人の人間 + 複数エージェント（複数 worktree）」に限定する。複数人チームでの並行と複数 workspace での組織利用は除外し、後続テーマにする。 | active | [20260702-parallel-execution.md](../20260702-parallel-execution.md) | なし |
| GD002 | Intent 候補を、共有インデックスの生成物化、ゲート待ちキューの可視化、並行運用ポリシー、Bolt の依存 wave 並行実行の 4 件に分け、multi_intent として整理する。 | active | [20260702-parallel-execution.md](../20260702-parallel-execution.md) | なし |
| GD003 | 最初に Ideation へ進める recommended 候補を「共有インデックスの生成物化」にする。依存順は、生成物化 → ゲート待ちキューの可視化と並行運用ポリシー → Bolt の依存 wave 並行実行とする。 | active | [20260702-parallel-execution.md](../20260702-parallel-execution.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: 並行実行の対象範囲を「1 人の人間 + 複数エージェント（複数 worktree）」に限定するか、複数人チームや複数 workspace の組織利用まで含めるか。
- 確認が必要な理由: Intent 候補の切り方と成功状態の定義が、単独人間前提か複数人前提かで大きく変わるため、最初に確定する必要がある。
- 推奨回答: 1 人 + 複数エージェントに限定する。
- 推奨理由: 現在の自己開発体制は 1 人であり、phase-gate-approval-contract のゲート契約も単独承認者を前提にしている。複数人対応は承認者モデル自体の再設計が必要で、粒度が Intent 化に適したサイズを超える。
- ユーザー回答: 1 人 + 複数エージェントに限定する。

### Q002

- 確定判断: GD002
- 確認したいこと: Intent 候補を、共有インデックスの生成物化、ゲート待ちキューの可視化、並行運用ポリシー、Bolt の依存 wave 並行実行の 4 件に分けて multi_intent とするか、より小さく分けるか、単一の大きい Intent にまとめるか。
- 確認が必要な理由: 判定（single_intent か multi_intent か）と `discoveries.md` への記録内容が、この分割で決まる。
- 推奨回答: 4 候補で multi_intent とする。
- 推奨理由: 各候補は変更対象領域が異なり（生成物化は契約と validator、ゲート待ち可視化は skill、Bolt 並行は Construction 契約、並行運用は steering policy）、独立に検証できる。単一 Intent にすると Inception の Unit 分割が肥大化し、より小さい分割は Intent と PR が 1:1 になり管理コストが上がる。
- ユーザー回答: 4 候補で multi_intent とする。

### Q003

- 確定判断: GD003
- 確認したいこと: 4 候補のうち、最初に Ideation へ進める recommended 候補をどれにするか。
- 確認が必要な理由: multi_intent 判定では recommended を 1 件だけ選ぶことが Gate 条件である。
- 推奨回答: 「共有インデックスの生成物化」を recommended にする。
- 推奨理由: すべての Intent が `intents.md` を、すべての Discovery が `discoveries.md` を更新するため、この追記衝突の除去が水平並行全体の前提になる。候補の中で最小サイズであり、再生成の決定論性を validator と eval で検証しやすい。
- ユーザー回答: 「共有インデックスの生成物化」を recommended にする。
