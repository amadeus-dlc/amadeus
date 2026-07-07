# Infrastructure Services — U2 Version And Distribution Source

> Stage: construction / infrastructure-design  
> Unit: U2 Version And Distribution Source

## Service Inventory

U2 introduces no managed database、cache、queue、search、CDN、DNS、load balancer、or hosted service discovery. It uses the following service boundaries:

| Service boundary | Role | Credential posture |
|---|---|---|
| GitHub tag source | list canonical repo tags | public/no credential for first release |
| GitHub archive source | fetch selected tag archive | public/no credential for first release |
| local temp filesystem | hold archive/extracted selected harness | per-invocation, cleaned |
| CI fake ports | deterministic tag/archive/failure behavior | no network |

## External Contracts

The canonical repository is `https://github.com/amadeus-dlc/amadeus`. Tag ordering is SemVer-based, not GitHub Release metadata-based. Archive fetch retry is adapter-owned and exactly one retry for transient failures.

U2 does not use npm registry, release credentials, or target project storage.

## Configuration

Configuration inputs are:

- selected/requested version from U1;
- selected harness from U1/application service;
- canonical repo constant;
- temp root from filesystem adapter/test harness.

No user-managed config file or secret store is required.

## Service Failure Behavior

| Failure | Classified behavior |
|---|---|
| tag listing unavailable | `tag-list-failed` or network-specific classified error |
| no stable tags | `no-stable-version` |
| explicit version missing | `version-not-found` |
| archive retry exhausted | `archive-fetch-failed` |
| invalid archive | `archive-invalid` |
| selected harness missing | `harness-dist-missing` |
| invalid metadata | `distribution-metadata-invalid` |

All failures occur before target mutation.

## Upstream Coverage

- `performance-design.md`: service boundaries separate network/fake port timing from local processing.
- `security-design.md`: public canonical GitHub access and archive containment define external service controls.
- `scalability-design.md`: no cache and one selected harness keep service usage bounded.
- `reliability-design.md`: classified failures and no-target-write behavior define service failure handling.
- `logical-components.md`: ports and temp manager define service boundaries.
- `components.md`: GitHub Archive Adapter and Distribution Metadata Reader define concrete ownership.
- `services.md`: GitHub Tag/Archive Source contract is directly represented.
- `business-logic-model.md`: decision tree maps service failures to outcomes.
