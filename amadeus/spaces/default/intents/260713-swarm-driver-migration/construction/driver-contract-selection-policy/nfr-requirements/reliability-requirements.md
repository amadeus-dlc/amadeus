# Driver Contract & Selection Policy Reliability Requirements

## 上流とreliability model

本成果物はU-01の`business-logic-model.md`、`business-rules.md`、`requirements.md`、brownfield `technology-stack.md`を消費する。U-01は短命pure functionで永続state/network serviceを持たないため、availability SLA、backup、multi-AZはN/Aである。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U01-REL-01 | 同一canonical inputのoutcome deep equality | 100% | 10,000 generated cases × repeat |
| U01-REL-02 | canonical JSON digest一致 | 100% | input順序/duplicate変形 property |
| U01-REL-03 | invalid/conflict/explicit failureのside effect call | exactly 0 | dependency spies |
| U01-REL-04 | closed decision-table branch coverage | 100% required rows | table manifest |
| U01-REL-05 | secret-like value leakage | exactly 0 | stdout/error/schema canary scan |
| U01-REL-06 | unknown/invalid stateのsuccess化 | exactly 0 | negative/compile fixtures |

wall-clock uptimeは測らない。RTOはcallerによる即時再計算、RPOは永続dataがないため0/N/Aである。

## Failure behavior

| Failure | Required terminal result | Retry |
|---|---|---|
| new/legacy env conflict | `CONFLICTING_ENV` | input修正後のみ |
| invalid new value | `INVALID_DRIVER` | input修正後のみ |
| harness mismatch | `HARNESS_DRIVER_MISMATCH` | driver修正後のみ |
| explicit unavailable | `EXPLICIT_DRIVER_UNAVAILABLE` | fallbackなし |
| missing/contradictory capability | contract error | probe input修正後 |
| registration duplicate/missing | startup/build error | mapping修正後 |
| unknown output field | schema rejection | implementation修正後 |

failure時もpartial outcomeを返さず、side effectを開始しない。U-02のattempt retry、lease、checkpointをU-01へ複製しない。

## Fault containment

- caller inputをmutationせず、resultはfrozen valueとする。
- global cache/singleton mutable stateを持たず、1 call failureを他callへ波及させない。
- locale、clock、random、object insertion orderへ依存しない。
- errorにraw input/stackを保持せず、診断codeとfield pathだけを返す。
- invalid stateはsmart constructor/closed unionでruntime前に排除する。

## Observability handoff

U-01自身はlog/auditを書かない。U-02へ渡すredacted projectionはschema version、source、requested、selected/mode、harness、topology/reason、fallback diagnostic、legacy warning codeだけを持つ。canonical digestで同一decisionを追跡でき、credential/prompt/raw responseを含まない。

## Recovery and regression gate

pure recomputation以外のrecovery procedureはない。次をmerge blockerにする。

1. table/property/schema/invalid-state testの失敗またはskip。
2. 同一入力でdigestが変わる。
3. explicit failureからfloor/native side effect spyが1回以上呼ばれる。
4. unknown branch、secret canary、registration placeholderがsuccessになる。
5. typecheck/lint/complexity/coverage ratchetの悪化。

## Review

必須のarchitecture reviewerが本節へ結果を追記する。

### Iteration 1

- Verdict: **READY**
- Blocking findings: **0**

NFR contractは上流のU-01境界と一貫し、実装者が測定対象や責務を推測する必要はない。

- provider CLI実行時間、native batch duration、token消費へ数値SLOを設定していない。一方、pure U-01内部だけをexternal I/O/process/filesystem/clock/random exactly 0、native candidate最大4件・各最大1評価、topology正規化`O(n log n)`以下、追加memory`O(n)`以下として構造的に測定するため、上流の「速度/token保証は非目標」と矛盾しない。10,000件はproperty test sampleであり製品latency SLOではない。
- U-01は正規化済み`ProbeResult`を読むpure parse/classify/select/schema projectionに限定される。provider probe/deadline/processはU-02〜U-05、audit/checkpoint/retry/side effectはU-02以降、Kiro waveはU-05が所有し、NFR成果物はこれらをU-01へ逆流させていない。
- STRIDEはclosed harness/driver identity、canonical/frozen input、redacted decision digest、allowlist schema、既知2 env keyだけのprojection、dynamic load禁止へ具体化されている。env生値、credential、prompt、provider response、stackは型・schema・error・永続出力へ入らず、secret canaryと`additionalProperties=false`で検証できる。
- scalabilityはservice replicaやqueueの要求ではなく、公開5値・native 4 driver・4 harnessのclosed setと既存swarm input範囲へ閉じている。driver/harness追加を別Intentのschema changeとし、drop/sample/cache/plugin discoveryによる暗黙拡張を禁止している。
- reliabilityの100% targetは、有限なclosed decision-table行、同一canonical inputのdeep equality/digest、invalid stateのside effect 0、secret leakage 0、unknown stateのsuccess化0へ適用される。availability SLA、backup、multi-AZ、U-02のcrash recoveryをU-01へ要求していない。
- tech stackは既存のTypeScript ESM、Bun、`bun:test`、fast-check、現行typecheck/lint/complexity/coverage gateを維持し、runtime dependency、cloud SDK、database、daemon、別runtimeを追加しない。authored coreとgenerated projectionの既存配置境界も維持している。
