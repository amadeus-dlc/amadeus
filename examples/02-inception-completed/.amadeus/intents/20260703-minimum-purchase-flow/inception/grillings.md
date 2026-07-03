# Grillings：Inception

## 一覧

| ID | 主題 | 対象 | 状態 | 主な確定判断 | 反映先 | 詳細 |
|---|---|---|---|---|---|---|
| G001 | 要求の境界と障害時の振る舞い | Requirements Analysis | completed | 在庫参照不能時は注文作成を受け付けない。注文作成は決済を含めない | [requirements-analysis/requirements.md](requirements-analysis/requirements.md) | [G001](grillings/G001-requirements-boundary.md) |
| G002 | コンポーネントとサービスの境界 | Application Design | completed | 2 サービスと 4 責務の分割。在庫参照の専用コンポーネントへの分離 | [application-design/services.md](application-design/services.md)、[application-design/components.md](application-design/components.md) | [G002](grillings/G002-application-design-boundaries.md) |
| G003 | Unit の境界戦略と粒度 | Units Generation | completed | サービス別の境界戦略で、粗い粒度の 3 Unit にする | [units-generation/units.md](units-generation/units.md) | [G003](grillings/G003-unit-boundaries.md) |
| G004 | Bolt の束ね方と順序 | Delivery Planning | completed | B001 は U001 と U002 を束ねた注文作成貫通の walking skeleton にし、価値先行で順序付ける | [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md) | [G004](grillings/G004-bolt-sequencing.md) |
