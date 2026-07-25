# Security Requirements: grant-authorization-domain

## Inputs and Threat Boundary

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を入力とする。CLI arguments、environment mode、audit files、directive carrierはtrust boundaryであり、grant authorization前に検証する。

## Authorization Controls

| ID | Threat | Required control | Pass condition |
|---|---|---|---|
| U1-SEC-01 | forged issuer provenance | actual `HUMAN_TURN`/issuer coordinatesを検証 | forged fixtureのauto approval 0 |
| U1-SEC-02 | cross-intent grant use / active cursor切替 | Route Idをspace全intentからexact lookupし、receipt owner intentとissue intentを一致させ、owner以外を操作しない | mismatchはtyped fallback、非owner intentのaudit/state delta 0 |
| U1-SEC-03 | Grant Id substitution | receipt Stage/Grant Idをcarrierへexact match | altered IDのmutation 0 |
| U1-SEC-04 | duplicate Route Id/Grant Id | workspace outer lock下のroute未使用確認とcommit exactly-one cardinality | duplicate route append/carrier 0、ambiguous commit fixtureのmutation 0 |
| U1-SEC-05 | unknown mode fail-open | canonical resolverで拒否 | unknown値のcandidate探索0 |
| U1-SEC-06 | protected event forgery | general audit appendからmint不可 | public CLI attempt nonzero |

## Data Protection and Compliance

grant eventはworkflow authorization metadataであり、PII/PHI/payment dataを追加しない。既存append-only audit retentionとrepository access controlを維持する。新しいregulatory framework、encryption key、credentialは不要である。

## Security Verification

STRIDE上、Spoofing/Tampering/Elevation of Privilegeを重点にする。fixtureはmalformed audit block、cross-shard revoke、cross-intent receipt、duplicate ID、stale receipt、new higher-priority grantを含む。fail-closedでもexpected invalidityを`ERROR_LOGGED`へ変換しない。

## Traceability and Verification Ownership

| Target | Upstream | Business rules | Fixture / blocking suite owner |
|---|---|---|---|
| U1-SEC-01 | NFR-03 | BR-04, BR-12, BR-25–26 | grant provenance unit suite |
| U1-SEC-02 | FR-02, FR-12–17, NFR-03 | BR-09, BR-23–26 | cross-intent transaction integration suite |
| U1-SEC-03 | FR-08, FR-12, NFR-03 | BR-23–27 | carrier substitution integration suite |
| U1-SEC-04 | FR-05, FR-12, NFR-03 | BR-14a, BR-23–24, BR-28 | cardinality unit suite |
| U1-SEC-05 | NFR-03, NFR-06 | BR-01–03 | mode resolver unit suite |
| U1-SEC-06 | NFR-01 | BR-22とAudit Invariants | audit CLI protection suite |
