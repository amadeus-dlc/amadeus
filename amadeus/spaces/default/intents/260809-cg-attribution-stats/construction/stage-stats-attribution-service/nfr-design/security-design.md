# Security Design — stage-stats-attribution-service

## Scope and upstream applicability

present consumeの `business-logic-model.md` を対象とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected-absentで、declared NFR requirement IDはない。`requirements.md:291-309`と`services.md:106-112`はcontext evidenceに限定する。

## Trust boundaries and controls

| Boundary | Threat | Control | Failure |
|---|---|---|---|
| process argv | unsafe slug、範囲外N、未知flag | typed parserをscan前に実行 | stderr usage、stdoutなし、exit 2 |
| project/space filesystem | unreadable/corrupt shard | existing reader、partial count、read-only access | 読めたreport + exit 1 |
| audit/Event Set content | malformed、digest/identity mismatch、raw payload漏洩 | U-02 closed validation、stable reasonのみ | candidate rejection、repairなし |
| measured/attribution join | identity collision、cross-intent混入 | length-prefixed tuple、unique join、explicit intent/stage | ambiguous exclusion |
| cross-component result | duplicate/lost candidate、seconds invariant | C-05全単射/恒等式reconciliation | reportなし、exit 1 |
| renderer output | Markdown/CSV formula/field injection、JSON破損 | existing safe/csv escaping、JSON serializer、semantic valuesだけ | test failure、正常出力なし |

raw payload、hash実値、unbounded diagnosticをerrorへechoしない。reportはstable reason、safe source identity、aggregate countに限定する。CSVは既存escapingを再利用し、renderer内でraw rowを参照しない。

## Authorization, confidentiality, and compliance

認証・認可、IAM、TLS、at-rest encryption、secret management、security header、CSRF/XSSは非適用である。operatorのlocal filesystem権限は既存CLI boundaryで、新しいprincipal、network、credential、storageを追加しない。

compliance controlは、audit/intent state/memory/codekbを変更しないこと、malformed inputを修復しないこと、観測値とinstrumentation hypothesisを分離すること、partial scan scope/unreadable countを全formatで開示することである。新しいPII source、retention、external transferはない。

## Decision traceability

| Security decision | Declared requirement | Context evidence / verification |
|---|---|---|
| argvをI/O前にtyped parse | Missing (`security-requirements.md` absent) | `requirements.md:291-293`; unsafe argvでscan 0回 |
| read-only partial scan | Missing | `requirements.md:307-309`; scratch corpus hash不変 |
| malformed evidenceを理由付きreject | Missing | `requirements.md:291-293`; rejection fixture |
| explicit intent/stage/unique join | Missing | 同上; overlapping-intent fixture |
| cross-component reconciliation fail-closed | Missing | `requirements.md:283-293`; stdout 0 byte |
| raw payload非開示とstable diagnostic | Missing | `services.md:108-111`; output deny-list |
| 3renderer escaping | Missing | existing renderer contract; injection fixture |
| observed facts/hypothesis分離 | Missing | `business-logic-model.md` Candidate evidence; schema assertion |
| auth/IAM/TLS/secret非適用 | Missing | external trust/resource boundaryなし; dependency census |
| compliance read-only/partial reference | Missing | `requirements.md:307-309`; 3format reference parity |

## Verification and residual risk

unsafe argv、unreadable shard、malformed Event Set、identity collision、accounting invariant、escaping payloadをfocused testsで検証する。TypeScript processはlocal operator権限でcorpusを読めるため、OS-level access controlは既存境界に依存する。本Intentは権限を拡張せず、read-onlyと情報最小化でblast radiusを増やさない。
