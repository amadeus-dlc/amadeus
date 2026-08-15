# Delivery Planning — 質問(260814-open-bug-batch-6)

## 質問なしの宣言

Bolt 構成に影響する判断は上流で確定済みのため、本ステージの新規質問は 0 件とする:

- Bolt 粒度・PR 粒度: project.md 既決(1 Issue = 1 Unit = 1 Bolt = 1 PR)
- walking-skeleton: org.md のスコープ既定(self-fix は非適用)で確定
- 順序: 唯一の依存 U-2→U-3 はトポロジー制約、他は value-first(risk-and-sequencing-rationale.md)
- 自律実行様式: intent autonomy=full が Birth 時の HUMAN_TURN で宣言・grant 済み(ラダープロンプトの選択は autonomy トランザクションが書く)

既決事項の再質問はしない(project.md c5)。
