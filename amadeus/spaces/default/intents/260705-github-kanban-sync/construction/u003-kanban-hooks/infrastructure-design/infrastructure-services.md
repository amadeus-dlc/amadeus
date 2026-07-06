# Infrastructure Services — u003-kanban-hooks

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[logical-components.md](../nfr-design/logical-components.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[services.md](../../../inception/application-design/services.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 設計

利用する外部サービスは GitHub（Projects v2 GraphQL API、認証は gh CLI 経由）だけである。AWS その他のインフラサービスは使わない（repo 内限定の暫定開発ツール、C02 / C07）。

## 判断の位置づけ

repo 内限定・暫定機構（C02 / C07）のため、インフラは「無し」を明示するのが本設計の内容である。新しいインフラ要素を導入しない。
