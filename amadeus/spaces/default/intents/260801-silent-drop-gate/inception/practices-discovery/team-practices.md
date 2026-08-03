# Team Practices — 260801-silent-drop-gate（部分ドラフト）

## 取扱い

`code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md` と affirm 済み `team.md` を照合した。Way of Working、Testing Posture、Deployment、Code Style は変更せず live managed block を温存し、陳腐化していた Walking Skeleton のみを更新する。

## Walking Skeleton

私たちは、新しい実行経路・検証経路・配布経路を含む self-feature では、最大リスクを端から端まで通す最小の Construction Bolt を最初に置き、人間のゲートで確認してから後続機能へ広げる。既存挙動への限定修正では、org／project の scope rule と Delivery Planning の判定に従う。
