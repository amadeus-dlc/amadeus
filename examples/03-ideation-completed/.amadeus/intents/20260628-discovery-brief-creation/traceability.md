# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260628-discovery-brief-creation | [20260628\-discovery\-brief\-creation.md](../20260628-discovery-brief-creation.md) | Inception の要求分析で参照する。 |
| Scope | Discovery Brief 記録と Intent 候補提示 | [scope.md](scope.md) | Inception の対象と対象外の制約にする。 |
| 実現可能性 | Discovery Brief の既存例示を前提に成立する | [ideation.md](ideation.md) | 要求候補の前提として扱う。 |
| 初期モック | Discovery Brief 確認カード | [mocks/initial-confirmation.puml](mocks/initial-confirmation.puml) | 要求候補と確認観点の具体例として扱う。 |
| 状態 | Ideation completed | [state.json](state.json) | gate passed のため Inception へ進められる。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| Intent | 20260628-discovery-brief-creation | なし | Discovery Brief の最初の候補として単独で成立するため。 | [../../intents.md](../../intents.md) |
| Discovery | 20260628-amadeus-theme-decomposition | なし | この Intent は Discovery Brief の最初の Intent 候補として作成済みであるため。 | [../../discoveries/20260628-amadeus-theme-decomposition.md](../../discoveries/20260628-amadeus-theme-decomposition.md) |
