# Reliability Requirements — u003-kanban-hooks

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

drop 記録 + 次回 flush 回復（FR-5.4 / FR-4.2、受け入れ条件 5）が中心である。
rename 専有（BR-9）で取りこぼしを防ぎ、失敗時は queue へ行単位 append で戻す。
孤立 queue.processing（rename 直後の強制終了で残るスナップショット）は、次回 FlushHook 起動時の冒頭で検出し、内容を queue へ行単位 append してから削除する（回収手順。business-logic-model.md の flush フロー step 0.5）。これにより永久孤立は起きない。
N1（冪等収束）そのものは sync 本体の性質であり U002 が担当する。本 Unit は「失った書き込みを次回に必ず運ぶ」搬送の信頼性だけを担う。hook は常に exit 0（BR-4）。

## 根拠と検証

requirements.md の FR-5.4 / FR-4.2 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は BR-9（rename 専有）と孤立回収（step 0.5）の TDD で行う。
