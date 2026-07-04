# Business Rules: U002-subagent-status-audit

## 上流文脈

この business-rules は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U002 は `unit-of-work` の `U002-subagent-status-audit` に対応する。

`unit-of-work-story-map` は US004 と US008 を U002 の主対象としている。

`requirements` は R004、R007、R008、R009、NFR004、NFR005 を U002 の検証条件に含める。

`components`、`component-methods`、`services` は Subagent Status と Evidence Recording Service の責務境界を定義している。

## Preconditions

| ID | Rule | Evidence |
|---|---|---|
| PRE001 | hook payload は parse 済み JSON として扱う。 | R004 |
| PRE002 | trustworthy status field は `SubagentStop` payload の top-level `subagent_status` または top-level `status` に限定する。 | R004 |
| PRE003 | `SUBAGENT_COMPLETED` event は既存 event 名として存在する。 | R008 |
| PRE004 | U001 の Shared Contracts と Error Audit evidence path が利用できる。 | Unit DAG |

## Invariants

| ID | Rule | Rationale |
|---|---|---|
| INV001 | `SUBAGENT_COMPLETED` の event 名を削除または改名しない。 | R008 |
| INV002 | message text、transcript、last assistant message から success または failure を推測しない。 | R004 |
| INV003 | trustworthy status field がない場合は unknown とする。 | R004 |
| INV004 | new field は additive にする。 | R008 |
| INV005 | old row に outcome field がなくても reader は壊れない。 | NFR005 |
| INV006 | U002 から U003 を呼ばない。 | component-dependency |
| INV007 | `skills/` と `.coderabbit.yml` または `.coderabbit.yaml` は変更対象外にする。 | scope boundary |
| INV008 | audit append failure を `.aidlc-hooks-health/*.drops` へ書く責務を Subagent Status に持たせない。 | component-dependency |
| INV009 | Subagent Status は stdout JSON に診断文を出さない。 | NFR001 |

## Postconditions

| ID | Rule | Verification |
|---|---|---|
| POST001 | success fixture が success outcome を audit に残す。 | R004-AC1 |
| POST002 | failure fixture が failure outcome を audit に残す。 | R004-AC2 |
| POST003 | missing status fixture が unknown outcome を audit に残す。 | R004-AC3 |
| POST004 | downstream reader が success、failure、unknown を区別できる。 | R004-AC4 |
| POST005 | old audit row と new audit row の両方を読める。 | R008 |
| POST006 | TypeScript strict typecheck が通る。 | NFR004 |
| POST007 | stdout JSON parse test が subagent status path で通る。 | NFR001、R007 |
| POST008 | audit append failure fixture が `AuditWriteResult.failed` を返し、`.drops` 書き込みを Subagent Status の責務にしない。 | R008 |

## Validation Logic

trustworthy status field は hook input schema の明示 field だけを対象にする。

対象 field は、`hook_event_name` が `SubagentStop` の payload にある top-level `subagent_status` と top-level `status` である。

`tool_input.status` は tool hook の状態を表すため、Subagent outcome の trusted source から除外する。

success 値は `success`、`succeeded`、`ok`、`completed` を success enum へ正規化する。

failure 値は `failure`、`failed`、`error`、`errored`、`cancelled`、`timeout` を failure enum へ正規化する。

それ以外の値は unknown enum へ正規化する。

unknown は error ではなく、source event が区別不能であることを表す状態にする。

old row compatibility では missing outcome を unknown として扱う。

doctor 表示では unknown を failure と同じ意味にしない。

## Policies

audit taxonomy は append-only に扱う。

field 追加の documentation は audit taxonomy と emitter path を一致させる。

deterministic fixture は success、failure、missing status、old row、new row の matrix にする。

fixture matrix には stdout JSON parse test と audit append failure test を含める。

PR readiness では U002 の evidence を R004、R008、R007、R009 に接続する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

規則は free text 推測を禁止し、誤分類を防ぐ。

old row compatibility があるため、既存 audit reader の破壊を避けられる。

review iteration 1 の指摘により、stdout JSON 非干渉、audit append failure の責務境界、trustworthy status allowlist を補正した。
