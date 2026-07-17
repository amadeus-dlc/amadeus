# Scalability Requirements — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Applicability and Capacity Model

`business-logic-model.md` のworkloadは固定2 Markdown pathのlocal scanであり、`requirements.md` はruntime、service、database、AWS infrastructureの変更を禁止する。`technology-stack.md` の既存Git / Bun実行面を維持し、`business-rules.md` の対象集合を拡張しない。

従ってrequests per second、concurrent users、storage growth、6か月 / 12か月capacity、auto-scaling trigger、monthly cloud costは非該当である。bounded verification workloadへ架空のhorizontal scalingを設計しない。

## Testable Requirements

### NFR-SCALE-1: Fixed logical cardinality

1 evidence setのlogical cardinalityは次で固定する。

- Target paths: 2。
- Marker vocabulary: pathごとに4。
- Heading categories: pathごとに2。
- Ancestry verdict: 1。

path / vocabulary / headingを暗黙に増減せず、上流要件が変わった場合だけ別versionのcontractとして再設計する。

### NFR-SCALE-2: Linear input growth

対象2 fileの総行数を`N`としたとき、content scanは`O(N)`、保持する一致診断は`O(M)`（`M`はmarker一致行数）とする。file size増加に対して全組合せ探索、network fan-out、unbounded retryを導入しない。

### NFR-SCALE-3: Evidence-set isolation

複数refを評価するときはrefごとにimmutableなevidence setを生成する。並列実行の有無にかかわらず、異なるSHAのcounts、CI、review、gate provenanceを同一aggregateへ混在させない。共有mutable cacheやdistributed lockは追加しない。

## Scaling and Degradation Policy

| Condition | Response | Not allowed |
|---|---|---|
| File line count増加 | 同じlinear full scanを実行 | sampling、first-match-only |
| Scan interruption | complete setを新規再実行 | partial結果のgate-ready化 |
| Ref数増加 | refごとの独立setとして直列または安全に並列処理 | ref間field混在 |
| Repository service unavailable | local refが解決不能ならstop | remote resultの推測 |
| Resource pressure | fail-fastして再実行 | 検証語彙 / path削減 |

Loadに応じて品質を落とすgraceful degradationは許可しない。全数性を保てない場合は結果を返さずfail-closedとする。

## Capacity Validation

Build and Testでは、固定cardinality（2 / 4 / 2 / 1）、全field実在、同一SHAの参照、line countに対するlinear boundednessとunbounded rescan 0件をread-onlyに検査する。exactly one passは要求せず、各行を有限回評価する実装自由度を保つ。production-like load test、spike / soak test、multi-region capacity testはdeployable workloadがないため非該当である。
