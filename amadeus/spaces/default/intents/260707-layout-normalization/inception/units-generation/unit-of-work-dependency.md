# Unit Of Work Dependency

## Upstream Trace

この DAG は `components`, `component-methods`, `services`, `component-dependency`, `decisions`, `requirements` に基づく。Stage 2.7 の責務に従い、ここでは topology のみを定義し、implementation order や critical path は決めない。

## Dependency DAG

```yaml
units:
  - name: U1 Layout Decision Record
    depends_on: []
  - name: U2 Contributor Documentation Update
    depends_on: [U1 Layout Decision Record]
  - name: U3 Guard Validation Plan
    depends_on: [U1 Layout Decision Record]
  - name: U4 Follow-up Migration Preparation
    depends_on: [U1 Layout Decision Record]
```

## Dependency Rationale

U1 が decision の source of truth になるため、U2、U3、U4 は U1 に依存する。U2、U3、U4 は互いに直接依存しない。Delivery Planning はこの DAG を使って、docs と validation を同じ Bolt にまとめるか、独立 Bolt に分けるかを判断する。

## Integration Points

- U1 -> U2: ADR/design record の selected decision を docs language へ反映する。
- U1 -> U3: ADR/design record の guard preservation を validation plan へ反映する。
- U1 -> U4: ADR/design record の rejected/deferrable alternatives を follow-up issue/backlog へ反映する。

## Parallel Opportunities

U1 完了後、U2、U3、U4 は並行可能である。U2 は documentation、U3 は validation commands、U4 は issue/backlog record であり、同じ file ownership になる場合だけ Delivery Planning で統合を検討する。
