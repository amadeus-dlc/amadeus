# Security Requirements — U4-engine-boundary

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SR-U4-1: 実行面の限定

engine が発行する print 指令は sync のみを名指し(C-05/BR-U4-2)— create/close を print で自動実行する経路を作らない(auto の副作用境界 = G-7 の engine 面)。

## SR-U4-2: config invalid の fail-closed

invalid config での無音続行なし(BR-U4-3)— 設定破損を攻撃面・誤動作面にしない(システム境界の入力検証)。
