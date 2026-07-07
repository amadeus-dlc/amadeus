# Units Generation Memory — インストーラの実装

## Interpretations

- 2026-07-07T06:25:30Z — unit は Stage 2.8 の Bolt 順序ではなく、Construction が参照する依存トポロジーとして定義する。
- 2026-07-07T06:25:30Z — `packages/setup` は単一 publishable package だが、CI/release/docs は Must 要件を持つため support units として同じ DAG に含める。

## Deviations

- 2026-07-07T06:25:30Z — なし。Stage 2.7 では実装順・critical path・経済的優先度を決めない。

## Tradeoffs

- 2026-07-07T06:25:30Z — layer units は境界が明確だがユーザー価値が縦に通りにくい。capability-slice units を採用し、hexagonal package 内の必要 layer を unit ごとにまたぐ。
- 2026-07-07T06:25:30Z — 10〜12 units まで細分化すると依存管理が重くなる。8 medium units で安全性・CI・docs を落とさず扱う。

## Open questions

- 2026-07-07T06:25:30Z — Delivery Planning で Bolt 順序と walking skeleton を決める。Units Generation では候補順を固定しない。

