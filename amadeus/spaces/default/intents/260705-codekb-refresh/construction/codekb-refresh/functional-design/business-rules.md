# Business Rules — codekb-refresh

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール |
|---|---|
| BR-1 | 実在しない場所・機構を現行として記述しない（実在はパス参照の機械検査で確認） |
| BR-2 | 件数（skill 数、eval 数など）は解析時点の実測値を使い、変動しやすいものは断定を避ける |
| BR-3 | provenance（解析時刻、対象コミット、更新履歴）を timestamp.md に保つ |
