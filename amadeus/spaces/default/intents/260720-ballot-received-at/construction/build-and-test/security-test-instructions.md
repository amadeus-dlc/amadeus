# Security Test Instructions — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 攻撃面評価(devsecops 観点)

- 新規入力経路なし — receivedAt は**受理側(conductor セッション)が mint する機械時刻**で、投票者の申告値ではない。改竄耐性のある順序軸を導入する変更であり、攻撃面はむしろ縮小(申告時刻の操作で timeline 順序を歪める余地が verify 検査から排除される)。
- 単調性検査は receivedAt 軸で維持(検証価値の保存 — NFR-2)。移行窓の読み分岐は1点に限定(シム拡大なし)。

## 合否基準

受理軸テスト green(達成)。verify の改竄検出(t236 mismatch)green 維持(達成)。
