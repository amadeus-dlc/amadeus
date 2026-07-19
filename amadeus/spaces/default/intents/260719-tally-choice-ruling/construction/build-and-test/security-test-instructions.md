# Security Test Instructions — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 攻撃面評価(devsecops 観点)

- 新規の入力経路・外部通信・秘密情報なし(ローカル elections store の JSON を読む repo ローカル CLI)。
- **受理境界はむしろ強化**: unknown-choice 分類の追加により、実在しない choiceInternalNo(負値・0 含む)が fail-closed 拒否される(t234 で3値の拒否を実測)— #1252 系の受理境界強化と同方向。
- 正規表現の追加なし(ReDoS 面の新規リスクなし)。

## 合否基準

unknown-choice 拒否テスト green(達成)。既存 fail-closed 5分類の順序不変(スキーマコメントの順序規約で固定)。
