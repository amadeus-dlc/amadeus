# Reliability Design — U4-engine-boundary

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## RD-U4-1: directive契約の非破壊(RL-U4-1)

phase境界で追加する結果も既存の単一directive JSONをstdoutへ出す。診断advisoryはstderrへ限定し、stdoutへの前置き・追記を禁止する。既存`next`消費者のgrep棚卸しとt135系テストを回帰条件とする。

## RD-U4-2: fail-safeな冪等記録(RL-U4-2)

stateの`Mirror Boundary Receipts`を単一正本とし、canonical phase slugをキー、`pending | completed`を値とする。pendingはauto-sync開始済みだけを表す。ask経路は「実行しない」回答時、または人間が選択したverbの成功後に直接completedへ遷移し、pendingを使わない。更新はstate既存の原子的な全体更新経路で行う。未知キー・未知状態・構文破損はerrorで停止し、completedへ推測しない。

## RD-U4-3: mirror失敗の隔離(RL-U4-3)

auto-syncの子コマンド失敗はexit codeとstderrをloudに表示するが、workflow stageの完了状態を巻き戻さない。pending Receiptを維持し、後続`next`の共通入口がphase進行位置に関係なく再発行する。複数pendingはcanonical phase順に1回1件だけ処理し、成功した対象だけcompletedへする。syncは期待Issue本文への決定的setで、コメント等の追記副作用を持たず、同一境界IDの重複実行を冪等とする。失敗をcompletedとして記録する経路は禁止する。

## 障害注入

integrationテストで、sync失敗→次回nextで再発行→成功、sync成功→Receipt更新失敗→同一内容の冪等再実行→completed、破損Receipt→error停止を検証する。
複数pendingではcanonical順、単一directive、失敗時全状態不変、成功時対象1件だけcompleted、残件の次回処理を検証する。

## RD-U4-4: 同期・同一プロセス設計(RL-U4-4)

engine内の判断はBun同一プロセスの同期分岐とU3 importだけで完結する。新しい非同期worker、常駐プロセス、リトライループを導入しない。
