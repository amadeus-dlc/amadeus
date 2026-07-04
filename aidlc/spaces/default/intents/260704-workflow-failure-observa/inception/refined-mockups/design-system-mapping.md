# Design System Mapping

## Upstream Context

この design-system mapping は、`wireframes`、`user-flow`、`stories`、`requirements`、`team-practices` を入力にして作成する。

`wireframes` は `doctor` の CLI section と information hierarchy を示している。

`user-flow` は evidence path を辿る操作を示している。

`stories` は design primitives が Maintainer、Agent、Reviewer の判断にどう役立つかを示している。

`requirements` は stdout JSON contract、audit integrity、OpenTelemetry no-op default、operational clarity を制約として定義している。

`team-practices` は検証証拠と PR readiness の追跡を求めている。

## Primitive Mapping

この Intent は Web UI ではないため、design-system mapping は CLI と markdown artifact の primitives に対応付ける。

| Primitive | CLI representation | Artifact representation | Purpose |
|---|---|---|---|
| Heading | `SUMMARY`、`CRITICAL WARNINGS`、`HOOK DROPS` | H2 headings | scan order を固定する。 |
| Status label | `OK`、`WARNING`、`ERROR`、`UNKNOWN` | table status cell | 色に依存せず状態を伝える。 |
| Evidence table | fixed-width columns | markdown table | hook drops、subagent status、verification を比較しやすくする。 |
| Warning block | label、evidence、next action | section with action text | hard error ではない確認事項を表面化する。 |
| Link list | copyable path list | markdown links or paths | audit、Intent、PR evidence を辿れるようにする。 |
| Contract boundary | `Stdout JSON preserved` label | explicit constraint section | machine-readable output と human-readable diagnostics を分離する。 |

## Text and Severity Rules

Severity は色だけで表現しない。

標準表示では、`OK`、`WARNING`、`ERROR`、`UNKNOWN` を必ず text label として出す。

`UNKNOWN` は failure でも success でもない。

`UNKNOWN` は subagent status が信頼できないときに使い、message text から推測しない。

`WARNING` は workflow を hard stop しないが、Maintainer が確認すべき evidence を持つ。

## Layout Rules

`doctor` standard output は 80 to 120 columns の terminal を primary target とする。

1 section には 1 topic だけを置く。

Summary は必ず最初に置く。

Evidence path は copy しやすい 1 行を優先する。

Long path は、必要な場合だけ折り返す。

Verbose detail は standard output の主要 scan flow から分離する。

## Responsive Behaviour

| Width | Behaviour |
|---|---|
| under 80 columns | table は label と value の 2 行形式へ落とす。 |
| 80 to 120 columns | fixed-width table を標準とする。 |
| over 120 columns | columns を増やさず、scan order を維持する。 |
| markdown artifact | H2 heading と table を使い、screen reader の heading navigation を崩さない。 |

## Machine-Readable Contract Boundary

directive/report command の stdout は JSON contract を維持する。

Human-readable diagnostics は stdout に混ぜない。

Diagnostics は audit、stderr、doctor output、OpenTelemetry spans and metrics、Intent artifacts に分離する。

この boundary は R001、R003、R007、NFR001 に対応する。

## Evidence Path Rules

Audit path は `Audit` label で示す。

Intent path は `Intent` label で示す。

PR checklist は `PR` label で示す。

Path は terminal から copy できる文字列として表示する。

Markdown artifact では、レビュー時に辿れるように相対 path と absolute review path のどちらかを明確に置く。

## OpenTelemetry Mapping

OpenTelemetry core 計装は design primitive として `OTEL CORE` block に置く。

Default mode は `no-op default` と表示する。

Exporter は未設定時に `disabled` と表示する。

Test exporter は local verification のための state として扱う。

collector、dashboard、cloud infrastructure、always-on export は design system mapping の対象外である。

## Not-Designed Flow Mapping

| Not-designed flow | Display rule | Reason |
|---|---|---|
| collector setup | Not designed と明記する。 | collector は optional scope である。 |
| dashboard setup | Not designed と明記する。 | dashboard は今回の refined surface ではない。 |
| cloud infrastructure | Not designed と明記する。 | cloud は後続 scope の対象である。 |
| always-on export | Not designed と明記する。 | no-op default と矛盾する。 |
| direct `skills/` edits | Not designed と明記する。 | `skills/` は配布物境界である。 |
| unauthorized `.coderabbit.yml` changes | Not designed と明記する。 | 人間の明示許可が必要である。 |

## Traceability

| Design primitive | Requirements | Stories | Verification cue |
|---|---|---|---|
| Status label | R002, R004, R005 | US002, US004, US005 | doctor output assertion |
| Evidence table | R002, R004, R007 | US002, US004, US007 | fixture and artifact check |
| Warning block | R005, NFR006 | US005 | non-mutating doctor assertion |
| Link list | R009 | US009 | PR checklist review |
| Contract boundary | R001, R003, R007, NFR001 | US001, US003, US007 | stdout JSON parse test |
| OTel core block | R003, NFR002, NFR003 | US003 | no-op default no-send test |
