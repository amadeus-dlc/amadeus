# Infrastructure Services: U002-subagent-status-audit

## 上流文脈

この infrastructure-services は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、classification、normalization、audit field construction の予算を定義している。

`security-design` は、free text を trusted source にしないことと additive audit field を定義している。

`scalability-design` は、event 名を増やさず reader を調整する方針を定義している。

`reliability-design` は、unexpected status value を unknown に寄せる方針を定義している。

`logical-components` は、Shared Contracts、Subagent Status Classifier、Subagent Audit Field Builder、Subagent Audit Reader、Evidence Recording Adapter を定義している。

`components` は、Subagent Status を Shared Contracts と Evidence Recording Service に接続する。

`services` は、Evidence Recording Service と Doctor Diagnostic Service の責務を定義している。

`business-logic-model` は、`SubagentOutcome` を `SUBAGENT_COMPLETED` additive fields に変換する流れを定義している。

## Service Selection

U002 は database、cache、message queue、search service、CDN、DNS、load balancer を新設しない。

必要な service surface は、hook payload、append-only audit、reader normalization、shared contract である。

| Service surface | 役割 | Infrastructure decision |
|---|---|---|
| Hook payload surface | parse 済み `SubagentStop` payload を渡す。 | 既存 hook integration を使う。 |
| Append-only audit | `SUBAGENT_COMPLETED` の additive field を保存する。 | 既存 Intent audit を使う。 |
| Reader normalization | old row と new row を同じ shape にする。 | in-process helper とする。 |
| Shared Contracts | `SubagentOutcome`、allowlist、evidence ref を共有する。 | TypeScript type と pure helper にする。 |

## Database and Cache

U002 は database を追加しない。

Audit Trail は既存の append-only Markdown shard を使う。

Old row compatibility は migration ではなく read path の normalization に置く。

Cache layer は追加しない。

Classification path に audit scan を入れない。

## Messaging and Service Discovery

U002 は message broker を追加しない。

Hook payload は in-process helper へ同期的に渡す。

Service discovery は不要である。

U003 との関係は runtime call ではなく read-only evidence dependency である。

## External Integrations

OpenTelemetry package の追加判断は U001 が所有する。

U002 は collector、dashboard、cloud export を required integration にしない。

Subagent Status は `.aidlc-hooks-health/*.drops` への書き込みを所有しない。

## Security Controls

`SUBAGENT_COMPLETED` の event 名は維持する。

Outcome、source、evidence ref は additive field とする。

Unexpected status value は unknown に正規化する。

Message excerpt は classification source にしない。

stdout JSON command に Subagent Status の診断文を出さない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:03:22Z

Iteration: 1

U002 の infrastructure services は、既存 hook payload surface と append-only audit に閉じている。

Database、queue、cache を追加しない判断は、U002 の NFR と一致している。
