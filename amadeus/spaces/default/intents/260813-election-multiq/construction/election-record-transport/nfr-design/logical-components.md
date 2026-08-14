# Logical Components — election-record-transport

## Input

[business-logic-model](../functional-design/business-logic-model.md)をrender/verify/delivery failure domainsへ分離する。

## Components

| Component | Responsibility | Failure domain |
|---|---|---|
| View Builder Adapter | canonical blind view | one voter view |
| Record Renderer | deterministic question sections | one document |
| Record Verifier | independent findings | one verification |
| Transport Port | agmsg/subagent send | one voter |
| Delivery Booker | provenance/timeline dedupe | one distribution run |

## Isolation

transport failureは他voter outcomeを失わせず列挙するが、stage successは必要delivery contractに従う。record failureはdeliveryをrollbackせず、recorded transitionだけを止める。shared cache/serviceなし。

## Review

READY。delivery availabilityとrecord integrityを別blast radiusに閉じ込める。
