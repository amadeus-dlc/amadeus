# Business Logic Model

## 目的

Construction の Bolt 実行を、依存グラフに基づく wave 単位の並行実行として進められるようにする。

## 対象 Unit

U001 Bolt wave 実行契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | `bolts.md` の `依存関係` 表から、依存がすべて前の wave までに完了する Bolt の集合を wave 1 から順に導出する。依存に循環がある場合は導出せず、`bolts.md` の依存表の補修へ戻す。 | 対象 Intent の `bolts.md` | wave 分割 | R001, UC001 |
| BL002 | 導出した wave 分割（wave 番号、Bolt、並行可否）を実行計画として人間に提示する。 | wave 分割 | 実行計画の提示 | R001, UC001 |
| BL003 | 同じ wave 内の複数 Bolt の Bolt 実行準備をまとめて行い、まとめて `ready_for_approval` にして停止する。承認は Bolt ごとの Task Generation Gate 契約のまま、まとめて処理できる。 | wave 分割、承認待ちキュー | wave 単位の承認済み Task | R003, UC002 |
| BL004 | 承認済みの wave 内の Bolt を、Bolt ごとに分離した worktree で並行実行する。同一 worktree 内の Bolt と検証は直列のままにする。 | 承認済みの wave | 並行実行された Bolt 成果物 | R002, UC003 |
| BL005 | wave 内の全 Bolt の実装と検証の完了後に並行 branch を統合し、共有成果物を整合させ、標準検証を通してから次の wave の Bolt 実行準備へ進む。 | wave の完了 | 統合済みの作業ツリー | R002, UC003 |
| BL006 | wave 並行の条件（同じ wave に互いに依存しない Bolt が複数入り、worktree 分離で実行できる）を満たさない場合は、従来どおり Bolt を 1 件ずつ直列に実行する。 | wave 分割、実行環境 | 直列の実行計画 | R004, UC004 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| 対象 Intent の `bolts.md` | wave 導出の唯一の情報源（`依存` 列と `依存関係` 表）。 | R001 |
| `state.json` の `targetBolts` と `taskGeneration` | Bolt 単位の状態。wave は新しい状態フィールドを追加せず、既存の Bolt 単位の状態から導出する。 | R004 |
| 対象 workspace の steering policy | 並行運用の判断基準（worktree 分離、統合手順）がある場合の参照先。 | R002 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| wave 分割の実行計画 | wave 番号、Bolt、並行可否の提示。 | Maintainer、Agent |
| wave 単位の Bolt 成果物 | tasks、notes、実装、test-results。 | Reviewer、validator |
| 統合済みの作業ツリー | wave 完了時の統合と標準検証を経た状態。 | 次の wave の実行準備 |

## 未確認事項

なし。
