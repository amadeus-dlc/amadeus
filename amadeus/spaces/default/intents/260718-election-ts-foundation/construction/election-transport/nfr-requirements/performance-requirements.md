# Performance Requirements — election-transport(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 性能特性と目標

U4 は投票者への配信抽象(business-logic-model.md — VoterTransport port の agmsg/subagent 2実装)。配信は投票者数(現登録 14 名 — stage diary Interpretations の team.sh 実測記録)の逐次呼び出しで、専用の性能 SLO を新設しない(N/A 根拠は reliability-requirements.md の「常駐プロセスを持たない送達アダプタ層」判定への相互参照 — reviewer 指摘により observability-setup:c3 の逆向き引用を差し替え)。

- agmsg 送信は外部プロセス(send.sh)の spawn 1回/voter — 並列化・バッチ化の最適化を要求しない(数十件規模)。数値目標は置かない(未実測の数値を SLO 化しない)
- subagent 輸送は DeliveryDirective の生成のみ(business-logic-model.md — Q1=B: 実 spawn は U5/conductor 側)で、U4 内に長時間処理を持たない

## 測定と検証

- 輸送別の挙動検証は fake transport をテスト側に置く port 注入で行い(business-rules.md — 本番コードにテスト分岐なし)、実 agmsg spawn を要するケースのみ integration 層(requirements.md NFR-2 の fs-tests-integration-first を spawn 系テストへ類推適用 — cid 原義は FS 限定のため適用注記を明示)
- ランタイムは既存スタック(technology-stack.md の Bun/TS 実測)を踏襲する
