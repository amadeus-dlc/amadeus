# インテント：Bolt の依存 wave 並行実行

## 概要

bolts の依存グラフに基づき、依存のない Bolt を wave 単位で並行実行する契約を Construction skill に定義する。

## 依存

| 依存 | 理由 |
|---|---|
| 20260702-parallel-operation-policy | wave 実行契約は、この Intent が確定した並行運用の判断基準（worktree 分離、同一 worktree での直列化）を前提にするため。 |
| 20260702-shared-index-generation | 共有インデックスの追記衝突の解消が、並行実行の構造前提であるため。 |
| 20260702-gate-queue-visualization | wave 内の複数 Bolt の Task Generation 承認は、承認待ちキューの確認とまとめ承認の運用を前提にするため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Construction skill に wave 単位の並行実行契約を追加する技術目標である。 |
| scope | feature | Bolt の直列実行前提に、依存 wave による並行実行という新しい契約を追加する Intent である。 |
| labels | bolt-wave, parallel-execution, construction, skill, self-development | Bolt の wave 並行、並行実行、Construction 契約、skill 変更、自己開発を表す。 |

## 目的

bolts の依存グラフに基づき、依存のない Bolt を wave 単位で並行実行し、wave ごとに統合と検証を行う契約を Construction skill から読めるようにして、Intent 内の並行加速を可能にする。

この Intent は [Issue #352](https://github.com/amadeus-dlc/amadeus/issues/352) と Discovery [20260702-parallel-execution](../discoveries/20260702-parallel-execution.md) の候補「Bolt の依存 wave 並行実行」を根拠にする。

Construction は現在 Bolt を直列に実行する前提であり、依存のない Bolt 同士（Issue #334 の B002 と B003 など）も直列で実行している。
#334 の実装では、同一 worktree でのファイル競合と検証コマンドの競合を避けるために意図的に直列化しており、並行実行には worktree 分離を含む実行契約が必要という観察が得られている。

## 成功条件

- bolts の依存グラフから wave（並行実行できる Bolt の集合）を導出する契約が Construction skill から読める。
- wave 単位の並行実行、統合、検証の手順が Construction skill から読める。
- 実行契約が並行運用ポリシー（worktree 分離、同一 worktree での直列化）と整合する。

## 範囲

含めるもの:

- bolts の依存グラフから wave を導出する契約。
- wave 単位の並行実行、統合、検証の手順の Construction skill への定義。
- 並行運用ポリシーとの整合の確認。

含めないもの:

- 複数人での Bolt 分担。
- リモート実行基盤。
- 複数人チームでの並行と、複数 workspace での組織利用。

## 現在の phase

Ideation を開始する。

Inception では、wave 導出の契約、定義先の Construction skill（公開入口と内部 skill のどこに置くか）、wave ごとの統合と検証の手順、並行運用ポリシーとの参照関係を具体化する。
