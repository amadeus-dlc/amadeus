# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Ideation を完了し Inception へ進める | 採用済み | D002 | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |
| D002 | リスク通知と確認範囲の境界を固定する | 採用済み | なし | [D002-risk-notification-boundary.md](decisions/D002-risk-notification-boundary.md) |

判断は、インテント内の構造、境界、進め方に影響する決定を記録する。
判断が別の判断を前提にする場合は、依存関係を明示する。

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | D002 | Intent、Scope、Ideation、初期モック、状態、追跡に加え、Inception で要求化する対象と対象外の境界が固定されていることを前提にする。 |
| D002 | なし | リスク通知と確認範囲の境界を固定する判断であり、先行判断を前提にしない。 |
