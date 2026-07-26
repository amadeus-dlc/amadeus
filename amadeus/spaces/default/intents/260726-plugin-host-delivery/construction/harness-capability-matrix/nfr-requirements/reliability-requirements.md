# 信頼性要件 — U1 harness-capability-matrix

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## プローブの決定性と再現手順

U1 の信頼性は稼働時可用性ではなく、**プローブ結果の決定性と再現可能性** で定義する。business-logic-model の「判定ロジック(決定的)」は、native-manifest / folder-drop-auto / manual-only の 3 値へ実測結果から機械的に割り当てるものであり、希望的割当(存在しない機構の仮定)を排除する。

- 合否: 各能力セルは ProbeRecord へ参照 ID で trace され(business-logic-model の「出力」節)、同一リポジトリ断面で第三者が ProbeRecord の command を再実行すると同一のクラス判定に至る。判定の入力(file:line 引用・コマンド出力)が全て記録されていることを §12a で確認する
- 合否: 測定 ref(HEAD SHA)を成果物へ明記する(measurement-ref-in-artifacts)。本 nfr-requirements 起草時点の測定 ref は HEAD `7bce53dc6`

## silent skip の禁止(縮退の可観測性)

business-rules の BR-U1-3(silent skip 禁止)/ BR-U1-6(fail-closed 割当)を信頼性契約として継承する。非対応・判定不能の面は行の省略・空欄で回避せず、必ず manual-only の degrade 契約(利用者の手動床 1 コマンド+doctor 表示)へ落とす。上流に前例のない 3 面(cursor / opencode / kimi)も同規則で扱い特例を作らない。

- 合否: 判定不能セルが `⚠ deferred(実装時実測)` +確定条件 1 行、または manual-only degrade 契約のいずれかを持つ(BR-U1-2 / BR-U1-6)。裸の空欄・行省略は不合格

## 書き手の起動条件までの実測

business-rules の BR-U1-4(語彙と存在の分離)のとおり、composeTrigger は「フック機構の存在」と「イベント語彙・起動保証の実測」を別セルで記録し、書き手の起動条件(どのモード・設定で発火するか)まで確認して measured とする(seam-writer-mode-precondition)。存在の実測だけで発火可を確約しないことが、下流 Bolt 6(フック配線)の判定信頼性を支える。

- 合否: composeTrigger を measured とするセルは、書き手の起動条件(発火するモード・設定)を ProbeRecord に含む。存在のみの確認は `⚠ deferred` へ降格する

## 依存障害面の不在

technology-stack のとおり本フレームワークは HTTP・DB を持たず外部ランタイム依存がゼロであるため、U1 成果物の生成・参照に外部サービス障害の伝播経路は存在しない。信頼性のリスクはプローブ手順の再現性に閉じ、上記 3 要件で担保する。
