# Deployment Architecture — u002-kanban-sync-cli

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[logical-components.md](../nfr-design/logical-components.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[services.md](../../../inception/application-design/services.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 設計

デプロイは存在しない。成果物は git リポジトリ内のファイル（`dev-scripts/kanban/` と `dev-scripts/kanban-sync.ts`）であり、PR merge がそのまま「配備」である。実行環境は各作業マシンのローカル（Bun + gh CLI）に限る。クラウドリソースは使わない。

## 判断の位置づけ

repo 内限定・暫定機構（C02 / C07）のため、インフラは「無し」を明示するのが本設計の内容である。新しいインフラ要素を導入しない。
