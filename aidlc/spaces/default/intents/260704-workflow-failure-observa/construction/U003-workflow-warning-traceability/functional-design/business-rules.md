# Business Rules: U003-workflow-warning-traceability

## 上流文脈

この business-rules は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U003 は `unit-of-work` の `U003-workflow-warning-traceability` に対応する。

`unit-of-work-story-map` は US005、US006、US007、US009 を U003 の主対象としている。

`requirements` は R005、R006、R007、R009、NFR004、NFR006 を U003 の検証条件に含める。

`components`、`component-methods`、`services` は Conductor Warning、Verification Traceability、Doctor Composition の責務境界を定義している。

## Preconditions

| ID | Rule | Evidence |
|---|---|---|
| PRE001 | U001 の error audit、hook drop doctor、OpenTelemetry evidence が読める。 | Unit DAG |
| PRE002 | U002 の subagent status evidence が読める。 | Unit DAG |
| PRE003 | `aidlc-state.md`、audit、`runtime-graph.json` を read-only に読める。 | R005 |
| PRE004 | PR readiness に使う verification result は実行済みまたは missing として区別できる。 | R007 |

## Invariants

| ID | Rule | Rationale |
|---|---|---|
| INV001 | doctor warning は workflow state を変更しない。 | R005 |
| INV002 | warning は hard error ではなく actionable warning とする。 | R005 |
| INV003 | pending question または approval gate がある stage を abandonment と断定しない。 | false positive control |
| INV004 | U003 は U001 と U002 の evidence を read-only に読む。 | component-dependency |
| INV005 | `engineFileExceptions` を明示承認なしに変更しない。 | R006 |
| INV006 | missing evidence を pass として扱わない。 | R007 |
| INV007 | collector、dashboard、cloud infrastructure、direct `skills/` edits を PR readiness の required item にしない。 | scope boundary |

## Postconditions

| ID | Rule | Verification |
|---|---|---|
| POST001 | run-stage/report mismatch fixture が doctor warning を出す。 | R005-AC1 |
| POST002 | in-flight abandonment fixture が doctor warning を出す。 | R005-AC2 |
| POST003 | runtime graph/audit contradiction fixture が doctor warning を出す。 | R005-AC3 |
| POST004 | doctor warning は state を変更しない。 | R005-AC4 |
| POST005 | Requirement evidence map が R001-R009 を coverage する。 | R007 |
| POST006 | PR readiness checklist が Issue、Intent、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default を含む。 | R009 |
| POST007 | parity failure がある場合、reason と resolution path が traceable である。 | R006 |

## Validation Logic

run-stage/report mismatch は、artifact evidence と audit transition の差分で検出する。

abandonment は、Current Stage、pending questions、approval gate、直近 audit event を合わせて判定する。

contradiction は、`runtime-graph.json`、audit、state の stage outcome を比較して判定する。

Requirement evidence map は R001-R009 の各行に少なくとも 1 つの evidence item または missing evidence warning を持つ。

PR readiness checklist は scope-out item を required item として扱わない。

## Policies

warning は diagnosis であり、state transition ではない。

parity lock に触れる可能性がある場合、adapter または wrapper first の検討結果を先に記録する。

CI failure がある場合、review comment より先に CI failure を扱う。

merge 判断は人間に残す。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

規則は false positive を抑えつつ、失敗候補を隠さない設計になっている。

PR readiness checklist は verification と scope boundary を区別している。
