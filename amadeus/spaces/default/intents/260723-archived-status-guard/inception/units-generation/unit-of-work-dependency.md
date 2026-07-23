# Unit Dependency DAG — archived intent lifecycle

上流入力: `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`。

## 依存辺

- `lifecycle-transaction` depends on `status-registry`: strict type、transition capability、migration後registry contractを消費する。
- `guard-integration` depends on `status-registry`: archived status lookupとtyped errorを消費する。
- `guard-integration` depends on `lifecycle-transaction`: utilityがarchive/unarchive verbへ委譲し、共通preflightを消費する。

```yaml
units:
  - name: status-registry
    depends_on: []
  - name: lifecycle-transaction
    depends_on: [status-registry]
  - name: guard-integration
    depends_on: [status-registry, lifecycle-transaction]
```

## Integration contracts

| Producer | Consumer | Contract |
|---|---|---|
| status-registry | lifecycle-transaction | `IntentStatus`、opaque context、transition capability |
| status-registry | guard-integration | strict lookup、archived discriminator、typed diagnostics |
| lifecycle-transaction | guard-integration | state CLI exit/stdout、journal schema、audit payload、preflight wrapper |

このartifactはtopologyだけを表す。単一の推奨build order、critical path、価値/リスク優先順位はDelivery Planningへ委ねる。

## Parallelism

direct dependencyのないUnit組は存在しない。各Unit内部ではsource・tests・documentationの並行作業が可能だが、Unit間の経済的sequenceはここでは決めない。
