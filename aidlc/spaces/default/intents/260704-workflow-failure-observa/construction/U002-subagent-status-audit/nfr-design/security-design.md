# Security Design: U002-subagent-status-audit

## 上流文脈

この security-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、classification path を top-level field access に限定する目標を定義している。

`security-requirements` は、agent type、agent id、status source、message excerpt、outcome の分類と STRIDE 要件を定義している。

`scalability-requirements` は、event 名を増やさず additive field のまま扱う方針を定義している。

`reliability-requirements` は、unexpected status value を unknown に寄せる方針を定義している。

`tech-stack-decisions` は、message text classifier を採用しない判断を定義している。

`business-logic-model` は、Subagent hook payload から trusted source と message excerpt を分ける流れを定義している。

## Trust Boundary

| Boundary | Design |
|---|---|
| hook payload | `SubagentStop` の top-level field だけを trusted source とする。 |
| `tool_input.status` | tool hook の状態として扱い、Subagent outcome には使わない。 |
| message excerpt | 200 characters 以内に制限し、classification source にしない。 |
| audit row | `SUBAGENT_COMPLETED` event 名を維持し、outcome を additive field にする。 |
| old row | missing outcome を valid unknown として読む。 |

## Security Controls

Free text から success または failure を推測しない。

Transcript と last assistant message を classification source にしない。

Unexpected status value は unknown に正規化する。

Message excerpt は最小化し、secret や token を出さない。

stdout JSON command は Subagent Status の診断文を stdout に出さない。

`skills/` と `.coderabbit.yml` または `.coderabbit.yaml` は変更対象にしない。

## Audit Integrity Design

`SUBAGENT_COMPLETED` の event 名は維持する。

Outcome、source、evidence ref は additive field とする。

Old row を migration で書き換えない。

Audit append failure は `AuditWriteResult.failed` として扱う。

Subagent Status component は `.aidlc-hooks-health/*.drops` への書き込みを所有しない。

## Compliance Design

U002 は local CLI hook evidence を扱う。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing は追加しない。

SOC 2 相当の auditability は、event 名維持、additive field、old row compatibility、deterministic fixture で支える。

新しい network service、database、cloud IAM permission は要求しない。

## Verification Design

untrusted fixture で free text と `tool_input.status` が classification source にならないことを確認する。

audit taxonomy diff で event 名が維持されていることを確認する。

fixture matrix で success、failure、unknown が audit evidence として残ることを確認する。

output inspection で stdout JSON と doctor output に secret が混ざらないことを確認する。

malformed payload fixture で unexpected status value が unknown になることを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Security design は trusted source を明確に閉じている。

message text と `tool_input.status` を信頼しないため、誤分類を避けられる。
