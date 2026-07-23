# Reliability Requirements — clean-env-e2e

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 信頼性要件

- 決定性: business-logic-model の fake seam(観測ログの行単位機械 parse)+business-rules BR-3(期待 verb 列の定義1箇所集約)により flaky 要因(実バイナリ・ネットワーク・時刻依存)を排除
- teardown 保証: CleanEnv は afterEach で必ず破棄(business-rules ドメイン不変条件)— テスト間の状態持ち越しゼロ
- 到達確認: requirements FR-6c のとおりエラー経路の実到達を lcov DA(TS 面)+stderr 文言弁別(bash 面)で検証(偽経路 green の排除 — error-path-reach-lcov)
- technology-stack の既存 serial 実行規約(直列実行)が並行競合を構造回避

## 検証

- business-rules BR-6 の DA 実測+文言 assert(検証割付どおり)
