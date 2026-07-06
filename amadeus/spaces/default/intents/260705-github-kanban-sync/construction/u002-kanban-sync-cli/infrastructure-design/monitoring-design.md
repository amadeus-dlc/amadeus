# Monitoring Design — u002-kanban-sync-cli

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[logical-components.md](../nfr-design/logical-components.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[services.md](../../../inception/application-design/services.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 設計

専用の監視は設けない（C07 の Won't = 通知・統計を作らない）。可観測性は CLI の exit code と 1 段落エラーメッセージ、および board の Synced At（鮮度） で足りるとする。

## 判断の位置づけ

repo 内限定・暫定機構（C02 / C07）のため、インフラは「無し」を明示するのが本設計の内容である。新しいインフラ要素を導入しない。
