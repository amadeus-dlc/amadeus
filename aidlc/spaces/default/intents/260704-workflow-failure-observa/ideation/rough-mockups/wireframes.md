# Wireframes

## Upstream Context

この Rough Mockups は、`intent-statement`、`scope-document`、`intent-backlog` を上流成果物として読む。

この Intent は画面 UI ではなく、CLI、audit、doctor、OpenTelemetry 計装、Intent artifact、PR 説明へつながる失敗証拠の情報設計を扱う。
`scope-document` で確定したとおり、OpenTelemetry core 計装は in scope である。
一方で、collector、dashboard、常時ネットワーク送信画面、`skills/` 直接編集、`.coderabbit.yml` 変更は scope out である。

## Primary Surface

第一入口は `doctor` である。

`doctor` は、agent runner と maintainer が最初に見る軽量な確認面として扱う。
audit は証跡、OpenTelemetry は計装 evidence、Intent artifact は判断文脈、PR 説明はレビュー文脈を担う。

## CLI Wireframe

`doctor` 出力は、terminal width 80-120 columns を主対象にする。
severity は色だけに依存せず、text label と記号で示す。
地の文は日本語にし、event 名、file 名、command 名、metric 名は英語のまま使う。

```text
aidlc doctor
============

SUMMARY
  OK       workspace state readable
  WARNING  hook drops detected
  WARNING  conductor mismatch signals detected
  OK       otel no-op default active

CRITICAL WARNINGS
  WARNING  stage report missing
  Evidence  audit/runtime mismatch
  Next      inspect audit shard and intent state
  Action    warning only, workflow is not hard-stopped

HOOK DROPS
  Hook                    Count  Latest Time          Latest Reason
  aidlc-log-subagent      3      2026-07-04T00:00Z   malformed input
  aidlc-stop              1      2026-07-04T00:10Z   write failed

ENGINE ERRORS
  Event       ERROR_LOGGED
  Command     aidlc-orchestrate.ts next
  Evidence    audit shard path
  Contract    stdout json only

SUBAGENT STATUS
  Event                Status       Evidence
  SUBAGENT_COMPLETED   failed       hook payload status
  SUBAGENT_COMPLETED   unknown      status unavailable

OTEL CORE
  Mode       no-op default
  Exporter   disabled
  Spans      aidlc.command, aidlc.error, aidlc.directive.report
  Metrics    aidlc.doctor.hook_drops, aidlc.doctor.warnings

LINKS
  Audit      aidlc/.../audit/<host>.md
  Intent     aidlc/.../260704-workflow-failure-observa/
  PR         add verification summary before review
```

<!-- Text fallback: `doctor` は summary、critical warnings、hook drops、engine errors、subagent status、OpenTelemetry core、links の順に表示し、失敗証拠を audit、Intent artifact、PR 説明へ接続する。 -->

## Information Hierarchy

情報階層は、先に意思決定に必要な要約を出し、後から根拠に辿れる構成にする。

| Rank | Section | Purpose | Source |
|---:|---|---|---|
| 1 | `SUMMARY` | 全体状態を短く把握する。 | state、doctor checks |
| 2 | `CRITICAL WARNINGS` | hard error ではないが確認すべき不整合を示す。 | #435、runtime graph、audit |
| 3 | `HOOK DROPS` | hook の fail-open を表示する。 | #432、`.aidlc-hooks-health/*.drops` |
| 4 | `ENGINE ERRORS` | error directive と未捕捉例外の証拠を示す。 | #431、audit |
| 5 | `SUBAGENT STATUS` | subagent 完了の成功失敗または unknown を示す。 | #433、hook payload |
| 6 | `OTEL CORE` | no-op default と trace boundary を短く示す。 | OpenTelemetry core 計装 |
| 7 | `LINKS` | audit、Intent、PR 説明への確認先を示す。 | `intent-statement`、`scope-document`、`intent-backlog` |

## State Sketches

### Empty State

失敗証拠がない場合は、空の表ではなく、確認済みであることを明示する。

```text
SUMMARY
  OK  no hook drops
  OK  no engine errors
  OK  no conductor warnings
  OK  otel no-op default active
```

<!-- Text fallback: 空状態では、失敗がないことと OpenTelemetry no-op default が有効であることを明示する。 -->

### Warning State

conductor-independent signal は、workflow を止める error ではなく warning として表示する。

```text
CRITICAL WARNINGS
  WARNING  run-stage without matching report
  Evidence  rough-mockups in-flight
  Next      inspect aidlc-state.md and audit shard
  Action    warning only
```

<!-- Text fallback: conductor-independent warning は根拠、次の確認先、hard error ではないことを同じブロックに表示する。 -->

### Partial State

subagent status が得られない場合は推測せず、unknown として表示する。

```text
SUBAGENT STATUS
  Event                Status       Evidence
  SUBAGENT_COMPLETED   unknown      status unavailable
  Decision             do not infer from message
```

<!-- Text fallback: subagent status が信頼できない場合は message から推測せず、unknown と判断記録を表示する。 -->

## Accessibility Notes

| Surface | Heading | Landmark equivalent | Keyboard or scan behavior |
|---|---|---|---|
| `doctor` terminal output | `SUMMARY` を最初の見出し相当にする。 | CLI の main content。 | 固定順序で上から下に読める。 |
| warning block | `CRITICAL WARNINGS` を見出し相当にする。 | Alert region 相当。 | severity は text label で示す。 |
| evidence links | `LINKS` を最後に置く。 | Navigation region 相当。 | path をコピーして辿れる。 |
| markdown artifacts | H2 見出しを使う。 | Document outline。 | screen reader が見出し移動できる。 |

## Scope Exclusions

この Rough Mockups では、Web dashboard、collector UI、常時ネットワーク送信画面を作らない。

`skills/` は配布物境界であるため、直接編集経路を UI flow として示さない。
`.coderabbit.yml` は人間の明示許可がないため、変更導線を示さない。

## Review

Verdict: READY

Findings:

- なし

Reasoning:

成果物は `intent-statement`、`scope-document`、`intent-backlog` を上流成果物として明記している。
非 UI initiative として、`doctor` の CLI rough mockup、system interaction diagram、個別 flow diagram が作られている。
OpenTelemetry core 計装は in scope、collector、dashboard、常時ネットワーク送信は out of scope と一貫している。
`skills/` 配布境界と `.coderabbit.yml` 非変更も明記されており、QA と開発者が次 stage で要件化できる粒度になっている。
