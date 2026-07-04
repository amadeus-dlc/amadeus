# Frontend Components: U001-failure-evidence-foundation

## 上流文脈

この frontend-components は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U001 は browser frontend を含まない。

ただし `requirements` と `components` は Maintainer、Agent、Reviewer が読む doctor standard output、error envelope、telemetry status を利用者向け表現として扱う。

そのため、この artifact は UI ではなく CLI output component と PR readiness へ渡す表示部品を定義する。

## Component Hierarchy

| Component | Parent | Purpose |
|---|---|---|
| `DoctorStandardOutput` | root | doctor の標準表示を構成する。 |
| `DoctorHookDropSection` | `DoctorStandardOutput` | hook name、drop count、latest timestamp、latest reason を表示する。 |
| `DoctorTelemetrySection` | `DoctorStandardOutput` | OpenTelemetry no-op default または configured 状態を表示する。 |
| `DoctorErrorEvidenceSection` | `DoctorStandardOutput` | `ERROR_LOGGED` evidence の存在を要約する。 |
| `DoctorVerboseDetail` | root | full drop history、parse warning detail、evidence refs を表示する。 |
| `JsonErrorEnvelope` | root | JSON stdout 契約外の stderr または error envelope を表す。 |

## Props and State

| Component | Inputs | State |
|---|---|---|
| `DoctorHookDropSection` | `HookDropSummary[]` | empty、warning-present、malformed-present |
| `DoctorTelemetrySection` | telemetry mode、exporter configured flag | no-op、test-exporter、configured |
| `DoctorErrorEvidenceSection` | `EvidenceRef[]` | absent、present、audit-failed |
| `DoctorVerboseDetail` | `HookDropEntry[]`、parse warnings | hidden、expanded |
| `JsonErrorEnvelope` | error code、message、request context | emitted |

## Interaction Flow

Maintainer は doctor を実行する。

doctor は `DoctorStandardOutput` を表示する。

hook drop がある場合、Maintainer は hook name、count、latest reason を標準表示で読む。

詳細が必要な場合だけ verbose option で `DoctorVerboseDetail` を読む。

JSON stdout command の利用者は `JsonErrorEnvelope` または directive/report JSON を parse する。

telemetry diagnostics は stdout JSON に混ざらない。

## Validation Rules

標準表示は concise に保つ。

verbose detail は標準表示と分ける。

OpenTelemetry collector、dashboard、cloud export の設定手順は表示しない。

no-op default の状態は、利用者が外部送信なしと判断できる文言にする。

malformed drops file は hard error ではなく warning として表示する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

browser frontend がない Unit であるため、CLI output component として整理している。

doctor の human-readable output と directive/report の JSON stdout contract は分離されている。
