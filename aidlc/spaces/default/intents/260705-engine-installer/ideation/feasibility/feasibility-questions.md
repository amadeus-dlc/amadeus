# Feasibility 質問（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

技術的な不確実性は grilling 確定 6 件と本ステージの実測（エンジン 7 dir、symlink 7 entry、hooks 配線 11 entry）で解消済みである。回答は上流と実測から転記し、新規のピア協議は行わない。

---

## Q1. 実現を阻む未知の技術要素はありますか？

A. ない（コピー、symlink 再作成、JSON マージ、スモーク実行はすべて Bun 標準 API と既存資産で実現できる）
B. ある（具体を記す）
X. Other (please specify)

[Answer]: A（出典: feasibility-assessment.md の実測表。外部依存の追加も不要）

## Q2. settings.json のマージ対象に hooks 以外の必須項目はありますか？

A. ない見込み（エンジン hooks / tools は env 非依存。$CLAUDE_PROJECT_DIR は Claude Code が実行時に与える）。確定は Inception で行い、専用 eval の A-1 検証で担保する
B. env の一部が必須
X. Other (please specify)

[Answer]: A（出典: feasibility-assessment.md「必須 env の調査」。現行 env 19 キーはハーネス調整用と実測）
