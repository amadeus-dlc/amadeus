# Security Design — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Security Boundary

`security-requirements.md` の対象は公開Markdownとgit metadataであり、`tech-stack-decisions.md` と`business-logic-model.md` は新規auth、secret store、network、AWS resourceを禁止する。`performance-requirements.md` / `scalability-requirements.md` のlocal bounded scanと、`reliability-requirements.md` のtool-owned evidenceを組み合わせ、content integrityとauthority provenanceを守る。

## Trust Boundaries

| Boundary | Untrusted / mutable input | Validation | Trusted output |
|---|---|---|---|
| T1 Ref resolution | branch / tag文字列 | Gitでfull SHAへ解決 | immutable `MeasurementRef` |
| T2 Content inspection | SHA上の2 Markdown blob | fixed path、4語彙、H2 contract | path別counts / matches |
| T3 Evidence candidate | count、ancestry、CI / review / sensor / §13 / push | same-SHA、required fields、green verdict | `PreGateEvidenceCandidate` |
| T4 Approval | T3 candidate、human input / delegated grant | identity、scope、expiry、approved verdict | final `PreLandingEvidence` + valid gate provenance |
| T5 Landing handoff | T4 gate-ready evidence | human owner、no-AI-merge | explicit landed main ref |
| T6 Close handoff | landed counts / Issue state | Issue OPEN、post-landing green | close eligibility |

各boundaryはdeny-by-defaultで、missing、non-green、expired、rejected、mixed-refを次へ渡さない。

## Defense-in-Depth Controls

- Identity layer: ref文字列に加えてfull SHAを記録する。
- Content layer: marker / H2を独立計数し、ancestryをcontent cleanの代理にしない。
- Evidence layer: CI、2独立review、全declared sensor、§13、push SHAを個別fieldにし、LC-4が`PreGateEvidenceCandidate`を構築する。
- Authority layer: LC-5がcandidateとgate approvalを結合し、承認時点のhuman turnまたはstanding grantのscope / expiryを検証した後だけfinal `PreLandingEvidence`を構築する。
- Ownership layer: conductorからPR操作、main merge、Issue closeを切り離す。
- Audit layer: state transitionはAmadeus tool-owned auditだけで生成し、手書きsuccess rowを使わない。

## Authentication, Encryption, and Secrets

新規user / service endpointがないためauthentication / authorization flow、session、JWT、RBAC、CSRF / XSS headerは非該当である。公開technical contentと非機密git metadataだけを扱うため、新しいat-rest / in-transit encryption algorithmやKMS keyを設計しない。Secret / token / credentialはinput、artifact、logへ書かない。

既存repository access、GitHub protection、local credential管理を変更しない。別fix面のCI evidenceはU001の`PreLandingEvidence.ciVerdict`へ流用しない。

## Threat Response

| Threat | Response | Blast radius |
|---|---|---|
| Mutable ref moves | fixed SHAのsetを完結し、新refは別set | 当該measurementのみ |
| Marker / heading tampering | actual count / file:lineを記録してstop | landing handoffまで |
| Invalid approval authority | gateを解決せず新authorityを待つ | stage transitionのみ |
| Premature Issue close | ordering violationを報告 | close handoffのみ |
| Secret-like input discovered | artifactへ転記せず停止・escalate | repository disclosureを防止 |

## Compliance Mapping

新規PCI-DSS / HIPAA / GDPR data scopeは0件。Compliance evidenceは、公開data classification、no secret、segregation of duties、tool-owned audit、head-bound CI / review provenanceである。AWS Well-Architected review、IAM、VPC、CloudTrail追加はAWS workloadがないため非該当である。
