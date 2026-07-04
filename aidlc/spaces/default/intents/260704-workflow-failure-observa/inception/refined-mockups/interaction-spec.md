# Interaction Specification

## Upstream Context

この interaction spec は、`wireframes`、`user-flow`、`stories`、`requirements`、`team-practices` を入力にして作成する。

`wireframes` は `doctor` CLI の情報階層を示している。

`user-flow` は failure evidence inspection から PR evidence flow までの操作順を示している。

`stories` は Maintainer、Agent、Reviewer の期待と Must Have stories を示している。

`requirements` は audit、doctor、OpenTelemetry core、subagent status、conductor-independent warning、verification、PR traceability を定義している。

`team-practices` は first Bolt と verification posture を定義している。

## Interaction Overview

この spec は、Web component ではなく CLI と markdown artifact の developer experience を扱う。

標準の操作は、Agent が `doctor` を実行し、Maintainer または Reviewer が evidence path を辿り、PR readiness checklist へ検証結果を転記する流れである。

詳細表示は optional verbose detail に置き、標準出力は scan しやすい summary と evidence path に限定する。

directive/report command の stdout は JSON contract を維持し、human-readable diagnostics を混ぜない。

## Doctor Summary Component

| Field | Value |
|---|---|
| Component | Doctor Summary |
| Description | `doctor` の最初に全体状態を表示する。 |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| empty | 失敗証拠がないことを OK label で示す。 | no findings |
| success | 全 check が正常であることを示す。 | all checks pass |
| warning | 1 件以上の warning があることを示す。 | doctor warning detected |
| partial | 一部の情報が unknown であることを示す。 | status unavailable |
| error | doctor 自体の実行前提が壊れていることを示す。 | state unreadable |

### Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| intent_id | string | yes | active Intent の human-readable id。 |
| check_results | array | yes | doctor checks の status と summary。 |
| evidence_links | array | yes | audit、Intent artifact、PR evidence の path。 |

### Responsive Behaviour

| Terminal width | Behaviour |
|---|---|
| under 80 columns | section label と status を優先し、detail は次行に折り返す。 |
| 80 to 120 columns | 標準表示を 2 to 4 column の fixed-width text で表示する。 |
| over 120 columns | 列幅を広げすぎず、path は copy しやすい 1 行を優先する。 |

### Accessibility

| Requirement | Implementation |
|---|---|
| Text labels | `OK`、`WARNING`、`ERROR` を必ず text で表示する。 |
| Heading order | `SUMMARY` を先頭に固定する。 |
| Color independence | 色を使う場合も label と記号だけで意味が分かるようにする。 |
| Copy path | audit と Intent path は装飾せず copy しやすい形で表示する。 |

## Warning Evidence Block

| Field | Value |
|---|---|
| Component | Warning Evidence Block |
| Description | conductor-independent warning と recovery cue を表示する。 |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| warning | hard error ではない不整合を表示する。 | mismatch detected |
| repeated | 同じ warning が繰り返し出ていることを示す。 | repeated finding |
| resolved | warning が再現しないことを示す。 | no current finding |

### Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| warning_label | string | yes | warning の短い名前。 |
| evidence | string | yes | audit、runtime graph、state のいずれかの根拠。 |
| next_action | string | yes | 人間または Agent が次に見る場所。 |

### Interaction

Warning block は state を変更しない。

Warning block は workflow を stop しない。

Warning block は evidence と next action を同じ block に置く。

## Hook Drops Evidence Table

| Field | Value |
|---|---|
| Component | Hook Drops Evidence Table |
| Description | `.aidlc-hooks-health/*.drops` の件数と最新理由を表示する。 |
| Category | data display |

### States

| State | Description | Trigger |
|---|---|---|
| empty | drops file がない。 | no drops |
| populated | hook name、count、latest time、latest reason を表示する。 | valid drops |
| malformed | parse できない drops file を warning として表示する。 | malformed file |
| verbose | full drop history を表示する。 | verbose option |

### Interaction

標準表示は最新理由までに限定する。

verbose 表示は full drop history を出せるが、標準表示を長くしない。

Malformed file は doctor の crash ではなく warning として扱う。

## Engine Error Evidence Block

| Field | Value |
|---|---|
| Component | Engine Error Evidence Block |
| Description | error directive と top-level catch の audit evidence を表示する。 |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| no error | engine error がない。 | no `ERROR_LOGGED` |
| error recorded | `ERROR_LOGGED` がある。 | error directive or thrown error |
| audit unavailable | audit write が失敗した可能性がある。 | audit path issue |

### Interaction

`ERROR_LOGGED` は audit evidence として表示する。

stdout JSON contract がある command では、diagnostic text を stdout に出さない。

audit write failure は再帰せず、既存の error envelope を優先する。

## Subagent Status Evidence Table

| Field | Value |
|---|---|
| Component | Subagent Status Evidence Table |
| Description | `SUBAGENT_COMPLETED` の status を success、failure、unknown に分ける。 |
| Category | data display |

### States

| State | Description | Trigger |
|---|---|---|
| success | trustable success status がある。 | hook status success |
| failure | trustable failure status がある。 | hook status failure |
| unknown | status が信頼できない。 | missing or ambiguous status |

### Interaction

`unknown` は free text から推測しない。

Reviewer が downstream analysis を行えるように、success、failure、unknown を同じ table に表示する。

## OpenTelemetry Core Status Block

| Field | Value |
|---|---|
| Component | OpenTelemetry Core Status Block |
| Description | core 計装の mode、exporter、spans、metrics を表示する。 |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| no-op | exporter 未設定で network export しない。 | default |
| test exporter | in-memory または test exporter が有効である。 | test configuration |
| configured exporter | 明示設定された exporter がある。 | environment configured |
| error span | error directive または thrown error が span に記録される。 | error path |

### Interaction

default は no-op とする。

collector と dashboard はこの interaction spec の対象外である。

`next` と `report` の correlation は span attributes で扱う。

## Links and PR Evidence Block

| Field | Value |
|---|---|
| Component | Links and PR Evidence Block |
| Description | audit、Intent artifact、PR readiness checklist へ接続する。 |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| evidence ready | audit と Intent path がある。 | normal |
| verification pending | test result が未記録である。 | before PR readiness |
| parity unresolved | parity result が未解決である。 | parity failure or pending |

### Interaction

PR readiness checklist は Issue、Intent、Requirement、verification、parity、scope boundary を含む。

CI failure と review comment が同時にある場合は、CI failure を先に扱う。

## Developer Experience Behaviour

Agent は、`doctor` standard output から evidence path を copy する。

Agent は、verbose detail が必要な場合だけ detailed output を確認する。

Maintainer は、summary と warning block で merge readiness の論点を絞る。

Reviewer は、PR description と Intent artifact から Issue、Requirement、verification の対応を確認する。

## Traceability

| Interaction | Stories | Requirements |
|---|---|---|
| Doctor Summary | US001, US002, US003, US005 | R001, R002, R003, R005 |
| Hook Drops Evidence Table | US002 | R002 |
| Engine Error Evidence Block | US001 | R001, R008 |
| Subagent Status Evidence Table | US004 | R004, R008 |
| OpenTelemetry Core Status Block | US003 | R003, NFR002, NFR003 |
| Links and PR Evidence Block | US007, US009 | R007, R009 |
