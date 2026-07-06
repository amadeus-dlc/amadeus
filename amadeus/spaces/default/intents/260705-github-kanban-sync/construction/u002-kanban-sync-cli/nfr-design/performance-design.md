# Performance Design — u002-kanban-sync-cli

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)、[security-requirements.md](../nfr-requirements/security-requirements.md)、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[business-rules.md](../functional-design/business-rules.md)

## 設計

性能設計は D-AD4（1 card = 1 GraphQL リクエスト、alias で mutation を束ねる）だけである。ensureFields のクエリはフィールド一覧の 1 回取得 + 不足分の作成に留め、card 数に比例させない。60 秒実用条件は walking skeleton の実測で確認する（nfr-requirements の規模注記のとおり）。

## 判断の位置づけ

nfr-requirements の要求を設計へ写像したものであり、新しい機構は追加しない（暫定機構 C07）。実装の一次情報は functional-design と application-design の契約である。
