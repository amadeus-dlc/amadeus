# Scalability Requirements — election-record(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- 対象は選挙1件分の記録生成・照合(business-logic-model.md — render/verify の入力は単一選挙の票集合+記録文書)。投票者は現登録 14 名(stage diary Interpretations の team.sh 実測記録)で、W-04(配布外)により成長前提を持たない — 容量計画・スケーリング戦略は N/A(反証可能な根拠: requirements.md FR-5/6 が扱うのは選挙単位の文書のみ)
- 選挙件数の増加はファイル数の線形増(elections/<ID>/ 配下)であり、U3 は常に1件単位で動作するため件数増の影響を受けない

## 同時実行

- render/verify は共有可変状態を持たない純関数(business-rules.md BR-R5 の決定性が前提)。並行実行の制御は不要。実行形態は既存スタック(technology-stack.md 実測の Bun 単一プロセス直接実行)のまま追加プロセスを要求しない
