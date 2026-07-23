# Security Requirements — team-launcher-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## セキュリティ要件

- prerequisite 検査(business-logic-model の require_prerequisites)は入力検証の強化方向のみ: PATH 探索と uname 判定で、外部入力のパース・実行はしない。エラー文言(business-rules BR-2 の4要素)に秘密情報を含めない
- doctor advisory(BR-5)は読取専用の PATH 検出のみ — requirements FR-4a の「exit code 不影響」契約により認可バイパス面を作らない
- technology-stack のとおり herdr/agmsg のコードは同梱しない(requirements FR-8c/T-1)— 供給網面の新設なし

## 検証

- 追加検査なし(N/A 根拠: 攻撃面の新設なし — build-and-test:c3 の比例選定。既存必須 scan は維持)
