# Reliability Requirements — U4-engine-boundary

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## RL-U4-1: 既存 next 消費者の非破壊

stdout=directive JSON / stderr=advisory の契約維持(BR-U4-4/C-08)。実装前 consumer grep 棚卸し+t135 等の既存テスト green を受け入れ条件に固定(FR-5 受け入れ基準)。

## RL-U4-2: ask 回答の永続

ask への回答・auto-sync の実行痕跡は canonical phase slug ごとの `pending | completed` Receiptとして決定的記録(BR-U4-5 の冪等入力)。記録失敗時はpending/未発火側へ倒す。重複askに加え、auto-syncは期待本文への決定的setとして同一境界IDで冪等でなければならない(無音スキップは禁止)。

## RL-U4-3: mirror ツール失敗の非伝播

auto-sync print 指令の実行(mirror sync)が失敗しても workflow は停止しない(C-01 — 当該機能のみ不可)。失敗は conductor に見える形(コマンドの exit code)で顕在化し、pending Receiptを後続`next`共通入口が再評価する。

## RL-U4-4: ランタイム前提(technology-stack.md 参照)

technology-stack.md の Bun 直接実行前提 — engine への追加は同一プロセス内の分岐のみで、新規プロセス・非同期機構を導入しない。
