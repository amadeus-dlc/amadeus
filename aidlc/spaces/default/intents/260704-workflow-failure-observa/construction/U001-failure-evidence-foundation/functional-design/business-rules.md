# Business Rules: U001-failure-evidence-foundation

## 上流文脈

この business-rules は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U001 は `unit-of-work` の `U001-failure-evidence-foundation` を実装設計へ落とす。

`unit-of-work-story-map` は US001、US002、US003 を U001 の主対象としている。

`requirements` は R001、R002、R003、R007、R008、R009、NFR001、NFR002、NFR003、NFR004、NFR005、NFR006 を U001 の検証条件に含める。

`components`、`component-methods`、`services` は Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の責務境界を定義している。

## Preconditions

| ID | Rule | Evidence |
|---|---|---|
| PRE001 | command が stdout JSON 契約を持つかどうかを `JsonStdoutContract` として判定できる。 | NFR001 |
| PRE002 | active workflow がある場合だけ audit append を試みる。 | R001 |
| PRE003 | OpenTelemetry exporter は環境変数または test seam で明示された場合だけ有効にする。 | R003、NFR002 |
| PRE004 | `.aidlc-hooks-health/*.drops` は存在しない場合も正常入力として扱う。 | R002 |

## Invariants

| ID | Rule | Rationale |
|---|---|---|
| INV001 | `ERROR_LOGGED` の event 名を削除または改名しない。 | R008 |
| INV002 | error audit と telemetry は stdout JSON に診断文を混ぜない。 | NFR001 |
| INV003 | OpenTelemetry は default no-op であり、明示設定なしに network export しない。 | NFR002 |
| INV004 | audit write failure は再帰的な error audit を起こさない。 | R001 |
| INV005 | malformed drops file は doctor warning で扱い、doctor を crash させない。 | R002 |
| INV006 | collector、dashboard、cloud infrastructure は U001 の範囲外にする。 | R003 |
| INV007 | `skills/` と `.coderabbit.yml` または `.coderabbit.yaml` は変更対象外にする。 | scope boundary |

## Postconditions

| ID | Rule | Verification |
|---|---|---|
| POST001 | error directive の deterministic fixture で `ERROR_LOGGED` が残る。 | R001-AC1 |
| POST002 | top-level catch の deterministic fixture で `ERROR_LOGGED` が残る。 | R001-AC2 |
| POST003 | stdout JSON parse test が telemetry と audit path で通る。 | NFR001 |
| POST004 | hook drop fixture が standard doctor output に反映される。 | R002 |
| POST005 | malformed drops fixture で warning が出て doctor は続行する。 | R002 |
| POST006 | no-op default no-send test が通る。 | NFR002 |
| POST007 | test exporter seam で command span、error span、doctor metrics を観測できる。 | R003 |

## Validation Logic

Error Audit は tool name、command、error detail の欠落を validation error とする。

workflow record がない場合、Error Audit は no-op result とし、command の既存 error envelope を維持する。

Hook Drop Doctor は timestamp と reason を parse できない行を malformed entry として扱う。

Telemetry Core は exporter 設定がない場合、span と metric 呼び出しを no-op result にする。

Doctor Composition は標準表示に full history を混ぜない。

## Policies

adapter または wrapper を先に検討し、parity lock 対象の直接変更を避ける。

locked file の変更が不可避な場合は、U003 の PR readiness traceability へ理由を渡す。

テストは deterministic fixture と in-memory または test exporter を使う。

`npm run typecheck` と Intent validator は PR readiness の証拠に含める。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

規則は `requirements` の acceptance criteria と対応している。

不変条件は audit taxonomy、stdout JSON、OpenTelemetry no-op default の破壊を防ぐ粒度で定義されている。
