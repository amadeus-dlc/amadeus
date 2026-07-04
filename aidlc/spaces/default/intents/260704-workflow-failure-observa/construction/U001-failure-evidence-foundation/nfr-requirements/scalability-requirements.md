# Scalability Requirements: U001-failure-evidence-foundation

## 上流文脈

この scalability-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Hook Drop Doctor が `.aidlc-hooks-health/*.drops` を summary に変換し、Telemetry Core が no-op default と test exporter seam を提供する処理を定義している。

`business-rules` は、full history を standard output に混ぜないこと、OpenTelemetry default no-op、adapter または wrapper first の parity 方針を定義している。

`requirements` は、R002、R003、R006、R007、NFR002、NFR003、NFR006 を定義している。

## Capacity Targets

| ID | Capacity target | Measurement |
|---|---|---|
| SCALE001 | `.drops` file 100 files、各 100 lines まで standard summary を生成できる。 | fixture test |
| SCALE002 | malformed entry が全体の 10% まで混在しても doctor は summary と warning を返す。 | malformed fixture |
| SCALE003 | OpenTelemetry no-op default は command 数に比例する O(1) setup で動き、global exporter state を command ごとに増やさない。 | unit test and memory assertion |
| SCALE004 | directive/report span correlation は command pair 単位で表現し、workflow 全体の graph を memory に保持しない。 | trace attribute fixture |
| SCALE005 | audit evidence は append-only file surface に残し、U003 の traceability が read-only に集約する。 | integration fixture |

## Growth Model

U001 は local CLI tooling であり、horizontal scaling は対象外である。

成長対象は command 実行回数、audit row 数、`.drops` file 数、doctor の inspection surface である。

standard doctor output は常に summary を返し、large history は verbose detail に分離する。

## Scaling Triggers

| Signal | Trigger | Required response |
|---|---|---|
| doctor summary が 1000ms p95 を超える | `.drops` files または audit read が増えた | summary aggregation を streaming または bounded read にする |
| standard output が scan しにくい | hook count または warning count が増えた | section grouping と count summary を優先する |
| telemetry attributes が増えすぎる | trace payload が大きくなる | low-cardinality attribute へ制限する |
| parity failure が増える | locked file 変更が増えた | adapter または wrapper first を再評価する |

## Degradation Policy

doctor は malformed `.drops` entry を warning にし、他の checks を続行する。

OpenTelemetry failure は command stdout JSON contract を壊さない。

audit append failure は再帰的 error audit を起こさず、既存 error envelope を維持する。

verbose detail が重い場合でも standard summary は先に返せる設計にする。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Scalability target は local file-backed evidence surface の増加に限定されている。

cloud scaling、message broker、database sharding はこの Unit の対象外として正しく除外されている。
