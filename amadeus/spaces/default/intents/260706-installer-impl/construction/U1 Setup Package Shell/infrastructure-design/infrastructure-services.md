# Infrastructure Services — U1 Setup Package Shell

> Stage: construction / infrastructure-design  
> Unit: U1 Setup Package Shell

## Service Inventory

U1 introduces no databases、caches、message queues、search services、CDN、DNS、load balancers、or service discovery. Infrastructure services are limited to package and CI-adjacent services.

| Service | Role | Ownership |
|---|---|---|
| npm package metadata | bin exposure and package boundary | `packages/setup` |
| GitHub Actions PR gates | package metadata and smoke validation | U7 |
| GitHub Actions release dry-run | package dry-run evidence before publish | U8 |
| Local Bun runtime | CLI process execution | user/developer environment |

## External Service Boundaries

GitHub archive download、target filesystem mutation、manifest store、and npm registry publish are not U1 infrastructure services. They are owned by U2-U8 according to `components.md` and `services.md`.

U1 may expose package metadata consumed by U7/U8 gates, but U1 does not configure credentials or network endpoints.

## Secrets And Configuration

U1 has no runtime secrets. The npm bin wrapper must not read npm tokens or release credentials. CI/release credentials are intentionally outside U1 and handled in U7/U8 protected boundaries.

Configuration is command-line argv only:

- command: `install` or `upgrade`;
- flags: `--harness`, `--target`, `--version`, `--yes`, `--force`;
- help aliases.

## Service Availability

There is no hosted availability target. Reliability is measured as deterministic CLI startup and classified exits. CI availability is a GitHub Actions operational concern and does not change U1 runtime design.

## Upstream Coverage

- `performance-design.md`: service inventory avoids heavy infrastructure imports on help/error paths.
- `security-design.md`: no runtime secrets and package contents controls reflect U1 trust boundaries.
- `scalability-design.md`: no daemon/shared state and O(1) parser/help behavior define service scale.
- `reliability-design.md`: classified errors and no-write proof replace hosted availability semantics.
- `logical-components.md`: package checker and shell components map to service-like responsibilities.
- `components.md`: package entrypoint/parser/package check define in-repo ownership.
- `services.md`: external GitHub/npm/GitHub Actions boundaries are separated from U1.
- `business-logic-model.md`: U1 does not resolve versions, inspect targets, fetch archives, plan, or write files.
