# Reliability Design: U001-failure-evidence-foundation

## 上流文脈

この reliability-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、error evidence、hook drop summary、doctor output の処理予算を定義している。

`security-requirements` は、secret 非表示、append-only audit、no-op default を定義している。

`scalability-requirements` は、malformed input と large history に対する degradation policy を定義している。

`reliability-requirements` は、REL001 から REL007 までの failure path と検証条件を定義している。

`tech-stack-decisions` は、Telemetry Facade、標準 file API、deterministic fixture を使う判断を定義している。

`business-logic-model` は、audit append failure、`.drops` missing、malformed drops、telemetry failure の判断木を定義している。

## Reliability Architecture

| Failure mode | Design | Target |
|---|---|---|
| error directive | active workflow がある場合だけ `ERROR_LOGGED` を append する。 | REL001 |
| top-level catch | error directive と同じ field contract で記録する。 | REL001 |
| audit append failure | 再帰的 audit write を試みず、既存 error envelope を維持する。 | REL002 |
| missing `.drops` directory | empty summary として doctor を続行する。 | REL003 |
| malformed drops file | warning finding に変換し、残りの checks を続行する。 | REL004 |
| OpenTelemetry unconfigured | no-op default で command を正常終了させる。 | REL005 |
| telemetry recording failure | stdout JSON contract を壊さない。 | REL006 |
| doctor standard output | warning の有無に関わらず human-readable output を返す。 | REL007 |

## Fault Isolation

Error Audit の failure は Hook Drop Doctor を壊さない。

Hook Drop Doctor の malformed input は Telemetry Core を壊さない。

Telemetry Core の exporter failure は stdout JSON と audit append を壊さない。

Doctor Composition は verbose detail の失敗を standard summary へ波及させない。

## Recovery Design

Audit append failure は command failure として表面化し、追加の audit write を行わない。

Hook drop parse failure は file path と latest reason を持つ warning finding に変換する。

Telemetry failure は command の主処理を失敗させない。

Exporter 設定が壊れている場合でも、no-op facade へ戻せる設計にする。

## SLO Design

U001 は外部 SLA を持つ service ではない。

PR readiness までに deterministic U001 test pass rate を 100% にする。

stdout JSON parse success は covered directive/report fixtures で 100% にする。

no-op default no-send success は telemetry-unconfigured fixtures で 100% にする。

doctor no-crash result は missing and malformed drops fixtures で 100% にする。

## Verification Design

error directive と top-level catch の audit fixture で REL001 を確認する。

audit failure fixture で REL002 を確認する。

missing directory fixture で REL003 を確認する。

malformed drops fixture で REL004 を確認する。

no-send fixture で REL005 を確認する。

JSON parse fixture で REL006 を確認する。

doctor output assertion で REL007 を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Reliability design は failure path ごとの隔離と復旧方針を定義している。

外部 service availability を誤って定義せず、local CLI tooling の信頼性に絞っている。
