# Security Requirements: U002-subagent-status-audit

## 上流文脈

この security-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Subagent hook payload、Subagent outcome、`SUBAGENT_COMPLETED` audit row の data flow を定義している。

`business-rules` は、free text 推測禁止、event 名維持、additive field、stdout JSON 非干渉を定義している。

`requirements` は、R004、R007、R008、R009、NFR001、NFR004、NFR005 を定義している。

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| agent type | internal | audit field に残せる |
| agent id | internal |必要な場合だけ audit field に残す |
| status source | internal | trusted source の種類だけ残す |
| message excerpt | internal | 200 characters 以内に制限し、classification source にしない |
| outcome | internal | success、failure、unknown の enum として扱う |

U002 は authentication credential、token、secret、regulated personal data を分類対象にしない。

## STRIDE Requirements

| STRIDE | Requirement | Verification |
|---|---|---|
| Spoofing | hook payload の free text を identity や outcome の trusted source にしない。 | untrusted fixture |
| Tampering | `SUBAGENT_COMPLETED` event 名を削除または改名せず、outcome は additive field にする。 | audit taxonomy diff |
| Repudiation | success、failure、unknown を audit evidence として残し、missing source を unknown として追跡可能にする。 | fixture matrix |
| Information Disclosure | message excerpt は最小化し、stdout JSON と doctor output に secret を混ぜない。 | output inspection |
| Denial of Service | malformed or unexpected status value は unknown に正規化し、hook を crash させない。 | malformed payload fixture |
| Elevation of Privilege | `tool_input.status` を Subagent outcome として信頼しない。 | untrusted field fixture |

## Audit Integrity Requirements

`SUBAGENT_COMPLETED` の event 名は維持する。

outcome、source、evidence ref は additive field とする。

old row に outcome がない場合は unknown として読む。

old row を migration で書き換えない。

audit append failure は `AuditWriteResult.failed` として扱い、Subagent Status component が `.drops` 書き込みを所有しない。

## Compliance Requirements

この Unit は local CLI hook evidence を扱う。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing はない。

SOC 2 相当の auditability は、event 名維持、additive field、old row compatibility、deterministic fixture で支える。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Security requirement は誤分類と情報漏えいの両方を扱っている。

trustworthy status source を top-level field に限定しているため、free text や tool hook 状態による誤分類を避けられる。
