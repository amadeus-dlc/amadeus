# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 不審なパスワード再設定のリスク通知とサポート連携 | [intent.md](intent.md) | Inception の要求分析で目的と成功条件を参照する。 |
| Scope 対象 | 通知、説明材料、リスク分類、初期モック | [scope.md](scope.md) | 要求、ユースケース、Unit 分割の対象にする。 |
| Scope 対象外 | 検知基盤、配送保証、本人確認業務フロー全体、アカウント停止、ログイン認証全体 | [scope.md](scope.md) | Inception で再定義しない制約として扱う。 |
| 実現可能性 | 技術、運用、セキュリティ、依存 | [ideation.md](ideation.md) | 要確認の観点を要求分析と設計質問へ渡す。 |
| 体制 | 判断者、参照者、検証対象、後続担当 | [ideation.md](ideation.md) | Inception の確認相手とレビュー観点にする。 |
| 初期モック | 利用者通知、サポート説明カード、セキュリティ確認メモ | [ideation.md](ideation.md) | 要求とユースケースの具体例として参照する。 |
| 状態 | Ideation completed / gate passed | [state.json](state.json) | Inception へ進める状態として扱う。 |
| 判断 | Ideation 完了判断 | [decisions.md](decisions.md) | Inception 開始時の前提判断にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260627-risk-aware-reset-support | 20260626-password-reset | 不審な再設定の通知とサポート連携は、既存のパスワード再設定要求、再設定トークン発行、認証情報更新の成立を前提にする。 | [intents.md](../../intents.md) |
| 判断 | D001 | なし | Ideation 成果物が揃っており、Inception へ進めるための基本判断である。 | [decisions.md](decisions.md) |
