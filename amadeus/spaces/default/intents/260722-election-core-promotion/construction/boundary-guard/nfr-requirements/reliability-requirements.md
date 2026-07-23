# Reliability Requirements — boundary-guard

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 信頼性要件

- 偽赤ゼロ(business-rules BR-6 corpus sweep)と偽緑防止(BR-4 fixture 落ちる実証)の両側実測が信頼性要件のすべて(requirements FR-5b/5c)
- 検査は決定的: business-logic-model の設計どおり判定は純関数(FS・プロセス・時刻・乱数に触れない — flaky 要因なし)で、実 FS 収集は integration 層1箇所に隔離(fs-tests-integration-first)。実行環境は technology-stack の既存 Bun ランナー(smoke/unit/integration/e2e 4層)にそのまま同乗し、新規ランナー由来の信頼性リスクを持ち込まない

## 検証

- fixture 赤の実測記録+sweep 偽赤 0(business-rules の検証割付どおり)
