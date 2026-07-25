# Performance Design: grant-authorization-domain

## Inputs and Design Goal

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を入力とする。新indexなしでU1-PERF-01–04を満たす。

## One-pass Algorithms

- audit parserは各eventを1回visitし、Grant Id別issue cardinality、revoked set、Route Id receipt matchesを同一passで集約する。
- candidate選択は全候補sortをせず、完全比較関数でcurrent bestを更新する。比較回数はcandidate 0件なら0、G件なら最大`G - 1`。
- Route Id ownership lookupはspaceのregistry rowを決定順で列挙し、全shardを1回scanする。exactly-one確認のため最初のmatchで早期returnしない。
- commitはworkspace outer lock内のspace-wide receipt lookup passでownerを確定する。その後owner inner lockを取得し、owner auditだけをrevalidation passとして再読する。space全体は再scanしないが、owner auditの再読はrevoke TOCTOUを閉じるため必須とする。

## End-to-end Scan Instrumentation

space audit reader、block parser、pure queryが同じtest-only observer instanceを共有し、counterへpass label `receipt-lookup`または`owner-revalidation`を付ける。

- filesystem adapter: shardをopenした時だけpass別`shardOpened`を1増加し、同一passで同じcanonical shard pathを2回openしたらtest assertionを失敗させる。
- audit block parser: valid/invalidを問わず1 blockをdecodeした境界でpass別`eventVisited`を正確に1増加する。
- pure projector/resolver: 渡されたparsed eventを再countせず、`candidateCompared`と`memoryItemAdded`だけを増加する。

未指定時はno-op observerとしproduction永続metricsを追加しない。U1-PERF-02はreceipt lookup passについて`eventVisited === E`、`shardOpened === fixture全shard数`、同一pass duplicate canonical path 0をassertする。commit fixtureは追加でowner revalidation passの`eventVisited === E_owner`、`shardOpened === owner shard数`、同一pass duplicate 0をassertする。総visit上限は`E + E_owner`である。E/G fixture系列と100,000 event wall-clock smokeを分離し、漸近退行はcounterで判定する。

## Resource Budget

projection map/setはevent数に線形、candidate配列は最大Gとする。persistent cache、daemon、worker pool、async queueを追加しない。team modeはsolo queryへdispatchする前にbranchし、solo/space-wide scan counterを0に保つ。

## Verification Mapping

| Target | Design seam | Test |
|---|---|---|
| U1-PERF-01 | one-pass projection observer | E系列counter |
| U1-PERF-02 | pass-labeled observer付きspace lookup + locked owner revalidation | receipt `E` + owner `E_owner`、pass内shard重複open 0 |
| U1-PERF-03 | one-pass best selection | G系列comparator counter |
| U1-PERF-04 | mode-before-query dispatch | team spy/golden |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:27:49Z
- **Iteration:** 1
- **Scope decision:** none

workspace→owner順序、typed fallback差分0、競合結果、team隔離は概ね設計済みだが、route append排他、性能計測境界、component ownerが未確定。

### Findings

- BLOCKER: routeはworkspace→route-owner両lock取得後raw appendする単一契約とbarrier fixtureが必要。
- MAJOR: adapter/parser/pure resolverのevent counter increment境界を一意に定義し重複scanを検出すること。
- MAJOR: 各logical componentへ単一owner path、入出力型、pure import directionを割り当てること。
- CONFIRMED: commit TOCTOU、typed fallback、team isolationは妥当。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:33:07Z
- **Iteration:** 2
- **Scope decision:** none

前回3指摘は解消されたが、space-wide snapshot再利用とowner lock後のlatest grant再検証が両立せずrevokeを見落とす余地がある。

### Findings

- BLOCKER: receipt lookup pass後、owner inner lock取得後にowner auditを再読する明示algorithmへ変更し、性能counterをpass別に定義すること。
- RESOLVED: route両lock/raw append、end-to-end counters、single owners/import direction。
- CONFIRMED: typed fallback、team baseline。
