# Driver Contract & Selection Policy Security Requirements

## 上流とdata classification

本成果物は`business-logic-model.md`、`business-rules.md`、`requirements.md`、brownfield `technology-stack.md`のU-01 boundaryを消費する。U-01は認証を行わず、既存provider credentialへ触れない。

| Data | Classification | Persistent | Control |
|---|---|---:|---|
| driver/harness/topology/reason ID | internal | output可 | closed enum |
| env key presence | internal | classificationのみ | known-key projection |
| env raw value | confidential/tainted | no | 即時parse後破棄 |
| provider credential/token/cookie | restricted | no | U-01入力外 |
| prompt/message/raw response | confidential | no | schemaで表現不能 |

## Security requirements

| ID | Requirement | Acceptance |
|---|---|---|
| U01-SEC-01 | `AMADEUS_SWARM_DRIVER`と`AMADEUS_USE_SWARM`以外のenv key/valueを読まない | canary getter access 0 |
| U01-SEC-02 | 新旧key併存は値を比較せず`CONFLICTING_ENV`でfail closed | side effect 0、raw値出力0 |
| U01-SEC-03 | 新driver inputはexact case-sensitive 5値だけを受理する | injection/whitespace/path/shell文字列を全拒否 |
| U01-SEC-04 |旧値は`1|other`へ分類し、生値をerror/outcomeへ保持しない | secret canary非出力 |
| U01-SEC-05 | schemaは`additionalProperties=false`、secret-like fieldをconstructor前に拒否する | planted field test |
| U01-SEC-06 | errorはcode/accepted IDs/field pathだけを持ち、値/stack/raw payloadを持たない | error snapshot scan |
| U01-SEC-07 | explicit harness mismatch/unavailableでfallbackやside effectを開始しない | no-call spy |
| U01-SEC-08 | registrationはstatic closed setで、dynamic module/path/plugin inputを受理しない | unknown descriptor rejection |
| U01-SEC-09 | dependencyは現行pin済みBun/TypeScript/test toolingだけとし、runtime packageを追加しない | lock/package diff guard |

## STRIDE assessment

| Threat | U-01 exposure | Required mitigation |
|---|---|---|
| Spoofing | harness/provider identityの偽装 | harnessはdetected closed value、driver ownership exact match |
| Tampering | capability/topology collection改ざん | frozen value、canonical sort、schema validation |
| Repudiation | selection理由の否認 | canonical redacted outcome/digestをU-02へ渡す |
| Information disclosure | env/credential/prompt漏えい | allowlist schema、生値非保持、canary scan |
| Denial of service | huge/duplicate signal collection |既存input上限、dedupe、`O(n log n)` bound |
| Elevation of privilege |別harness driver/dynamic plugin実行 | explicit mismatch hard error、dynamic load禁止 |

## Compliance and audit

PCI-DSS、HIPAA、GDPR固有data flowは追加されないため新規compliance claimは行わない。共通controlとして次を証拠化する。

- secret canaryがsuccess/error/canonical JSONへ0件。
- selection outcomeがrequested/selected/reasonを再現可能。
- dependency/lockfile、typecheck、lint、test receiptがPRに紐づく。
- suppression/waiverでsecret testやclosed-schema testをskipしない。

## Security test gate

全5値、空文字、NUL/改行/Unicode/whitespace、shell metacharacter、floor ID、別harness、unknown property、prototype-like keyをfixture化する。Critical/High相当はmerge blockerで、例外を設けない。U-01はnetwork/file/commandを実行しないためDAST/IaC/cloud security scanはN/Aである。

