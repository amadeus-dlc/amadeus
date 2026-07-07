# Scalability Design — U4 Operation Planning And Safety

> Stage: construction / nfr-design  
> Unit: U4 Operation Planning And Safety

## Scaling Model

U4はlocal in-process pure plannerであり、horizontal scaling、queue、worker、daemonは不要である。`scalability-requirements.md` の制約は、2,000 source metadata entries、2,000 target snapshot rows、500 backup candidates、全target states/file classes の branch coverage として扱う。

## Capacity Boundaries

| Dimension | Design |
|---|---|
| Source metadata entries | normalized path keyed map と single-pass planning で2,000 entriesを処理する。 |
| Target snapshot entries | snapshot map lookupで2,000 rowsを処理する。 |
| Backup candidates | one timestamp per plan と deterministic suffix builder で500 backupsを処理する。 |
| Target states | `manifest-installed`、`manual-or-unknown`、`partial`、`none`、`unsupported-layout`、`ambiguous-harness` を明示branchにする。 |
| File classes | `owned`、`shared`、`user-preserved` を明示branchにする。 |
| Parallel invocations | shared mutable planner state を持たず、同じ入力なら同じplanを返す。 |

## State Strategy

U4で許可する状態は関数呼び出し内の短命データだけである。

- source file map;
- snapshot map;
- manifest previous file map;
- operation list;
- no-write/confirmation reason;
- operation timestamp;
- backup path suffix counter per original path.

process-wide cacheやglobal counterは持たない。

## Extension Guardrails

新しい `FileOperation` kind を追加する場合は、Reporter、Prompt、U5 Applier、manifest generation のcontract更新を必須にする。新しいtarget stateやfile classを追加する場合は、U4で apply/no-write policy とfixtureを先に定義する。

backup collision check が live filesystem read を必要とする場合でも、U4本体へfilesystem portを持ち込まず、Application Serviceまたはadapterから injected predicate として渡す。

## Deterministic Ordering

operation ordering は source metadata order を基準にする。同一fileにbackupが必要な場合、dependent update/force-update の直前にbackupを置く。plan全体のtimestampは1つに固定する。これにより、parallel invocation や同時実行時にも1plan内の出力はdeterministicになる。

## Scaling Triggers

次の条件が発生した場合は再設計対象にする。

- file count が in-memory planning の上限を超え、streamingが必要になる。
- multiple harnesses を1planで扱う。
- rollback planning をU4に追加する。
- target state class が増え、U4 policyが未定義になる。
- backup path collision が external state に強く依存する。

## Upstream Coverage

- `performance-requirements.md`: O(n) / O(n log n)、no live filesystem traversal、backup predicate制約を反映した。
- `security-requirements.md`: scaling時も unsafe operation を生成しないpolicy branchを維持する。
- `scalability-requirements.md`: capacity targets、concurrency requirements、growth guardrails を直接反映した。
- `reliability-requirements.md`: deterministic ordering、one timestamp、no-write reason をscaling modelに含めた。
- `tech-stack-decisions.md`: local Bun process、pure planner、no heavy planning framework に従う。
- `business-logic-model.md`: planning inputs、install/upgrade workflow、backup workflow を拡張境界にした。
