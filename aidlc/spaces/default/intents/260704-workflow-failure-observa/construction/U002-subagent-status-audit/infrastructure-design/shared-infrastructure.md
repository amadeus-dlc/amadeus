# Shared Infrastructure: U002-subagent-status-audit

## 上流文脈

この shared-infrastructure は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、classification、normalization、audit field construction の shared processing budget を定義している。

`security-design` は、trusted source、additive field、old row compatibility、stdout JSON 非干渉を定義している。

`scalability-design` は、U003 が U002 evidence を read-only に読む境界を定義している。

`reliability-design` は、success、failure、unknown、old/new row、audit append failure の target を定義している。

`logical-components` は、Subagent Status の classifier、field builder、reader、adapter を定義している。

`components` は、Shared Contracts、Subagent Status、Verification Traceability の関係を定義している。

`services` は、Evidence Recording Service、Doctor Diagnostic Service、Verification Traceability Service の関係を定義している。

`business-logic-model` は、U002 が U003 を呼ばず、U003 が U002 evidence を read-only に読むことを定義している。

## Shared Resource Inventory

| Shared surface | Used by | Ownership |
|---|---|---|
| Shared Contracts | U001、U002、U003 | common typed contract |
| `SUBAGENT_COMPLETED` audit row | U002、U003 | Evidence Recording Service |
| Subagent outcome allowlist | U002 | Subagent Status Classifier |
| Normalized outcome reader | U002、U003 | Subagent Audit Reader |
| Intent record artifacts | all construction units | AI-DLC workflow record |

## Cross-Unit Boundaries

U001 は Shared Contracts と Error Audit evidence path を提供する。

U002 は Subagent Status の audit evidence を追加する。

U003 は U002 の normalized evidence を read-only に読む。

U002 から U003 を呼ばない。

U003 から U002 の write path を呼ばない。

## Access and Isolation

Shared Contracts は file I/O を持たない。

`SUBAGENT_COMPLETED` の event 名は維持する。

Outcome、source、evidence ref は additive field にする。

Old row は migration で書き換えない。

Subagent Status は `.aidlc-hooks-health/*.drops` への書き込みを所有しない。

## Shared Infrastructure Non-Goals

Shared database は作らない。

Shared queue は作らない。

Shared cache は作らない。

Shared VPC、subnet、security group は作らない。

Collector、dashboard、cloud export infrastructure は U002 の shared required resource にしない。

`skills/` direct edits と unauthorized `.coderabbit.yml` または `.coderabbit.yaml` changes は shared infrastructure に含めない。

## Verification Design

`performance-design` に対して shared outcome reader が 1000 rows fixture で動くことを確認する。

`security-design` に対して untrusted source が outcome source にならないことを確認する。

`scalability-design` に対して U003 が U002 evidence を read-only に集約できることを確認する。

`reliability-design` に対して old/new row compatibility と audit append failure の隔離を確認する。

`logical-components`、`components`、`services`、`business-logic-model` に対して cross-unit dependency が片方向であることを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:03:22Z

Iteration: 1

U002 の shared infrastructure は audit evidence と normalized reader の共有面に限定されている。

U003 への依存方向は read-only であり、循環依存はない。
