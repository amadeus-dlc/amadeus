# Scalability Design — election-transport(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## ステートレス設計

- 両輸送実装ともモジュールレベル可変状態なし(business-logic-model.md — notify は入力→DeliveryOutcome の関数)。並行配信制御は不要(scalability-requirements.md 同時実行節 — 記帳は U2 経由で単一書込主体に合流)
- 配信対象は選挙1件の投票者集合(performance-requirements.md の 14 名実測前提)— バッチ・キュー機構なし

## 拡張面

- 第3輸送の追加は VoterTransport port への実装追加のみ(scalability-requirements.md — DeliveryOutcome 判別ユニオンが戻り実体を吸収)。既存2実装・呼び出し元 U5 に影響しない(security-requirements.md の型境界・reliability-requirements.md のエラーバリアント表へ行追加で閉じる)。ランタイムは tech-stack-decisions.md のまま
