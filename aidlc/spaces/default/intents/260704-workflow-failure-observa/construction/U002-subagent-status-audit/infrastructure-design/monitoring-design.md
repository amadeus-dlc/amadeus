# Monitoring Design: U002-subagent-status-audit

## 上流文脈

この monitoring-design は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、stdout JSON parse と audit append failure の検証 target を定義している。

`security-design` は、message excerpt 最小化、secret 非表示、free text 非信頼を定義している。

`scalability-design` は、success、failure、unknown の 3 状態 outcome を定義している。

`reliability-design` は、old/new row compatibility と audit append failure の target を定義している。

`logical-components` は、Subagent Status Classifier と Subagent Audit Reader を分離している。

`components` は、Subagent Status と Verification Traceability の依存方向を定義している。

`services` は、Evidence Recording Service と Doctor Diagnostic Service の read/write 境界を定義している。

`business-logic-model` は、normalized outcome を Doctor Diagnostic Service が読める形にする流れを定義している。

## Observability Boundary

U002 の primary observability surface は append-only audit である。

Subagent outcome は success、failure、unknown の 3 状態に閉じる。

Outcome source は top-level `subagent_status` または top-level `status` に限定する。

Free text、transcript、last assistant message は monitoring classification source にしない。

stdout JSON command には Subagent Status の診断文を出さない。

## Metrics

| Metric | Source | Cardinality |
|---|---|---|
| subagent outcome count | Subagent Audit Reader | outcome、source |
| unknown outcome count | Subagent Status Classifier | reason |
| audit append failure count | Evidence Recording Adapter | event name |
| old row normalization count | Subagent Audit Reader | row shape |

Metric attribute は低 cardinality に限定する。

Agent id は必要最小限にし、message excerpt や transcript 全文を attribute にしない。

## Logs and Audit

`SUBAGENT_COMPLETED` event 名を維持する。

Outcome、source、evidence ref は additive field として追加する。

Old row は書き換えない。

Reader normalization は missing outcome を valid unknown として読む。

Audit append failure は `AuditWriteResult.failed` として扱う。

## Alerts and Diagnostics

U002 は external paging alert を直接設計しない。

Doctor Diagnostic Service は normalized outcome を summary として読める。

Unknown outcome が増えた場合は evidence gap として扱い、free text 推測で補完しない。

U003 は U002 evidence を read-only に読み、Requirement evidence map と PR readiness checklist へ接続する。

## Verification Design

`performance-design` に対して classification、normalization、audit field construction の fixture を確認する。

`security-design` に対して free text と `tool_input.status` が trusted source にならないことを確認する。

`scalability-design` に対して outcome が 3 状態に閉じていることを確認する。

`reliability-design` に対して old/new row compatibility と audit append failure を確認する。

`logical-components`、`components`、`services`、`business-logic-model` に対して read/write boundary と dependency direction を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:03:22Z

Iteration: 1

U002 の monitoring design は audit row と normalized outcome を中心にしており、free text 推測に依存しない。

stdout JSON 契約を壊さないため、既存 command surface と共存できる。
