# CI/CD Pipeline — u003-kanban-hooks

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[logical-components.md](../nfr-design/logical-components.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[services.md](../../../inception/application-design/services.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 設計

専用の CI パイプラインは追加しない。既存の `npm run test:all`（mock CI）に U003 の hook テスト（queue / flush の純関数部） が乗ることで検証される。CI 設定ファイルの変更は行わない。

## 判断の位置づけ

repo 内限定・暫定機構（C02 / C07）のため、インフラは「無し」を明示するのが本設計の内容である。新しいインフラ要素を導入しない。
