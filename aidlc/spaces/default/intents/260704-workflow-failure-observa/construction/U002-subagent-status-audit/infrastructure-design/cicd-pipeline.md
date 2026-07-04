# CI/CD Pipeline: U002-subagent-status-audit

## 上流文脈

この cicd-pipeline は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、success/failure/missing/untrusted fixture、old/new row matrix、stdout JSON parse、audit append failure fixture を定義している。

`security-design` は、free text と `tool_input.status` を classification source にしない検証を定義している。

`scalability-design` は、1000 rows normalization と 3 状態 outcome の検証を定義している。

`reliability-design` は、REL001 から REL008 までの fixture target を定義している。

`logical-components` は、Subagent Status Classifier、Audit Field Builder、Audit Reader、Evidence Recording Adapter の verification mapping を定義している。

`components` は、Subagent Status の component ownership を定義している。

`services` は、Evidence Recording Service と Doctor Diagnostic Service の service boundary を定義している。

`business-logic-model` は、trusted source、allowlist、additive fields、old row compatibility を定義している。

## Pipeline Shape

U002 の pipeline は PR verification pipeline である。

Cloud deployment、staging deploy、production deploy は含めない。

IaC scan は U002 の必須 gate にしない。

理由は U002 が cloud resource と IaC を追加しないためである。

## Verification Stages

| Stage | Check | Failure action |
|---|---|---|
| Type check | `SubagentOutcome`、allowlist、audit fields の型整合性を確認する。 | PR を止める。 |
| Classification fixture | success、failure、missing status、untrusted field を確認する。 | PR を止める。 |
| Old/new row matrix | missing outcome を valid unknown として読めることを確認する。 | PR を止める。 |
| Additive field fixture | `SUBAGENT_COMPLETED` event 名維持と additive field を確認する。 | PR を止める。 |
| JSON stdout | Subagent Status path が stdout JSON command を汚染しないことを確認する。 | PR を止める。 |
| Audit failure fixture | `AuditWriteResult.failed` を返し、`.drops` を所有しないことを確認する。 | PR を止める。 |
| Validator | Amadeus validator を intent に対して実行する。 | PR を止める。 |

## Security Gates

Free text、transcript、last assistant message から outcome を推測しないことを確認する。

`tool_input.status` が trusted source にならないことを確認する。

Message excerpt が最小化され、secret、token、full stack trace を出さないことを確認する。

`skills/` と `.coderabbit.yml` または `.coderabbit.yaml` が変更されていないことを diff inspection で確認する。

## Rollback and Recovery

Rollback は PR revert または follow-up fix で扱う。

Event 名を壊した場合は audit taxonomy diff と additive field fixture で検出する。

Old row compatibility を壊した場合は old/new row matrix で検出する。

Unknown fallback を壊した場合は missing/untrusted status fixture で検出する。

## Artifact Management

Build artifact は source diff と test result である。

Container image、deployment package、CloudFormation template は作らない。

PR readiness では Issue、Intent、Requirement、test result、validator、parity、stdout JSON を evidence とする。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:03:22Z

Iteration: 1

U002 の CI/CD pipeline は implementation risk を fixture matrix へ落としている。

Cloud deployment を要求せず、Subagent Status の分類と audit compatibility を検証できる。
