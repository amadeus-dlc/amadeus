# Security Requirements — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Security and Compliance Scope

`requirements.md` NFR-4と`business-logic-model.md` Design Boundaryにより、処理対象は公開repositoryの技術Markdown、git ref / SHA、件数、review / sensor / gate provenanceである。PII、PHI、cardholder data、password、token、credential、customer payloadを新規に収集・保存・送信しない。`technology-stack.md` の既存local Git / Bun基盤を使い、AWS resource、IAM、network、authentication service、encryption storeを追加しない。

PCI-DSS、HIPAA、GDPRの新規data-processing scopeは0件であり、新しいregulatory controlは非該当。既存repository policy、audit provenance、segregation of dutiesを緩和しないことがcompliance requirementである。

## Threat and Control Requirements

| STRIDE | Relevant threat | Required control | Pass condition |
|---|---|---|---|
| Spoofing | 無効なhuman / grant authorityを承認者として扱う | gate approval時にhuman turnまたは有効なstanding grantを検証 | authority失効 / 不一致でstop |
| Tampering | branch名の前進、partial scan、件数書換え | refをfull SHAへ解決し、SHA / path / pattern / countを同じrecordに保持 | 全fieldが同一SHAへtrace可能 |
| Repudiation | 誰がstage / landingを承認したか不明 | tool-owned audit、reviewer identity、grant id / human inputを保持 | provenance missingでstop |
| Information disclosure | auditへsecretやcredentialを混入 | 公開技術文書と非機密git metadataだけを記録 | secret / credential記録0件 |
| Denial of service | 大規模外部入力やremote dependency | 対象を固定2 pathに限定しlocal bounded scanを行う | remote availability依存0件 |
| Elevation of privilege | AIがPR / main / Issueを自発操作 | no-AI-mergeとowner境界を維持 | 本conductorのPR操作 / merge / close 0件 |

## Integrity and Authorization Rules

- `business-rules.md` BR-1〜BR-10をdeny-by-defaultで評価し、missing / non-green evidenceを目視でgreenへ補正しない。
- Content clean、fix ancestry、record landing、Issue stateを別fieldに保持し、1つのSHAで複数の事実を偽装できないようにする。
- Reviewは起票者以外2名の独立green verdictを要求する。author self-reviewを独立reviewに数えない。
- Gateはapproved verdictだけでなく、承認時点のauthority有効性を要求する。rejected / unresolved / expiredを「記録済み」として通さない。
- [PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183)等の外部CI証拠はhead SHAとcheck resultを結び付け、別headへ流用しない。同PRは別fix面のcontextual blocker evidenceであり、U001の`PreLandingEvidence.ciVerdict`、landing / close eligibilityにはadmissibleでない。

## Data Protection and Retention

| Data class | Examples | Requirement |
|---|---|---|
| Public technical content | 対象Markdown、Issue番号 | repository policyに従いversion control |
| Repository metadata | commit SHA、branch、review / CI verdict | exact provenanceとして保持、credentialを含めない |
| Workflow audit | sensor、§13、gate、grant id | tool-owned append、手作業でsuccess rowを捏造しない |
| Sensitive data | secret、token、PII / PHI | 本unitへの入力・出力・log記録を禁止 |

新しいdata retention、encryption algorithm、key rotation、residency policyは処理dataとstorageが増えないため設定しない。既存repositoryの保持policyを変更しない。

## Security Validation

- Target filesとintent recordにcredential-like valueを追加していないことをdiffで確認する。
- `git diff --check`、declared sensor、CI、独立reviewをすべてgreenにする。
- Gate provenanceとpush SHAをauditから再構成できることを確認する。
- PR merge、main merge、Issue close、branch protection変更、force pushが0件であることをhandoffで明記する。

Application source、dependency、IaC、containerを変更しないため、新規SAST / DAST / dependency / IaC scanの追加は非該当。ただし既存CIのfailed checkを無視しない。
