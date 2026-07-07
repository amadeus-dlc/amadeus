# Functional Design Memory

## Interpretations

- 2026-07-07T07:42:00Z — `functional-design` は `unit-of-work` の4 unit すべてに対して作成した。
- 2026-07-07T07:42:00Z — この intent は UI/runtime service を追加しないため、frontend-components は各 unit で対象外として明示した。
- 2026-07-07T07:42:00Z — `requirements`, `components`, `component-methods`, `services`, `unit-of-work`, `unit-of-work-story-map` の6入力を各 unit の upstream trace に含めた。

## Deviations

- 2026-07-07T07:42:00Z — unit ごとの追加質問は生成しない。Delivery Planning で Bolt sequence と unit boundary が承認済みであり、追加質問は実装前の path selection だけに残した。

## Tradeoffs

- 2026-07-07T07:42:00Z — ドメイン entity を runtime data model ではなく、設計記録・docs・validation evidence などの documentation-domain entity として定義した。

## Open questions

- 2026-07-07T07:42:00Z — Code Generation で、U1 の ADR/design record を repository のどの path に置くか決定する必要がある。
