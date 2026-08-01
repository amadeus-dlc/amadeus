# Risk and Sequencing Rationale — 260801-cg-plan-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、components.md、requirements.md

- リスク序列は `requirements.md` NFR-1(誤発動ゼロ = 最大リスク)から導出し、順序は `unit-of-work-dependency.md` の依存根拠、各 Bolt の防御は `unit-of-work.md` の検収 AC、価値の段階到達は `unit-of-work-story-map.md` の到達点に対応する。
- リスク2(pin 破壊)の対象特定は `components.md` の C5(bolt_dag_absence 書き手)の配置(runtime-graph 出力面)から導出。

## リスク制御としての順序(intra-bolt-order-as-risk-control)

1. **誤発動(最大リスク)**: U1 を最初に置く理由そのもの — degrade スコープの正常系維持(AC-3b)と判別子(bolt_dag_absence)を、ガード本体(U2/U3)の前に確立する。U2 のガードは判別子なしには absent と「units 無し」を区別できず誤発動する。
2. **既存 pin の破壊**: runtime-graph への新フィールド(ADR-2)は t110/t124 golden に触れる可能性 — U1 の plan で pin 棚卸しと宣言改訂を先行(CR-5 同型)。
3. **engine 自己参照リスク**: 本 intent 自身が construction 中に新ガードを踏む可能性(U2 着地後の U3/U4 の per-unit 進行)— 直列計画+理由記録済みのため新ガードは緑通過する設計(自己適用の整合を U2 の AC-1c で先行固定)。
4. **#1893 是正の遡及面**: 完了済み record の機械可読ブロック是正は audit 無改変・散文一致方向のみ(FR-5 注記)。

## 逃し弁の一貫性

全 Bolt を通じ、ガード発動時の出口は「計画訂正 → compile → 再評価」のみ(実行時 verb なし)。本計画の直列理由記録が、その出口様式の模範実例となる。
