# Logical Components: U002-subagent-status-audit

## 上流文脈

この logical-components は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、classification、normalization、audit field construction の予算を定義している。

`security-requirements` は、trusted source、additive field、old row compatibility、stdout JSON 非干渉を定義している。

`scalability-requirements` は、field allowlist、3 状態 outcome、U003 read-only consumer の境界を定義している。

`reliability-requirements` は、success、failure、unknown、old/new row、audit append failure の target を定義している。

`tech-stack-decisions` は、TypeScript、shared contract、pure helper、reader normalization、既存 audit adapter を採用する判断を定義している。

`business-logic-model` は、Subagent hook payload、Subagent outcome、`SUBAGENT_COMPLETED` audit row、normalized outcome の data flow を定義している。

## Component Inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| Shared Contracts | `SubagentOutcome`、status allowlist、evidence ref を提供する。 | type and contract |
| Subagent Status Classifier | hook payload から success、failure、unknown を分類する。 | payload classification |
| Subagent Audit Field Builder | outcome、source、evidence ref を additive audit fields にする。 | audit field construction |
| Subagent Audit Reader | old row と new row を normalized outcome に変換する。 | compatibility read |
| Evidence Recording Adapter | `SUBAGENT_COMPLETED` audit row を append-only に記録する。 | audit append |

## Component Boundaries

Shared Contracts は file I/O を持たない。

Subagent Status Classifier は message text、transcript、last assistant message を読まない。

Subagent Audit Field Builder は event 名を変更しない。

Subagent Audit Reader は old row を書き換えない。

Evidence Recording Adapter は `.aidlc-hooks-health/*.drops` への書き込みを所有しない。

## Interaction Model

Hook integration は parse 済み hook payload を Subagent Status Classifier へ渡す。

Subagent Status Classifier は trusted source と outcome を返す。

Subagent Audit Field Builder は outcome、source、agent type、必要最小限の agent id、evidence ref を audit fields に変換する。

Evidence Recording Adapter は `SUBAGENT_COMPLETED` の additive field を append-only audit へ渡す。

Subagent Audit Reader は old row と new row を同じ normalized shape にする。

U003 は normalized evidence を read-only に読む。

## Blast Radius

| Failure | Containment |
|---|---|
| missing trustworthy status | unknown outcome に限定する。 |
| unexpected status value | unknown outcome に限定する。 |
| untrusted `tool_input.status` | classification source から除外する。 |
| audit append failure | `AuditWriteResult.failed` を返す。 |
| old row missing outcome | reader normalization で unknown にする。 |

## Infrastructure Bridge

Infrastructure Design へ渡す component は、cloud resource ではなく CLI 内 logical component である。

新しい AWS service、database、message broker、container orchestration は必要ない。

OpenTelemetry package の追加判断は U001 が所有する。

U002 は既存 TypeScript と audit adapter の範囲で閉じる。

## Verification Mapping

| Component | Verification |
|---|---|
| Shared Contracts | typecheck and fixture review |
| Subagent Status Classifier | success、failure、missing status、untrusted field fixture |
| Subagent Audit Field Builder | additive field construction test |
| Subagent Audit Reader | old/new row matrix |
| Evidence Recording Adapter | audit append failure fixture |

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Logical components は Subagent Status の分類、記録、互換読み取りを分けている。

U003 への依存は read-only evidence に限定され、逆呼び出しを作っていない。
