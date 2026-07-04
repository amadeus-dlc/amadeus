# Unit of Work Dependency

## 上流文脈

この unit-of-work-dependency は、`components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`、`stories` を入力として作成する。

`components` は、U001、U002、U003 が所有する component 群を定義している。

`component-methods` は、Unit 間 contract になる typed interface と method group を定義している。

`services` は、全 Unit が `.agents/aidlc/tools` 内の embedded CLI/tooling module として動くことを定義している。

`component-dependency` は、Shared Contracts を基盤にし、Verification Traceability を read-only evidence consumer とする依存方向を定義している。

`decisions` は、file-backed evidence surface、OpenTelemetry no-op default、adapter-first parity、non-mutating doctor warning を採用している。

`requirements` は、R001-R009 と NFR001-NFR006 の検証条件を定義している。

`stories` は、US001-US009 と Bolt candidate を定義している。

## DAG 方針

この artifact は topology だけを扱う。

実装順、critical path、value-first、risk-first、walking skeleton first は Stage 2.8 Delivery Planning で扱う。

Unit の依存は direct dependency だけを書く。

依存辺は「A depends on B」と読む。

## Machine-readable DAG

```yaml
units:
  - name: U001-failure-evidence-foundation
    depends_on: []
  - name: U002-subagent-status-audit
    depends_on: [U001-failure-evidence-foundation]
  - name: U003-workflow-warning-traceability
    depends_on: [U001-failure-evidence-foundation, U002-subagent-status-audit]
```

## Dependency Matrix

| From | U001-failure-evidence-foundation | U002-subagent-status-audit | U003-workflow-warning-traceability |
|---|---|---|---|
| U001-failure-evidence-foundation | - | no | no |
| U002-subagent-status-audit | yes | - | no |
| U003-workflow-warning-traceability | yes | yes | - |

## Dependency Rationale

U001 は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を提供する。

U002 は、Shared Contracts と Error Audit の additive field path を使って Subagent Status を記録するため、U001 に依存する。

U003 は、Error Audit と Subagent Status の evidence を read-only で読むため、U001 と U002 に依存する。

U003 は、Verification Traceability を evidence consumer として扱うため、U001 または U002 から U003 への逆依存を作らない。

## Integration Points

| Integration point | Producer Unit | Consumer Unit | Contract |
|---|---|---|---|
| Shared diagnostic types | U001 | U002、U003 | `EvidenceRef`、`DiagnosticFinding`、`DiagnosticStatus`、`JsonStdoutContract` |
| Error audit evidence | U001 | U002、U003 | append/read adapter、`ERROR_LOGGED` field contract |
| Hook drop findings | U001 | U003 | Doctor output model and evidence ref |
| OpenTelemetry facade | U001 | U002、U003 | no-op default facade and test exporter seam |
| Subagent outcome evidence | U002 | U003 | `success`、`failure`、`unknown` outcome field |
| PR readiness evidence map | U003 | Stage 2.8 Delivery Planning and PR preparation | Requirement evidence map and checklist |

## Parallel Development Opportunities

U001 には依存がないため、DAG 上は最初に着手可能な基盤 Unit である。

U002 は U001 の Shared Contracts と Error Audit evidence path が定義されるまで blocked である。

U003 は U001 と U002 の evidence を読むため、両方が available になるまで blocked である。

この stage は実装順を決めないため、上記は topology の制約だけを表す。

Delivery Planning は、この DAG を入力として Bolt sequence を決める。

## Communication Patterns

Unit 間通信は同期的な in-process call とする。

Unit 間で network API、message broker、gRPC、shared mutable module state は使わない。

file-backed data は adapter 経由で読み書きする。

OpenTelemetry は facade 経由で呼び出し、exporter や network export を Unit 間 contract にしない。

doctor output は human-readable output として扱い、directive/report の stdout JSON contract と混同しない。

## Shared Resources

| Resource | Writer | Reader | Notes |
|---|---|---|---|
| audit shard | U001、U002 | U003 | event 名は削除または改名しない。 |
| `.aidlc-hooks-health/*.drops` | hook health surface | U001、U003 | U001 が parsing、U003 が evidence ref として扱う。 |
| `aidlc-state.md` | existing state tool | U003 | U003 は read-only で warning に使う。 |
| runtime graph | existing runtime tool | U003 | contradiction 検出に使う。 |
| Intent artifacts | stage tools | U003、Stage 2.8 | PR readiness traceability に使う。 |
| OpenTelemetry test exporter | U001 | U001、U003 | no-op default と deterministic test に使う。 |

## Cycle Check

この DAG は acyclic である。

`U001-failure-evidence-foundation` は direct dependency を持たない。

`U002-subagent-status-audit` は `U001-failure-evidence-foundation` だけに依存する。

`U003-workflow-warning-traceability` は `U001-failure-evidence-foundation` と `U002-subagent-status-audit` に依存する。

どの Unit も自分自身には依存しない。

## Traceability

| Dependency | Requirements | Stories | Design source |
|---|---|---|---|
| U002 depends on U001 | R004、R008 | US004、US008 | `component-dependency` の Subagent Status -> Error Audit |
| U003 depends on U001 | R005、R006、R007、R009 | US005、US006、US007、US009 | `component-dependency` の Verification Traceability reads Error Audit evidence |
| U003 depends on U002 | R004、R007、R009 | US004、US007、US009 | `component-dependency` の Verification Traceability reads Subagent Status evidence |
