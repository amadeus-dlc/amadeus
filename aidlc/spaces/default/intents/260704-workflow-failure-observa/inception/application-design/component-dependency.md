# Component Dependency

## 上流文脈

この component dependency は、`requirements`、`stories`、`team-practices` を入力として作成する。

`requirements` は、audit、doctor、OpenTelemetry core、subagent status、conductor warning、verification、parity、PR readiness の依存関係を定義している。

`stories` は、B001、B002、B003 の候補と story の順序を定義している。

`team-practices` は、first Bolt と deterministic test posture を定義している。

`architecture` と `component-inventory` は brownfield 時の任意入力であり、既存依存が確認できる場合はこの matrix の具体 path に写像する。

## Dependency 方針

依存は能力境界の間だけに置く。

Shared Contracts への依存は許可する。

Doctor Composition は個別 diagnostic component に依存する。

個別 diagnostic component は Doctor Composition に依存しない。

Telemetry Core は各 component から呼ばれるが、business logic を所有しない。

audit と file I/O は adapter を通して扱う。

Verification Traceability は evidence の read-only consumer とし、Error Audit と Subagent Status から呼ばれない。

## Dependency Matrix

| From | Shared Contracts | Error Audit | Hook Drop Doctor | Telemetry Core | Subagent Status | Conductor Warning | Verification Traceability | Doctor Composition |
|---|---|---|---|---|---|---|---|---|
| Shared Contracts | - | no | no | no | no | no | no | no |
| Error Audit | yes | - | no | yes | no | no | no | no |
| Hook Drop Doctor | yes | no | - | yes | no | no | no | no |
| Telemetry Core | yes | no | no | - | no | no | no | no |
| Subagent Status | yes | yes | no | yes | - | no | no | no |
| Conductor Warning | yes | no | no | yes | no | - | no | no |
| Verification Traceability | yes | yes | no | no | yes | yes | - | no |
| Doctor Composition | yes | yes | yes | yes | yes | yes | yes | - |

## Data Flow

```text
CLI command
  -> Shared Contracts
  -> Error Audit
  -> Telemetry Core
  -> stdout or JSON output

doctor
  -> Hook Drop Doctor
  -> Error Audit read adapter
  -> Subagent Status
  -> Conductor Warning
  -> Telemetry Core metrics
  -> Doctor Composition
  -> human-readable output

PR readiness
  -> Verification Traceability
  -> Error Audit read adapter as read-only evidence
  -> Subagent Status evidence as read-only evidence
  -> parity evidence
  -> Intent artifact
```

Text fallback: CLI command は audit と telemetry を adapter 経由で呼び、doctor は各 diagnostic component の finding を Doctor Composition がまとめる。

## Shared Resources

| Resource | Owner | Access pattern | Notes |
|---|---|---|---|
| audit shard | Evidence Recording Service | append and read adapter | event 名は削除または改名しない。 |
| `aidlc-state.md` | existing state tool | read-only from doctor warning | doctor は state を変更しない。 |
| runtime graph | existing runtime tool | read-only from conductor warning | contradiction 検出に使う。 |
| `.aidlc-hooks-health/*.drops` | hook health surface | read-only from Hook Drop Doctor | malformed file は warning にする。 |
| Intent artifacts | workflow record | read/write by stage tools | PR readiness と verification evidence を残す。 |
| OpenTelemetry test exporter | Telemetry Core | in-memory/test only | default は no-op で network export しない。 |

## Communication Patterns

component 間の通信は同期的な in-process call とする。

network call は使わない。

message broker は使わない。

gRPC は使わない。

shared mutable module state は使わない。

side effect は adapter の背後に置く。

## Acyclic Dependency Rule

Shared Contracts は他 component に依存しない。

Telemetry Core は Shared Contracts 以外に依存しない。

Doctor Composition は leaf component から finding を受け取る。

leaf component が Doctor Composition を呼ばないことで循環依存を避ける。

Verification Traceability は evidence を読むが、CI 実行や merge 判断は所有しない。

Error Audit と Subagent Status は Verification Traceability に依存しない。

Verification Traceability が Error Audit と Subagent Status の evidence を読むため、依存方向は traceability 側から evidence source 側だけにする。

## Bolt Dependency

| Bolt candidate | Components | Dependency reason |
|---|---|---|
| B001 | Shared Contracts, Error Audit, Hook Drop Doctor, Telemetry Core, Doctor Composition | 最初の縦断 slice で error audit、hook drop doctor、OpenTelemetry no-op default を同時に確認する。 |
| B002 | Subagent Status, Error Audit | `SUBAGENT_COMPLETED` status と audit taxonomy compatibility を扱う。 |
| B003 | Verification Traceability, Conductor Warning, Doctor Composition | read-only evidence traceability、conductor-independent warning、PR readiness traceability を扱う。 |

## Boundary Constraints

`skills/` direct edits は依存関係に含めない。

`.coderabbit.yml` または `.coderabbit.yaml` の変更は依存関係に含めない。

collector、dashboard、cloud infrastructure は依存関係に含めない。

`engineFileExceptions` は明示承認なしに依存設計へ含めない。

## Traceability

| Dependency area | Requirements | Stories |
|---|---|---|
| Error Audit -> Telemetry Core | R001, R003 | US001, US003 |
| Hook Drop Doctor -> Doctor Composition | R002 | US002 |
| Subagent Status -> Error Audit | R004, R008 | US004, US008 |
| Conductor Warning -> Doctor Composition | R005 | US005 |
| Verification Traceability reads Error Audit/Subagent Status evidence | R006, R007, R009 | US006, US007, US009 |
