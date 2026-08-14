# Logical Components — election-canonical-schema

## Input

[business-logic-model](../functional-design/business-logic-model.md)のpipelineを4 logical componentsへ分ける。外部service、shared mutable cache、runtime poolは不要。

## Components

| Component | Responsibility | Failure domain | Isolation |
|---|---|---|---|
| Schema Classifier | v2/legacy/unsupported/ambiguous判別 | input 1件 | pure function |
| Strict Decoders | election/ballot/tally shape/reference validation | artifact 1件 | typed Result、no write |
| Canonical Encoder | fixed field/order v2 bytes生成 | value 1件 | validated input only |
| Identity Helper Adapter | legacy run/established digest | digest 1件 | domain-separated helper |

## Blast radius and resources

各decode failureは一CLI invocation/一artifactに限定される。process-global state、filesystem、networkを持たず、retryは同一入力でdeterministic。Set/Mapはinvocation localでO(Q+C+V+R) memory、固定cacheは置かない。

## Review

READY。componentsはU1内のtest seamであり、別package/serviceへ過剰分割しない。
