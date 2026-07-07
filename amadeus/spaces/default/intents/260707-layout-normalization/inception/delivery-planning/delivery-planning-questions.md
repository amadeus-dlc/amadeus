# Delivery Planning Questions

## 質問生成の判断

追加質問は生成しない。`unit-of-work`, `unit-of-work-dependency`, `unit-of-work-story-map`, `requirements`, `components`, `team-practices` により、Bolt sequence に必要な依存関係と delivery policy が揃っているためである。

## Sequencing Assumptions

- Sequencing heuristic: risk-first + decision-first。
- WSJF scoring: 数値化しない。job size が小さく、U1 が他 unit の依存元であるため、DAG と risk-reduction で十分に判断できる。
- Bolt granularity: Bolt 1 は U1、Bolt 2 は U2/U3/U4 を bundle する。
- Parallelism: U2/U3/U4 は DAG 上は並行可能だが、同じ documentation/design surface を触る可能性があるため Bolt 2 に束ねる。
- External dependencies: `packages/setup` は sibling intent dependency。Bolt を block しない。

## 未回答質問

Construction に進む場合、Bolt 1 の設計記録を最終的にどの repository path に置くかを実装前に確認する。
