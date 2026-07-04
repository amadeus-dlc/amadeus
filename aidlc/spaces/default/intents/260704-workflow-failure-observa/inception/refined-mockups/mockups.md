# Refined Mockups

## Upstream Context

この refined mockups は、`wireframes`、`user-flow`、`stories`、`requirements`、`team-practices` を入力にして作成する。

`wireframes` は、`doctor` CLI を primary surface とし、audit、OpenTelemetry core、Intent artifact、PR 説明を supporting surfaces として扱っている。

`user-flow` は、failure evidence inspection、engine error flow、hook drop flow、subagent status flow、conductor warning flow、PR evidence flow を定義している。

`stories` は、Maintainer を primary persona、Agent と Reviewer を supporting personas として扱い、B001 を first delivery slice として定義している。

`requirements` は、R001-R009、stdout JSON preservation、OpenTelemetry no-op default、deterministic verification、parity boundary、PR readiness traceability を定義している。

`team-practices` は、#431、#432、OpenTelemetry no-op default 計装を最初の Bolt に束ねる方針と、実装前に失敗する eval または deterministic test を置く方針を定義している。

## Design Scope

この stage は Web dashboard を設計しない。

この stage は、CLI-centered developer experience を refined mockup として定義する。

主対象は `doctor` standard output である。

補助対象は audit evidence、OpenTelemetry no-op and test-exporter behavior、Intent artifact links、PR readiness checklist である。

collector、dashboard、cloud infrastructure、always-on export、direct `skills/` edits、unauthorized `.coderabbit.yml` changes は not-designed flows として扱う。

## Primary Mockup: Doctor Standard Output

`doctor` standard output は、Maintainer が 30 秒以内に状態を把握できる順序にする。

標準出力では、summary、critical warnings、hook drops、engine errors、subagent status、OpenTelemetry core、links の順に表示する。

詳細は optional verbose path に逃がし、directive/report の JSON stdout contract には人間向け診断文を混ぜない。

```text
+------------------------------------------------------------+
| aidlc doctor                                              |
| Intent: 260704-workflow-failure-observa                   |
| Scope: mvp                                                |
+------------------------------------------------------------+

SUMMARY
  OK       workspace state readable
  WARNING  conductor mismatch signals detected
  WARNING  hook drops detected
  OK       engine error audit configured
  OK       otel core no-op default active

CRITICAL WARNINGS
  WARNING  run-stage without matching report
  Evidence  audit/runtime mismatch
  Next      inspect aidlc-state.md and audit shard
  Action    warning only, workflow is not hard-stopped

HOOK DROPS
  Hook                    Count  Latest Time           Latest Reason
  aidlc-log-subagent      3      2026-07-04T00:00Z    malformed input
  aidlc-stop              1      2026-07-04T00:10Z    write failed

ENGINE ERRORS
  Event       ERROR_LOGGED
  Command     aidlc-orchestrate.ts next
  Evidence    aidlc/.../audit/<host>.md
  Contract    stdout json preserved

SUBAGENT STATUS
  Event                Status       Evidence
  SUBAGENT_COMPLETED   failed       hook payload status
  SUBAGENT_COMPLETED   unknown      status unavailable
  Decision             do not infer from message text

OTEL CORE
  Mode       no-op default
  Exporter   disabled
  Spans      aidlc.command, aidlc.error, aidlc.directive.report
  Metrics    aidlc.doctor.hook_drops, aidlc.doctor.warnings

LINKS
  Audit      aidlc/.../audit/<host>.md
  Intent     aidlc/.../260704-workflow-failure-observa/
  PR         include Issue, Requirement, verification, parity summary
```

Text fallback: `doctor` は意思決定に近い summary を先に出し、詳細 evidence は path と verbose detail へ接続する。

## Empty State Mockup

Empty state は、失敗証拠がないことを空欄ではなく確認済み状態として示す。

```text
+------------------------------------------------------------+
| aidlc doctor                                              |
+------------------------------------------------------------+

SUMMARY
  OK  no conductor mismatch signals
  OK  no hook drops
  OK  no engine errors
  OK  no subagent status ambiguity
  OK  otel core no-op default active

LINKS
  Audit      aidlc/.../audit/<host>.md
  Intent     aidlc/.../260704-workflow-failure-observa/
```

Text fallback: 空状態では、未検出ではなく、確認した対象に問題がないことを label で示す。

## Warning State Mockup

Warning state は workflow を止めない。

ただし、Maintainer と Agent が次の確認先をすぐ辿れるように、evidence と next action を同じ block に置く。

```text
CRITICAL WARNINGS
  WARNING  stage artifacts exist without matching report
  Stage     refined-mockups
  Evidence  aidlc-state.md says in-progress, audit lacks report
  Next      inspect audit shard and stage directory
  Action    warning only, do not mutate state from doctor
```

Text fallback: warning は hard error ではないこと、state を doctor が変更しないこと、確認すべき evidence を一緒に示す。

## Malformed Input State Mockup

Malformed input state は、ファイルを読めなかった事実と残りの check が継続することを示す。

```text
HOOK DROPS
  WARNING  malformed drops file
  File      .aidlc-hooks-health/aidlc-stop.drops
  Reason    line 4 is not parseable
  Action    inspect file, remaining doctor checks continued
```

Text fallback: malformed input は doctor 自体の crash ではなく、該当 file の warning として扱う。

## Partial or Unknown Status Mockup

Subagent status が信頼できない場合は、message text から推測しない。

```text
SUBAGENT STATUS
  Event                Status       Evidence
  SUBAGENT_COMPLETED   unknown      status field unavailable
  Decision             do not infer from free text
  Next                 inspect hook payload fixture
```

Text fallback: 不明な status は unknown と表示し、成功または失敗を推測しない。

## Stdout JSON Preservation Mockup

`next` と `report` の JSON stdout contract は、human-readable diagnostics と分離する。

```text
COMMAND CONTRACT
  Command    aidlc-orchestrate.ts next
  Stdout     JSON directive only
  Stderr     diagnostics allowed
  Audit      ERROR_LOGGED allowed
  OTel       spans and metrics allowed
```

Text fallback: JSON を期待する command では、diagnostics は stdout に出さず、audit、stderr、telemetry に分離する。

## Supporting Surface: Audit Evidence

Audit evidence は `doctor` から辿る補助面である。

```text
AUDIT EVIDENCE
  Event       ERROR_LOGGED
  Tool        aidlc-orchestrate.ts
  Command     next
  Detail      human-readable error detail
  Link        audit shard path shown in doctor
```

Text fallback: audit evidence は event、tool、command、detail、link を最小単位にする。

## Supporting Surface: OpenTelemetry Core

OpenTelemetry core は core scope だが、collector と dashboard は optional scope である。

```text
OTEL CORE STATUS
  Default      no-op
  Exporter     disabled unless explicitly configured
  Test mode    in-memory or test exporter
  Network      no send by default
  Contract     no stdout JSON pollution
```

Text fallback: telemetry は no-op default と test exporter を中心に設計し、常時 network export は設計しない。

## Supporting Surface: PR Evidence

PR evidence は Reviewer と Maintainer の補助面である。

```text
PR READINESS CHECKLIST
  Issues        #431, #432, #433, #435
  Intent        aidlc/.../260704-workflow-failure-observa/
  Requirements R001-R009
  Verification typecheck, validator, test:all, parity, stdout json, otel no-send
  Boundary      collector, dashboard, cloud, skills direct edits excluded
```

Text fallback: PR evidence は Issue、Intent、Requirement、verification、boundary を同じ単位で示す。

## Not-Designed Flows

| Flow | Decision | Reason |
|---|---|---|
| collector setup | Not designed | OpenTelemetry collector は optional scope である。 |
| dashboard setup | Not designed | Dashboard は今回の core 計装 scope に含めない。 |
| cloud infrastructure | Not designed | Cloud export と infrastructure は後続 scope の対象である。 |
| always-on telemetry export | Not designed | no-op default と stdout JSON preservation に反する。 |
| direct `skills/` edits | Not designed | `skills/` は配布物境界である。 |
| unauthorized `.coderabbit.yml` changes | Not designed | 人間の明示許可がない変更は対象外である。 |

## Traceability

| Mockup area | Story | Requirement | Source |
|---|---|---|---|
| Doctor standard output | US001, US002, US003, US005 | R001, R002, R003, R005 | `wireframes`, `user-flow`, `requirements` |
| Subagent status | US004 | R004, R008 | `stories`, `requirements` |
| Stdout JSON preservation | US001, US003, US007 | NFR001, R007 | `requirements`, `team-practices` |
| PR evidence | US007, US009 | R007, R009 | `stories`, `team-practices` |
| Not-designed flows | WH001-WH006 | R006, R009 | `stories`, `requirements` |

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-04T14:14:58+09:00
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Required action |
|---|---|---|---|---|
| 1 | None | `inception/refined-mockups/` | stage definition が要求する `mockups.md`、`interaction-spec.md`、`design-system-mapping.md`、`accessibility-checklist.md`、`refined-mockups-questions.md` は揃っている。 | None |
| 2 | None | `refined-mockups-questions.md`, `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md` | 回答 E の方針は、`doctor` CLI を primary surface とし、audit、OpenTelemetry core、Intent artifact、PR evidence を supporting surfaces にする形で反映されている。 | None |
| 3 | None | `mockups.md`, `interaction-spec.md` | non-UI CLI-centered developer experience として、`doctor`、audit evidence、OpenTelemetry no-op and test-exporter behavior、Intent artifact links、PR readiness checklist が整理されている。 | None |
| 4 | None | `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md` | `wireframes`、`user-flow`、`stories`、`requirements`、`team-practices` への upstream context と traceability が示されている。 | None |
| 5 | None | `accessibility-checklist.md`, `design-system-mapping.md` | accessibility checklist は CLI と markdown artifact に適した確認項目を持ち、status label、heading order、copyable path、stdout JSON preservation、required-sections sensor、upstream-coverage sensor で検証できる。 | None |
| 6 | None | `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md` | collector、dashboard、cloud infrastructure、always-on export、direct `skills/` edits、unauthorized `.coderabbit.yml` changes は not-designed scope として境界が明確である。 | None |

### Summary

Refined Mockups stage の成果物は、Web UI ではなく CLI-centered developer experience として整理されている。

`doctor` の標準出力、audit evidence、OpenTelemetry core、Intent artifact、PR readiness evidence は、上流の `wireframes`、`user-flow`、`stories`、`requirements`、`team-practices` と矛盾せず追跡できる。

accessibility checklist は CLI と markdown artifact の検証可能な観点に寄っており、後続の Application Design と Units Generation が追加質問なしで進める粒度にある。
