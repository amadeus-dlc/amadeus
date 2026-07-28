# Reliability Requirements — U3 u3-runner-gen-plugin

上流入力(consumes 全数): business-logic-model.md(配線層の失敗経路)、business-rules.md(BR-U3-3/BR-U3-4)、requirements.md(FR-4b/4c)、technology-stack.md

## RL-U3-1: spawn 失敗の loud 化

runner-gen write の spawn 失敗は failure 系で loud(business-logic-model.md 配線層 — 無音でスキルなし状態を残さない)。compose⇔drop の両側で同一契約(business-rules.md BR-U3-3 の対称配線)。

## RL-U3-2: 再生成の冪等性

write の再実行は同一 graph から同一出力(business-logic-model.md の stock runner 冪等性節 — fixture でピン)。drop 後の prune も再実行安全(既存 pruneOrphanRunners 経路 — requirements.md FR-4b)。

## RL-U3-3: stock 面の不変

repo・plugin 未導入ホストで write/check の出力・verdict 不変(business-rules.md BR-U3-4 の機械比較を完了条件に含む、technology-stack.md の既存 CI ゲート群で回帰固定)。
