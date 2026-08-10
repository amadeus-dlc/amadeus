# Reliability Design — stage-stats-attribution-service

## Scope and upstream applicability

present consumeの `business-logic-model.md` を対象とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected-absentで、declared NFR requirement IDはない。`requirements.md:287-309`と`services.md:70-96`をcontext evidenceとしてだけ使う。

## Failure and exit contract

| Condition | Stdout | Stderr | Exit | Recovery |
|---|---|---|---:|---|
| normal / empty attribution | complete report | none | 0 | none |
| partial unreadable corpus | readable-corpus report | shard diagnostic | 1 | filesystem修正後に再実行 |
| candidate malformed | complete report with rejection | none unless existing diagnostic | 0 | instrumentation修正、集計継続 |
| accounting/reconciliation invariant | none | typed invariant | 1 | defect修正後に再実行 |
| usage error | none | usage | 2 | argv修正後に再実行 |

precedenceはusage、invariant、partialの順である。legacy reportを値として作成済みでもattribution invariantが失敗すればrenderしない。partialだけは読めた母集団をscan reference付きで公開する。

## Resilience patterns

- parse-before-I/Oでinvalid invocationを局所化する。
- unreadable shardをcountし、readable corpusを決定的に継続する既存partial-sweepを維持する。
- candidate不正をcandidate単位rejectionへ隔離し、他candidate/windowを継続する。
- population invariantは全reportをfail-closedにし、partial semantic modelを公開しない。
- `process.exitCode`とsingle stdout writeでEOFまでnatural drainする。
- empty populationはnullable summaryと0 countを持つ正常reportにする。

circuit breaker、retry/backoff、health check、failover、replication、backupは非適用である。remote dependencyとpersistent stateがなく、自動retryは同じcorrupt inputやprogram defectを繰り返すだけである。recoveryはoperatorが原因を修正して同じdeterministic CLIを再実行する。

## Determinism and restart behavior

process-local stateだけを使い、crash後のrollbackやresume ledgerは不要である。再実行はcorpusを最初からreadし、同じcorpus/argv/tool versionなら同じsemantic outputとexitを返す。inputをrepairしないため、失敗したrunが次runへhidden stateを残さない。

## Decision traceability

| Reliability decision | Declared requirement | Context evidence / verification |
|---|---|---|
| exit 0/1/2 ladder | Missing (`reliability-requirements.md` absent) | `requirements.md:295-297`; CLI matrix |
| usage parse-before-I/O | Missing | `services.md:90-92`; scan spy 0回 |
| partial-sweep report + exit 1 | Missing | `services.md:86-88`; reference parity |
| candidate failure局所化 | Missing | `services.md:76-80`; mixed fixture |
| invariantでstdoutなし | Missing | `services.md:94-96`; captured stdout 0 byte |
| empty population正常化 | Missing | `services.md:82-84`; n=0/null assertions |
| natural stdout drain | Missing | `requirements.md:295-297`; oversized digest parity |
| deterministic full restart | Missing | `requirements.md:287-289`; repeated-run digest |
| circuit breaker/retry/failover/backupなし | Missing | external dependency/persistent stateなし; resource census |

## Reliability verification

全failure rowをprocess-level integrationで実行し、stdout/stderr/exitの組を検査する。Markdown/CSV/JSONの各oversized fixtureはproducer/consumer exit 0、full/pipe digest一致、JSON `jq empty`を要求する。partial scanはnormalと同じsemantic rulesを使い、referenceのunreadable countだけが母集団差を説明する。
