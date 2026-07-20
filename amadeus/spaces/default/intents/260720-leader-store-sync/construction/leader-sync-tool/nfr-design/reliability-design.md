# Reliability Design — leader-sync-tool(U1)

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model — R-1〜R-3(reliability-requirements.md)の実装形。

## 設計

- RD-1: 全 fault 経路は SyncError 判別ユニオンへ正規化し stderr 1行+exit 1(R-1 — business-logic-model.md のエラー経路と 1:1。判別は switch 完全性でコンパイル時担保)。
- RD-2: create は「ブランチ作成→copy→restore→判定→commit→PR」の各段で失敗時 abort+ローカルブランチ破棄手順を stderr 案内(R-2 冪等 — main/store 非汚染)。
- RD-3: in-process 駆動(spawn 盲点回避)— 判定純関数と handler(main argv 化 export)を分離し、テスト層は integration(実 FS)+unit(純関数)の2層(E-SMF-ND の2軸独立: in-process=計測軸 / 層=配置軸)。

## 検証接続

- RD-1 の各 fault 経路は integration テストの注入(clone-id 欠落・fake runner 失敗)で全数駆動、RD-2 は再実行テスト、RD-3 は lcov の in-process DA 確認(local-lcov-pre-push)。
