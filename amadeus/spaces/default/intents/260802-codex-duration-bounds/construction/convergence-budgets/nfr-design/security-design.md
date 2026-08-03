# Security Design — convergence-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Exact-match Policy

`RetryClassifierV1`は4-field tupleをstable rule ID Mapへ完全一致させる。missing、unknown version、effect possible／unknownはnon-retryableで、adapterにoverride APIを公開しない。

## Protected Surfaces

approval、gate、GitHub mutation、publish、canonical writeをregistry型に含めない。rendererへはrule ID、ordinal、remaining、terminationだけを渡し、raw error／credentialを渡さない。
