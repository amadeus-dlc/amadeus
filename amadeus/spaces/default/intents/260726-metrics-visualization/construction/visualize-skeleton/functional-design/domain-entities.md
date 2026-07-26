# Domain Entities — U1 visualize-skeleton

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## 既存型(import — 再定義禁止)

| 型 | 正本 | 用途 |
|---|---|---|
| `Snapshot` | scripts/metrics-timeseries.ts:25 | 検証済みスナップショット(schema_version 1 / captured_at / commit / collectors) |
| `CollectorEntry` | 同 :20 | tool / tool_version / values(値は unknown のまま — parse-don't-validate の境界) |
| `ParseOutcome` | 同 :32 | parseSnapshot の判別 union(ok / error) |
| `NonEmpty` | 同 :36 | 空集合の loud 化 |

## U1 で新設する内部構造(metrics-visualize.ts ローカル)

| 構造 | 形 | 意図 |
|---|---|---|
| `ArgsOutcome` | `{kind:"ok"; mode:"write"} \| {kind:"usage"; reason:string}` | CLI 引数の判別 union(兄弟型 metrics-timeseries.ts:167 / metrics-retention.ts:35 と同型の reason 付き usage 分岐。U2 で mode に "check" が加わる拡張点) |
| チャート点列 | `Array<number \| null>`(名前付き型は作らない) | numericValue 適用済みの座標入力。null = 欠測。svgLinePath の引数型そのもの(component-methods.md) |

- 新しいドメイン型・ブランド型は作らない(components.md の近傍スタイル方針 — 既存 metrics 群の裸純関数+判別 union 様式)。プリミティブを包む判断ノルム(不変条件を変えるときだけ包む)に照らし、包むべき不変条件が発生しない

## R-1 追加シンボル(metrics-timeseries.ts)

| シンボル | シグネチャ | 状態 |
|---|---|---|
| `formatValue` | `(v: unknown) => string` | 既存 :117-119 の export 昇格(実装不変) |
| `numericValue` | `(v: unknown) => number \| null` | 新設(有限 number のみ通す) |
