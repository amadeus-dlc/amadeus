# Scalability Design — experiment-contract-provenance

## Design inputs

`performance-requirements.md` のlinear counters、`security-requirements.md` のclosed proof、`scalability-requirements.md` のmax 6 events、`reliability-requirements.md` のledger replay、`tech-stack-decisions.md` のsingle process、`business-logic-model.md` のfinite stateを前提とする。

## Capacity components

`ClosedExperimentLimits`はevents=6、command payload=1 MiB、one active ledger、one handler callをliteralで公開する。parser / folder / storeは同じlimits identityを受け、別々のdefaultを持たない。

`LedgerIndex`はevent identity→ordinalとtransaction identity→receiptのbounded mapsだけを構築する。stateはreplayで導出し、別snapshot cacheを正本化しない。revision変更はschema / limits versionを変え、新namespaceへappendする。

## Growth rejection

7th event、payload超過、unknown command/cardinalityは`CapacityError`で開始前に拒否する。horizontal scale、queue、distributed writer、silent truncationをfallbackにしない。

## Capacity tests

limits exact / +1、two revision namespace、unknown schema、parallel writer attemptを検査する。各revisionのlive mutable structuresはlimits以下、旧immutable transaction objectsはretention対象として別計測する。
