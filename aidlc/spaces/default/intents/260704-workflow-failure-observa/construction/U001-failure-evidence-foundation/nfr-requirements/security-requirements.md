# Security Requirements: U001-failure-evidence-foundation

## 上流文脈

この security-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、error evidence、hook drop evidence、OpenTelemetry core 計装、doctor output の data flow を定義している。

`business-rules` は、stdout JSON 非干渉、audit append-only、no-op default、`skills/` 配布物境界、`.coderabbit.yml` 非変更を定義している。

`requirements` は、R001、R002、R003、R006、R007、R008 と NFR001、NFR002、NFR005 を定義している。

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| audit event fields | internal | append-only file-backed evidence として扱う |
| command context | internal | token、secret、personal data を含めない |
| error detail | internal | stack trace や secret を標準表示へ出さない |
| `.aidlc-hooks-health/*.drops` | internal | hook name、timestamp、reason に限定する |
| telemetry attributes | internal | command name、stage、Intent ref など低感度属性に限定する |

この Unit は cardholder data、PHI、consumer personal data を処理対象にしない。

外部 regulatory framework の必須制御は追加しない。

## STRIDE Requirements

| STRIDE | Requirement | Verification |
|---|---|---|
| Spoofing | telemetry や audit fields にユーザー認証を導入しないため、identity claim を新設しない。 | field review |
| Tampering | `ERROR_LOGGED` と hook drop evidence は append-only とし、既存 audit event を削除または改名しない。 | audit taxonomy diff |
| Repudiation | error directive と top-level catch は active workflow がある場合に `ERROR_LOGGED` として残す。 | deterministic audit fixture |
| Information Disclosure | stdout JSON と doctor standard output に secret、token、full stack trace、raw full history を混ぜない。 | output snapshot inspection |
| Denial of Service | malformed drops file は warning finding にし、doctor を crash させない。 | malformed drops no-crash test |
| Elevation of Privilege | `skills/` と `.coderabbit.yml` または `.coderabbit.yaml` を変更しない。 | diff inspection |

## Access and Permission Requirements

U001 は新しい network service、database、cloud IAM permission を要求しない。

file-backed evidence は既存 workspace の file permission 境界に従う。

OpenTelemetry exporter は明示設定がある場合だけ有効にする。

default no-op では network export を試みない。

## Logging and Redaction Requirements

`ERROR_LOGGED` は tool、command、error detail を含める。

error detail は secret や access token を含まない形に整形する。

doctor standard output は concise summary に限定する。

verbose detail は調査用途に分ける。

stdout JSON contract を持つ command は、diagnostics を stdout に出さない。

## Compliance Requirements

この Unit は local CLI tooling の failure observability を扱う。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing はない。

SOC 2 相当の auditability と change traceability は、audit event、deterministic test、Intent artifact、PR checklist で支える。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Security requirement は local file-backed evidence と stdout JSON 境界に合っている。

新しい外部権限や cloud infrastructure を要求していない。
