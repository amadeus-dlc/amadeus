# CI/CD Pipeline — U3 Target State And Manifest

> Stage: construction / infrastructure-design  
> Unit: U3 Target State And Manifest

## Pipeline Summary

U3 CI validates target-state classification, manifest schema handling, snapshot behavior, and no-write boundaries. There is no deployment or release step owned by U3.

## PR Gates

| Gate | U3 relevance |
|---|---|
| unit tests | manifest schema, path policy, state classifier |
| integration tests | temp target fixtures and snapshot md5 |
| security fixtures | invalid manifest, path traversal, no content leakage |
| no-write assertions | fake filesystem port ensures no writes |
| coverage registry | U3 target-state and manifest coverage keys |
| portability fixtures | paths with spaces, separators, md5 stability |

## Release Preflight

U8 release preflight may run U6/U7 test gates to ensure installer target-state behavior is valid before publication. U3 itself does not publish or create release artifacts.

## Secrets Management

U3 uses no credentials. It must not access npm tokens, GitHub release credentials, or environment secrets. Target paths and hashes are local metadata and should remain minimal in reports.

## Drift And Rollback

U3 writes nothing, so rollback is not applicable. Manifest write failure/repair is not U3-owned. If detection logic drifts, CI fixture failures block merge.

## Upstream Coverage

- `performance-design.md`: CI benchmarks cover manifest/sentinel/snapshot hot paths.
- `security-design.md`: no-write/path/content controls are CI fixtures.
- `scalability-design.md`: 2,000 manifest entries/files and fixed sentinel sets are fixture capacities.
- `reliability-design.md`: all target states and unknown md5 handling become required tests.
- `logical-components.md`: read-only ports and classifiers map to test seams.
- `components.md`: Target Detector/Manifest Store boundaries are CI targets.
- `services.md`: Application Service sequencing keeps manifest writes out of U3 tests.
- `business-logic-model.md`: Detection and Snapshot workflows define test scenarios.
