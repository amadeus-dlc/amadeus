# Scalability Design — amadeus-mirror-cli

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

scalability-requirements.md の N/A 判定に従い、スケール機構(ページング・並列・キュー)は設計しない。intents.json は全件読み(readIntentRegistry、tech-stack-decisions.md の状態読取決定)のままとし、business-logic-model.md の逐次フロー(buildSnapshot 1回/コマンド)を変更しない — 現行39件・週次成長で線形読取が制約になる規模に達しない。

## 再評価条件

performance-requirements.md / security-requirements.md / reliability-requirements.md の各要求はスケール機構の不在に影響されない(独立性の確認)。

一括ミラー化(スコープ外)を導入する将来 intent でのみ再評価する。
