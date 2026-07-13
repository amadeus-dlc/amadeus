# Release & Migration Closure Security Requirements

## 上流とdata classification

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-06は既存provider/GitHub認証を使用するが、credentialをrelease receipt/report/docsへ複製・永続化しない。

| Data | Classification | Persistent | Control |
|---|---|---:|---|
| repository/tree/contract/candidate/report digest | internal | yes | canonical immutable binding |
| driver/harness/platform/profile/verdict/count | internal | yes | closed allowlist schema |
| provider prompt/raw stream/session/state | confidential/tainted | no | sealed summary only |
| provider/GitHub credential/token/account | restricted | no | publisher/process env only |
| Issue number/URL/marker/body digest/status | public/internal | yes | repository/marker validation |
| local home/worktree path、CI raw log | sensitive operational | no | digest/receipt projection |

## Security requirements

| ID | Requirement | Acceptance |
|---|---|---|
| U06-SEC-01 |全receipt/index/reportをsame repository/tree/contractへexact bindし、stale commit/別worktree/duplicate IDを拒否する | mismatchがclosed 0件 |
| U06-SEC-02 | release input manifestからreceipt/report/provider summary/machine runtimeを除外し、自己参照・local secret取込を防ぐ | canary path非読取 |
| U06-SEC-03 | live indexはprovider Unitのsealed allowlist summaryだけを読み、raw stream/session/stateを再parseしない | raw input port call 0 |
| U06-SEC-04 | report/errorはcode/subject/expected-observed digestだけを持ち、credential/prompt/raw response/pathを持たない | secret/sensitive canary 0件 |
| U06-SEC-05 | production registryは実composition rootをbuildし、fake/no-op/unavailable/dynamic/unknown adapterを拒否する | planted adapterがgreen 0 |
| U06-SEC-06 | package/docs/source ownershipをmanifestで固定し、generated targetの直接編集をgreenにしない | hand-edited dist rejection |
| U06-SEC-07 | Issue publisherはfixed repository/marker、日本語title/body/checklistを使い、tokenをbody/log/referenceへ保存しない | publisher canary scan |
| U06-SEC-08 | marker多重、closed-only、create後競合ではreopen/delete/additional createを0件にする | mutation spy |
| U06-SEC-09 | Issue URL/number/status/body digestを再検索結果へ照合し、別repository/markerを拒否する | spoof reference rejection |
| U06-SEC-10 |新GitHub SDK、cloud service、database、dynamic plugin/runtime dependencyを追加しない | dependency guard |

## STRIDE assessment

| Threat | Exposure | Required mitigation |
|---|---|---|
| Spoofing |別repo/tree/CI/live/Issueをrelease proofに偽装 | repository/tree/contract/run SHA/marker exact binding |
| Tampering |dist/docs/receipt/report/Issue body改変 | source ownership、read-only drift、canonical digest、re-search |
| Repudiation |driver live/test/Issue作成の否認 | candidate-bound receipt、verdict、Issue URL/body digest |
| Information disclosure |provider/GitHub credential、prompt、raw trace、home path | sealed summary、allowlist report、canary scan |
| Denial of service |大量finding、Issue競合、stale receipt | bounded manifest、canonical aggregate、single publisher、blocked state |
| Elevation of privilege |generated targetを正本化、fake adapter、Issueへの任意write | manifest/composition validation、fixed marker/repository/checklist |

## Compliance and audit

規制対象data処理を新設しないためPCI-DSS/HIPAA/GDPR適合を新規表明しない。共通controlとしてsupply-chain/source ownership、same-tree provenance、credential非保存、redacted live evidence、single publisher、immutable reportを証拠化する。

closed reportには各domainのreceipt digest、coverage map digest、Issue reference、candidate IDだけを保存する。外部URLだけをproofにせず、SHA/job conclusion/body/status/digestをclosed schemaで検証する。

## Security test gate

stale commit、別worktree、duplicate receipt、raw/secret field、fake adapter、hand-edited dist、Issue marker/repository/number競合、closed-only、create後open2、token canaryをdeterministic suiteへ含める。secret漏えい、fake/live昇格、任意Issue mutation、generated source ownership違反はmerge blockerである。
