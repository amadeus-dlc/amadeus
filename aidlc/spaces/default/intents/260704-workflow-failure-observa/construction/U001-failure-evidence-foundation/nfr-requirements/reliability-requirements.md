# Reliability Requirements: U001-failure-evidence-foundation

## 上流文脈

この reliability-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の failure handling を定義している。

`business-rules` は、audit write failure の非再帰、malformed drops no-crash、no-op default、stdout JSON 非干渉を不変条件としている。

`requirements` は、R001、R002、R003、R007、R008、NFR001、NFR002、NFR003、NFR005、NFR006 を定義している。

## Reliability Targets

| ID | Target | Verification |
|---|---|---|
| REL001 | error directive と top-level catch の deterministic fixture は、active workflow がある場合に `ERROR_LOGGED` を残す。 | audit fixture |
| REL002 | audit append が失敗しても、error emission は再帰せず既存 error envelope を返す。 | audit failure fixture |
| REL003 | `.drops` directory が存在しない場合、doctor は no hook drop warning として続行する。 | missing directory fixture |
| REL004 | malformed drops file がある場合、doctor は warning を出し、残りの checks を続行する。 | malformed drops fixture |
| REL005 | OpenTelemetry exporter 未設定の場合、command は no-op default で正常終了する。 | no-send fixture |
| REL006 | telemetry recording failure は stdout JSON contract を壊さない。 | JSON parse fixture |
| REL007 | standard doctor output は warning の有無に関わらず human-readable output として返る。 | output assertion |

## SLI and SLO

| SLI | SLO | Measurement window |
|---|---|---|
| deterministic U001 test pass rate | 100% before PR readiness | PR preparation |
| stdout JSON parse success | 100% for covered directive/report fixtures | PR preparation |
| no-op default no-send success | 100% for telemetry-unconfigured fixtures | PR preparation |
| doctor no-crash result | 100% for missing and malformed drops fixtures | PR preparation |

U001 は外部 SLA を持つ service ではないため、availability percentage は定義しない。

代わりに、PR readiness までに deterministic verification がすべて pass することを SLO とする。

## Recovery Requirements

audit append failure は command failure として表面化し、追加の audit write を再帰しない。

hook drop parse failure は warning finding へ変換し、手動修復用に file path と latest reason を残す。

telemetry failure は command の主処理を失敗させない。

OpenTelemetry exporter 設定が壊れている場合でも default no-op に戻せる設計にする。

## Fault Isolation

Error Audit の failure は Hook Drop Doctor を壊さない。

Hook Drop Doctor の malformed input は Telemetry Core を壊さない。

Telemetry Core の exporter failure は stdout JSON と audit append を壊さない。

Doctor Composition は verbose detail の失敗を standard summary へ波及させない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Reliability target は failure path ごとに検証可能である。

外部 service availability を誤って定義せず、local CLI tooling の信頼性に絞っている。
