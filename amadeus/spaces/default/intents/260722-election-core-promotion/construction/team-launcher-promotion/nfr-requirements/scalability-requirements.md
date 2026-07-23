# Scalability Requirements — team-launcher-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## スケーラビリティ要件

- チームサイズ(-2/-4/-6)・並行 instance は Should 面の既存機能で、本 Unit は搬送のみ(requirements FR-3e — 新規のスケール目標を設けない)。business-rules BR-4 の env 契約不変により既存のサイズ選択機構がそのまま維持される
- business-logic-model の移動+パス修正は規模非依存(ファイル3本の固定集合)。technology-stack の配布投影(全6 dist)は既存 coreDirs 機構のスケール特性に従う

## 検証

- Should 面の既存テスト green 維持(business-rules BR-4)が実質検証 — 新規のスケール検証は U4 スコープ外として設けない
