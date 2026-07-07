# CI/CD Pipeline — U2 Version And Distribution Source

> Stage: construction / infrastructure-design  
> Unit: U2 Version And Distribution Source

## Pipeline Summary

U2 CI/CD validates source selection and archive handling without live GitHub dependence in deterministic gates. Release and PR gates may include smoke/integration tests, but blocking correctness uses fake ports and local fixtures.

## PR Gates

| Gate | U2 relevance |
|---|---|
| unit tests | SemVer tag ordering, explicit version mapping, duplicate preference |
| integration tests | archive extraction, metadata read/fallback, temp cleanup |
| security fixtures | traversal rejection, invalid metadata hard fail |
| smoke tests | package can reach source-load boundary without target mutation |
| coverage registry | U2 FR/US coverage keys remain mapped |
| dependency gate | any SemVer/archive/hash dependency rationale remains reviewed |

## Release Preflight

U8 release preflight reuses U7 gates. U2 release relevance is tag selection correctness, archive load validation, and package dependency discipline. Publish does not happen in U2.

## Secrets Management

No GitHub token is used for deterministic PR gates. Authenticated GitHub API support would require a later secrets and rate-limit design. npm publish credentials are U8-only.

## Drift And Rollback

U2 does not generate repository artifacts and does not deploy services, so there is no rollback. Failures block CI or return classified runtime errors before target mutation.

## Upstream Coverage

- `performance-design.md`: CI benchmarks use fake ports and local fixtures for U2-owned timing.
- `security-design.md`: archive containment and metadata validation are CI security gates.
- `scalability-design.md`: tag and file-count fixtures guard growth.
- `reliability-design.md`: retry ownership and no-target-write tests guard correctness.
- `logical-components.md`: ports and temp manager map to test seams.
- `components.md`: Version Resolver and adapters define CI targets.
- `services.md`: GitHub external service contract is mocked in deterministic gates.
- `business-logic-model.md`: default/explicit resolution and archive loading workflows define test scenarios.
