# Accessibility Checklist

## Upstream Context

この accessibility checklist は、`wireframes`、`user-flow`、`stories`、`requirements`、`team-practices` を入力にして作成する。

`wireframes` は CLI output と markdown artifact の heading、warning block、evidence links を扱っている。

`user-flow` は Agent、Maintainer、Reviewer が evidence path を辿る流れを扱っている。

`stories` は Maintainer primary、Agent と Reviewer supporting の persona 方針を扱っている。

`requirements` は operational clarity、stdout JSON preservation、audit integrity、OpenTelemetry no-op default を制約として扱っている。

`team-practices` は verification evidence と PR readiness の追跡を求めている。

## Accessibility Target

この Intent は Web UI ではない。

そのため、WCAG 2.1 AA-inspired guidance を CLI と markdown artifact に適用する。

基準は、色だけに依存しないこと、読み上げや copy に耐える heading order を持つこと、path が操作可能であること、machine-readable contract と human-readable diagnostics を混同しないことである。

## CLI Checklist

| Check | Status | Implementation |
|---|---|---|
| Status labels do not rely on color only | Required | `OK`、`WARNING`、`ERROR`、`UNKNOWN` を text label として表示する。 |
| Predictable heading order | Required | `SUMMARY`、`CRITICAL WARNINGS`、`HOOK DROPS`、`ENGINE ERRORS`、`SUBAGENT STATUS`、`OTEL CORE`、`LINKS` の順を保つ。 |
| Copyable evidence paths | Required | audit、Intent、PR evidence path を装飾しすぎず 1 行で表示する。 |
| Warning recovery cue | Required | warning block に evidence、next action、hard stop ではないことを表示する。 |
| Unknown status handling | Required | `UNKNOWN` を success または failure と混同しない。 |
| Verbose detail separation | Required | 詳細は optional verbose detail に分離し、standard output を読みにくくしない。 |
| Stdout JSON preservation | Required | directive/report の stdout には human-readable diagnostics を混ぜない。 |

## Markdown Artifact Checklist

| Check | Status | Implementation |
|---|---|---|
| H2 heading structure | Required | 各 artifact は複数の H2 heading を持つ。 |
| Tables have headers | Required | traceability、status、verification table は header row を持つ。 |
| Code blocks have text fallback | Required | CLI mockup の後に text fallback を置く。 |
| Scope exclusions are visible | Required | collector、dashboard、cloud、always-on export、`skills/` direct edits、`.coderabbit.yml` changes を明示する。 |
| Requirements are traceable | Required | story、Requirement、verification cue を table で対応付ける。 |

## Error and Warning Recovery

Warning は error と同じ視覚表現にしない。

Warning は workflow を hard stop しない。

Error は user action が必要な場合にだけ error label を使う。

Malformed drops file は doctor crash ではなく warning として扱う。

Subagent status が信頼できない場合は `UNKNOWN` とし、message text から推測しない。

## Accessibility by Persona

| Persona | Accessibility need | Design response |
|---|---|---|
| Maintainer | 判断材料を短時間で scan したい。 | summary first と warning evidence block を使う。 |
| Agent | 次の操作を迷わず実行したい。 | next action と copyable path を同じ block に置く。 |
| Reviewer | Issue、Requirement、verification を追跡したい。 | traceability table と PR readiness checklist を使う。 |

## Verification Checklist

| Verification | Expected evidence |
|---|---|
| CLI output scanability | doctor output assertion に section order を含める。 |
| Color independence | tests または snapshot review で status label を確認する。 |
| JSON contract preservation | stdout JSON parse test を実行する。 |
| Markdown structure | required-sections sensor と validator を実行する。 |
| Upstream traceability | upstream-coverage sensor を実行する。 |
| No-op telemetry accessibility | no-op default no-send test と test exporter assertion を記録する。 |

## Not-Designed Accessibility Scope

collector dashboard の accessibility は、この Intent の対象外である。

Web dashboard の keyboard navigation、responsive web layout、ARIA widgets は、この Intent の対象外である。

Cloud infrastructure console の accessibility は、この Intent の対象外である。

direct `skills/` edits の操作導線は、この Intent の対象外である。

unauthorized `.coderabbit.yml` changes の操作導線は、この Intent の対象外である。

## Traceability

| Accessibility item | Requirement | Story |
|---|---|---|
| Text labels not color alone | R002, R005, NFR006 | US002, US005 |
| Copyable evidence paths | R009 | US009 |
| Unknown status handling | R004, R008 | US004 |
| Stdout JSON preservation | R001, R003, R007, NFR001 | US001, US003, US007 |
| Markdown structure | R007, R009 | US007, US009 |
