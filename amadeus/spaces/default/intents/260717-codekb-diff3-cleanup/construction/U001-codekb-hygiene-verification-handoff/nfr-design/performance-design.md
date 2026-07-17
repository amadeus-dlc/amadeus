# Performance Design — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Design Goal

`performance-requirements.md` の12/12 field completenessを、`business-logic-model.md` のW1〜W9へ沿うbounded local pipelineで実現する。`scalability-requirements.md` の`O(N)`条件、`reliability-requirements.md` のsame-ref repeatability、`security-requirements.md` のsame-SHA integrityを同時に守る。`tech-stack-decisions.md`どおり既存Git / local text scanだけを使い、新規runtimeを追加しない。

## Processing Pipeline

| Step | Input | Processing | Output | Completion invariant |
|---|---|---|---|---|
| P1 Resolve | explicit ref | Gitでfull SHAへ解決 | `MeasurementRef` | ref + full SHAが1組 |
| P2 Read | P1、固定2 path | 同一SHAのblobを取得 | 2 immutable texts | path欠落0 |
| P3 Scan markers | 2 texts | 各行を4語彙へ有限回照合 | 8 counts + matches | 8/8 fields |
| P4 Scan headings | 2 texts | latest / history260715を計数 | 4 counts | 4/4 fields |
| P5 Aggregate | P1、P3、P4 | 同一SHA整合を確認してtuple化 | 12-count evidence set | mixed SHA 0 |

P3とP4は同じtextを利用してもよいが、cacheの永続化やcross-ref共有は行わない。実装はexactly one passを要求せず、`O(N)`の有限回走査であることとunbounded rescan 0件だけを要求する。

## Optimization Decisions

| Pattern | Decision | Rationale |
|---|---|---|
| Cache | 不採用 | ref別immutable setは小さく、stale / mixed-ref riskを増やす |
| Async / queue | 不採用 | 固定2 pathの同期local scanで十分 |
| Resource pool | 不採用 | connection / worker resourceが存在しない |
| CDN / pagination / lazy loading | 非該当 | UI / network / collection APIがない |
| Parallel path scan | optional implementation detail | 結果順・same-SHA invariantを崩さない場合だけ許容、要求はしない |

## Performance Budget and Validation

時間budgetはbaselineがないため設けない。Design budgetは次のexact conditionである。

- Required fields: 12/12。
- Target paths: 2/2。
- Marker vocabularies: 4/4 per path。
- Heading categories: 2/2 per path。
- Mixed-ref fields: 0。
- Partial result promoted: 0。
- Remote calls / added dependencies: 0。

同一SHA / commandの再実行はtuple equalityを比較する。ref変更時は旧setを更新せず、新しい12-field setを生成する。

## Failure Behavior

P1〜P5のどこかが失敗した場合、partial tupleを返さず`stop`とする。処理を再開するときは明示refから新しいcomplete setを作る。performance理由でpath、vocabulary、heading category、audit fieldを省略しない。
