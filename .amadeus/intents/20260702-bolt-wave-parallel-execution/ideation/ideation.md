# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | wave の導出材料は既存成果物に揃っている。`bolts.md` は `依存` 列と `依存関係` 表を必須構造として持ち、依存グラフを機械的に読める。#334 の B002 と B003 が「B001 の後に並行実行可能だった」実例があり、wave の概念は既存の依存表から導出できる。 |
| 運用 | feasible | 並行実行の運用前提（worktree 分離、同一 worktree での直列化、承認キューの確認、共有成果物の統合手順）は並行運用ポリシーとして policy 化済みであり、wave 実行契約はこれらを参照して定義できる。 |
| セキュリティ | feasible | skill 文書の契約定義が中心であり、秘密情報や認証情報を扱わない。 |
| 依存 | feasible | 待機条件だった他 3 候補（#334、#350、#351）はすべて cycle 完了済みである。ゲート契約（Task Generation Gate）と `state.json` の構造は確定済みで、wave 実行は既存契約の上に定義できる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | wave 導出の契約、定義先の skill、まとめ承認の扱いを判断する。wave 単位の Task Generation 承認を行うゲート審査官でもある。 |
| Agent | 実行者 | bolts の依存グラフから wave を導出し、wave 単位で並行実行、統合、検証を進める。 |
| Reviewer | 参照者 | PR と Intent 成果物から、wave 実行の判断が契約と整合しているか確認する。 |
| Validator | 構造検出者 | bolts.md の依存表と state.json の構造検査を提供する。wave 契約固有の検査追加の要否は Inception 以降で判断する。 |
| Evaluator | 品質評価者 | wave 導出の決定論性（同じ依存表から同じ wave）を確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | 依存を持つ 4 つの Bolt（B001 ← B002、B003、B002+B003 ← B004）から wave を導出し、wave 1（B001）→ wave 2（B002 と B003 を worktree 分離で並行）→ 統合と検証 → wave 3（B004）の順で実行する流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- wave 導出の契約（依存表からの導出規則、wave の表現方法）は Inception で判断する。
- 定義先の Construction skill（公開入口か内部 skill か）は Inception で判断する。
- wave ごとの統合と検証の手順（worktree 分離での実行、統合の順序）は Inception で判断する。
- Task Generation Gate と wave 実行の関係（wave 単位のまとめ承認の扱い）は Inception で判断する。
- 並行運用ポリシーとの参照関係は Inception で判断する。

## 学習候補

- wave 実行の運用実績が出たら、並行運用ポリシーの判断基準（並行させる単位）へ Intent 内並行の観点を追記する候補になる。
- wave 導出を機械化する場合（依存グラフの解析スクリプト）、`GateQueueList.ts` と同じ validator 同梱方式が再利用できる可能性がある。
