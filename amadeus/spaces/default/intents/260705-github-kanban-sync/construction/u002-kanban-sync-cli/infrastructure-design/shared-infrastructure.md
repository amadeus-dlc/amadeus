# Shared Infrastructure — u002-kanban-sync-cli

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[logical-components.md](../nfr-design/logical-components.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[services.md](../../../inception/application-design/services.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 設計

共有インフラは存在しない。状態はすべて ローカル成果物（読み取り）と GitHub Projects v2 board（書き込み先の鏡） にあり、他の Intent・他の開発者と共有するミドルウェアを持たない。

## 判断の位置づけ

repo 内限定・暫定機構（C02 / C07）のため、インフラは「無し」を明示するのが本設計の内容である。新しいインフラ要素を導入しない。
