# Grillings

## 一覧

| ID | 主題 | 対象 | 状態 | 主な確定判断 | 反映先 | 詳細 |
|---|---|---|---|---|---|---|
| G001 | 要求の境界確定 | Intent | completed | 在庫参照に失敗した場合は注文作成を進めない | [requirements-analysis/requirements.md](requirements-analysis/requirements.md) | [G001](grillings/G001-requirements-boundaries.md) |
| G002 | アプリケーション設計の境界確定 | Intent | completed | UI、サービス層、ドメインの 3 層で構成する | [application-design/components.md](application-design/components.md) | [G002](grillings/G002-application-design-boundaries.md) |
| G003 | Unit の境界戦略と粒度 | Intent | completed | ドメイン領域別に粗く 3 Unit へ分割する | [units-generation/unit-of-work.md](units-generation/unit-of-work.md) | [G003](grillings/G003-unit-boundaries.md) |
| G004 | Bolt の束ね方と walking skeleton | Intent | completed | 3 Unit を単一の B001 に束ね、注文作成を貫通する walking skeleton にする | [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md) | [G004](grillings/G004-bolt-plan.md) |
