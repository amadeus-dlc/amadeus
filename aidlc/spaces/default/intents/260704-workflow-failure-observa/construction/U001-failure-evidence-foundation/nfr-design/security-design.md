# Security Design: U001-failure-evidence-foundation

## 上流文脈

この security-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、診断処理を bounded に保つ必要を定義している。

`security-requirements` は、audit field、command context、error detail、`.drops`、telemetry attributes の分類と STRIDE 要件を定義している。

`scalability-requirements` は、standard summary と verbose detail の分離を定義している。

`reliability-requirements` は、telemetry failure と audit failure の fault isolation を定義している。

`tech-stack-decisions` は、OpenTelemetry を facade の背後に置き、collector と dashboard を追加しない判断を定義している。

`business-logic-model` は、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の data flow を定義している。

## Trust Boundary

| Boundary | Design |
|---|---|
| command context | tool name、command name、stage、Intent ref だけを低感度属性として扱う。 |
| error detail | secret、token、full stack trace を標準表示に含めない。 |
| audit fields | append-only evidence として扱い、既存 event 名を削除または改名しない。 |
| `.aidlc-hooks-health/*.drops` | hook name、timestamp、reason だけを標準 summary に含める。 |
| OpenTelemetry attributes | low-cardinality で低感度の属性に限定する。 |

## Security Controls

Telemetry Core は identity claim を新設しない。

Error Audit は `ERROR_LOGGED` field を additive に構築する。

Hook Drop Doctor は malformed file を warning finding にし、例外として外へ漏らさない。

Doctor Composition は standard output に raw full history を混ぜない。

JSON stdout command は human-readable diagnostics を stdout に出さない。

`skills/` と `.coderabbit.yml` または `.coderabbit.yaml` は変更対象にしない。

## OpenTelemetry Control

OpenTelemetry exporter は明示設定がある場合だけ有効にする。

default no-op では network export を試みない。

test exporter seam は deterministic test のために使う。

collector、dashboard、cloud infrastructure は U001 の required component にしない。

## Data Protection Design

Audit event fields は internal data として扱う。

Command context は secret や personal data を含めない。

Error detail は human-readable に整形するが、stack trace 全体や credential を出さない。

Telemetry attributes は command name、stage、Intent ref に限定する。

Verbose detail は標準表示と分け、調査時だけ参照する。

## Compliance Design

U001 は local CLI tooling の failure observability を扱う。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing は追加しない。

SOC 2 相当の auditability は、audit event、deterministic test、Intent artifact、PR checklist で支える。

AWS IAM、database、network permission は新設しない。

## Verification Design

Output snapshot inspection で secret、token、full stack trace が標準表示に混ざらないことを確認する。

Audit taxonomy diff で既存 event 名が維持されていることを確認する。

malformed drops fixture で doctor が crash しないことを確認する。

no-op default no-send fixture で network export がないことを確認する。

diff inspection で `skills/` と `.coderabbit.yml` または `.coderabbit.yaml` が変更されていないことを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Security design は file-backed evidence と stdout JSON 境界を分けている。

新しい外部権限、database、cloud infrastructure を要求していない。
