# User Flow — Presence Evidence（260705-presence-evidence）

上流入力: [wireframes.md](wireframes.md)

## 宣言者（docs 系 Intent の実行者）のフロー

1. ディスパッチ承認を decision へ転記する（現行運用）。
2. `declare-docs-only --evidence "DECISION_RECORDED state-init ..."` を実行する。
3. 候補 1 採用時: 転記前に HUMAN_TURN が mint されている必要がある（mint 規律拡張とセット）。拒否時は mint → 再宣言。
4. 不採用時: 現行フローのまま。設計境界は文書で参照できる。
