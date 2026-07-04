# Domain Entities: U002-subagent-status-audit

## 上流文脈

この domain-entities は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U002 の Domain Model は、subagent hook payload、outcome classification、audit compatibility を扱う。

`components` は Shared Contracts、Error Audit、Subagent Status を定義している。

`component-methods` は `classifySubagentStatus`、`buildSubagentAuditFields`、`buildSubagentDoctorFinding` を定義している。

`services` は Evidence Recording Service を U002 の主要境界としている。

## Entity Catalog

| Entity | Kind | Responsibility |
|---|---|---|
| `SubagentHookPayload` | Entity | hook から渡される agent type、agent id、status source、message excerpt を保持する。 |
| `TrustedStatusSource` | Value Object | `SubagentStop` payload の top-level `subagent_status` または top-level `status` を表す。 |
| `SubagentOutcome` | Value Object | success、failure、unknown を表す。 |
| `SubagentAuditFields` | Value Object | `SUBAGENT_COMPLETED` に追加する additive fields を表す。 |
| `SubagentAuditWriteResult` | Value Object | audit append の success、no-op、failed を表す。 |
| `LegacySubagentAuditRow` | Entity | outcome field を持たない既存 audit row を表す。 |
| `NormalizedSubagentOutcome` | Value Object | old row と new row を同じ読み取り shape に揃える。 |
| `SubagentStatusFinding` | Value Object | doctor または downstream analysis で使う finding を表す。 |
| `OutcomeEvidenceRef` | Value Object | audit row、hook source、Intent artifact への参照を表す。 |

## Relationships

`SubagentHookPayload` は 0 または 1 個の `TrustedStatusSource` を持つ。

`TrustedStatusSource` は `SubagentOutcome` に変換される。

`SubagentOutcome` は `SubagentAuditFields` に入る。

`SubagentAuditFields` は `SUBAGENT_COMPLETED` audit row に append され、結果は `SubagentAuditWriteResult` として返る。

`SubagentAuditWriteResult.failed` は Subagent Status の失敗結果であり、Hook Drop Doctor の `.drops` 書き込み contract ではない。

`LegacySubagentAuditRow` は `NormalizedSubagentOutcome` へ変換される。

`NormalizedSubagentOutcome` は `SubagentStatusFinding` と `OutcomeEvidenceRef` に変換できる。

U003 は `OutcomeEvidenceRef` を read-only に参照する。

## Lifecycle States

| Entity | States |
|---|---|
| `SubagentHookPayload` | received、parsed、ignored |
| `TrustedStatusSource` | present、missing、untrusted |
| `SubagentOutcome` | success、failure、unknown |
| `SubagentAuditFields` | built、append-requested |
| `SubagentAuditWriteResult` | appended、no-op、failed |
| `LegacySubagentAuditRow` | read、normalized |
| `SubagentStatusFinding` | hidden、informational、warning |

## Aggregate Candidates

`SubagentOutcomeAggregate` は `SubagentHookPayload`、`TrustedStatusSource`、`SubagentOutcome` をまとめる。

この Aggregate の不変条件は、trustworthy status がない入力を success または failure にしないことである。

`SubagentAuditCompatibilityAggregate` は `SubagentAuditFields`、`LegacySubagentAuditRow`、`NormalizedSubagentOutcome` をまとめる。

この Aggregate の不変条件は、old row と new row の両方を downstream analysis が読めることである。

`SubagentAuditWriteAggregate` は `SubagentAuditFields` と `SubagentAuditWriteResult` をまとめる。

この Aggregate の不変条件は、audit append failure が workflow stdout JSON 契約や Hook Drop Doctor の所有境界を壊さないことである。

## Interaction Patterns

Subagent hook は `SubagentHookPayload` を作る。

Subagent Status component は `SubagentOutcome` を決める。

Evidence Recording Service は `SubagentAuditFields` を append-only audit へ渡す。

Doctor Diagnostic Service は `SubagentStatusFinding` を表示できる。

Verification Traceability は `OutcomeEvidenceRef` を read-only に読む。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Entity は outcome 分類と audit compatibility の責務を分離している。

U001 への依存は Shared Contracts と Error Audit evidence path に限定されている。
