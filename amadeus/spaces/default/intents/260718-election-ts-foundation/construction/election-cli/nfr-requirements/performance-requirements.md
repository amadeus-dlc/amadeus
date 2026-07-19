# Performance Requirements — election-cli(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 性能特性と目標

U5 は `next`/`report`+verb 群の CLI 指令ループ(business-logic-model.md の7状態指令表)。各呼び出しは選挙1件の状態読取+指令生成+遷移コミットで、入力規模は投票者数(現登録 14 名 — stage diary Interpretations の team.sh 実測記録)に閉じる。専用の性能 SLO を新設しない(N/A 根拠は reliability-requirements.md の常駐プロセス非保有判定への相互参照)。

- 指令生成は現状態からの決定表引き O(1)+票集合走査 O(n)(business-logic-model.md — 各状態から一意の指令)。数値目標は置かない(未実測の数値を SLO 化しない)
- 起動は Bun 直接実行の単発 CLI(technology-stack.md の既存スタック実測)で、既存 amadeus-*.ts ツール群と同一の runtime 特性。追加最適化を要求しない

## 測定と検証

- 停止ガードは既存テストランナーのタイムアウトのみ。機械実行器 e2e(ADR-6 CI 層)は決定的テストとして **e2e 層**(unit-of-work.md U5 行の宣言に整合 — reviewer 指摘の表記ゆれ是正)で実行され、専用ベンチマークは追加しない(規模正当化)
