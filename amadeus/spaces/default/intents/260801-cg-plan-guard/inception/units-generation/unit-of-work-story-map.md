# Unit of Work Story Map — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

- 各 Unit の利用者価値(conductor 視点)を `requirements.md` の Intent 分析(redirect 思想)から導出し、`components.md` の C1〜C7 との対応を付した。
- ストーリーの「出口へ誘導する」文言は `decisions.md` ADR-4 の3部メッセージ帰結、「必ず表面化する」は ADR-3 の実績述語(`component-methods.md` の checkSwarmEvidence 契約)に接地。到達点の積み上げ順は `services.md` / `component-dependency.md` の層依存に一致。

## ストーリーマップ

| Unit | conductor のストーリー | 対応 FR / C |
|---|---|---|
| U1 dag-integrity | 「計画の機械投影(bolt_dag)が黙って消えることがない — 消えたら理由つきで止まる」 | FR-3/FR-5、C4/C5 |
| U2 issuance-guard | 「並行計画を conductor がタスク化し忘れても、engine が3部メッセージで正しい出口(計画訂正 or ラダー)へ誘導する」 | FR-1/FR-4、C1/C2/C3 |
| U3 approve-reconciliation | 「engine を迂回した手動 fan-out や実行形態の乖離も、approve で必ず表面化する」 | FR-2/FR-4、C6/C7 |
| U4 docs-sync | 「新しいガードの挙動と出口が docs から分かる」 | B4 |

## 価値の到達点

U1 単独 = 無音 null 化の封鎖(#1893 クラスの恒久防止)。U1+U2 = 実測4件クラス(計画不履行)の構造的阻止。U1+U2+U3 = #1892 の公開契約完結(両方向+実績突合)。U4 = 運用可視化。
