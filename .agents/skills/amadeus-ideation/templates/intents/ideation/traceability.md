# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | <intent-id>-<slug> | [<intent-id>-<slug>.md](../<intent-id>-<slug>.md) | Inception の要求分析で参照する。 |
| Scope | 未確認 | [scope.md](scope.md) | Inception の対象と対象外の制約にする。 |
| 状態 | Ideation in_progress | [state.json](state.json) | gate が通るまで Inception へ進めない。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | <intent-id>-<slug> | <dependency-or-none> | 未確認 | [intents.md](../../intents.md) |
