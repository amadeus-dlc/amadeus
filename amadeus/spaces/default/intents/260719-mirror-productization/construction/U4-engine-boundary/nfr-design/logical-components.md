# Logical Components — U4-engine-boundary

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## engine内の論理構成

| 論理部品 | 責務 | 障害境界 |
|---|---|---|
| PhaseBoundaryGuard | canonical境界と進行位置を判定 | 非境界`next`から追加I/Oを隔離 |
| MirrorBoundaryReceipt | stateの`Mirror Boundary Receipts`をcanonical phase slug→auto-sync専用`pending`または`completed`として原子更新 | askとauto-syncの再開状態を混同しない |
| U3 Config Resolver | 3層設定を`valid | invalid`へ解決 | invalidをengine errorで停止 |
| MirrorIssueReader | 既存state文字列からIssue有無を取得 | 新規ファイル走査なし |
| MirrorBoundaryDecision | `ask | auto-sync`を純関数導出 | 将来キー・verbから分岐を隔離 |
| AskDirectiveFactory | 人間確認directiveを生成 | create/closeを自動実行しない |
| PendingBoundaryGuard | `next`共通入口でcanonical順の最古pendingを1件だけ再評価 | 単一directive契約を維持し残件を次回へ送る |
| SyncPrintFactory | 固定syncコマンドのrun-then-continueを生成 | 自動副作用を冪等syncだけに限定 |

## 依存方向

orchestrator境界分岐はGuard→Receipt/U3 Resolver/IssueReader→Decision→Directive Factoryの一方向とする。U3やmirrorツールからengineへの逆依存を作らず、mirror実行はprint directiveを受けたconductor境界に残す。

## Blast radius

設定invalidは当該`next`を停止し、auto-sync失敗はmirror機能だけを失敗させる。いずれも既存workflow stateの完了済みstageを変更しない。Receipt completed前の障害はpendingを維持し、冪等syncの再発行を可能にする。
