# Scalability Requirements — amadeus-mirror-cli

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

- N/A(反証可能な根拠): technology-stack.md の実行モデルどおり単発 CLI(サーバー・常駐面なし)であり、単一 intent 操作・単一ユーザー実行であり、スケール軸(同時実行・データ量・ユーザー数)が存在しない。intents.json は現行39エントリで、線形読取が問題になる規模(数千件)は運用上想定されない(intent は週数件ペース)
- 将来条件: 一括ミラー化(スコープ外)を導入する場合にのみ再評価

## 検証

スケール要求が存在しないため専用テストは作らない(build-and-test:c1 — 実在境界へ trace しない検査の機械追加禁止)。intents.json の件数増は既存の線形読取のまま許容し、閾値監視は導入しない。
