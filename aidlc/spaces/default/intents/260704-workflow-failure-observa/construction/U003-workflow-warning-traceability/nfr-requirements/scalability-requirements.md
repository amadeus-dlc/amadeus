# Scalability Requirements: U003-workflow-warning-traceability

## 上流文脈

この scalability-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、WorkflowEvidenceSnapshot、WarningCandidate、DiagnosticFinding、RequirementEvidenceMap、PrReadinessChecklist への data transformation を定義している。

`business-rules` は、pending question と approval gate による abandonment false positive 抑制、U001 と U002 evidence の read-only 参照、scope-out 境界を定義している。

`requirements` は、R005、R006、R007、R009、NFR003、NFR004、NFR006 を定義している。

`technology-stack` は optional input であり、この Intent では個別成果物として存在しないため、既存の TypeScript と Bun の CLI 前提を上流技術制約として扱う。

## Capacity Targets

| ID | Capacity target | Measurement |
|---|---|---|
| SCALE001 | warning evaluation は stage 数と audit row 数に対して線形に完了する。 | fixture benchmark |
| SCALE002 | Requirement evidence map は R001-R009 の固定 Requirement 集合に対して完了する。 | evidence map fixture |
| SCALE003 | PR readiness checklist は Issue #431、#432、#433、#435 の固定対象に対して完了する。 | checklist fixture |
| SCALE004 | U001 と U002 の evidence は read-only に読むだけで、U003 から U001 または U002 の component を呼び出さない。 | dependency review |
| SCALE005 | warning type の追加は `DiagnosticFinding` の追加分類で吸収し、doctor output format を破壊しない。 | type and snapshot review |

## Growth Model

U003 の成長対象は stage artifact 数、audit row 数、runtime graph entry 数、verification evidence 数である。

MVP では対象 Issue と Requirement は固定集合である。

PR readiness checklist は out-of-scope item を required item に昇格しない。

## Scaling Triggers

| Signal | Trigger | Required response |
|---|---|---|
| warning evaluation が fixture budget を超える | audit scan が重複している | snapshot を 1 回構築して rule evaluation へ渡す |
| false positive が増える | pending question または approval gate evidence を見落としている | false-positive guard を先に評価する |
| PR readiness が肥大化する | scope-out item を required item に混ぜている | required と scope-out を分ける |
| evidence map が sparse になる | U001 または U002 evidence の読み取りに失敗している | missing evidence warning にする |

## Degradation Policy

missing evidence は pass ではなく warning として扱う。

malformed evidence は warning として表示し、doctor の他 check を継続する。

parity failure がある場合は failure reason と resolution path を checklist に残す。

collector、dashboard、cloud infrastructure、direct `skills/` edits は scope-out として扱う。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Scalability target は diagnostic evidence の読み取りと固定 Requirement 集合の集約に限定されている。

U003 は U001 と U002 を呼び出さず、read-only evidence だけを使う。
