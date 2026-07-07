# Deployment Architecture — U1 Setup Package Shell

> Stage: construction / infrastructure-design  
> Unit: U1 Setup Package Shell

## Architecture Summary

U1はhosted deploymentを持たない。Deployment architectureは、`@amadeus-dlc/setup` のnpm package shell、local Bun process、and GitHub Actions validation surfaceで構成する。`services.md` の通り、U1はmicroservice、serverless、container、VM、database、network topologyを必要としない。

## Runtime Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| npm package | `packages/setup/package.json` + bin `amadeus-setup` | public package boundary。 |
| Local runtime | Bun-first CLI process | `npx` pathはbest-effort wrapper delegation。 |
| Application boundary | in-process Setup Application Service | parser成功後だけ下流へdelegate。 |
| CI validation | GitHub Actions gates | package metadata、dry-run、smokeで検証。 |
| Release validation | manual GitHub Actions workflow | U8でpublish前に再検証。 |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | parser/help/runtime smoke and package checks |
| GitHub Actions PR | U7 package metadata、typecheck、lint、smoke、dry-run gates |
| GitHub Actions release dry-run | U8 release validation without publish |
| user target machine | package shell starts and delegates to installer flow |

There is no dev/staging/prod hosted runtime for U1.

## Storage And Networking

U1 itself persists no storage and opens no network connection on help/error/parser paths. Target filesystem, GitHub archive, manifest writes, and npm publication are downstream or later-unit concerns. U1 package metadata is repository source, not runtime storage.

## Resource Sizing

Resource sizing is startup-focused:

- direct Bun help path imports parser/help/reporter only;
- Node/npm wrapper performs fixed Bun discovery and argv-array delegation;
- invalid commands exit before service construction;
- CI package checks run as bounded maintainer scripts.

## Upstream Coverage

- `performance-design.md`: thin startup path and no heavy imports shape deployment topology.
- `security-design.md`: safe wrapper delegation and package contents controls are deployment boundary requirements.
- `scalability-design.md`: stateless process and package size discipline define resource posture.
- `reliability-design.md`: classified exits and no target side effects define runtime behavior.
- `logical-components.md`: npm bin wrapper、Bun CLI entrypoint、parser、renderers、package metadata checker map to deployment surfaces.
- `components.md`: Setup Package Entrypoint and Package Check locations define package deployment.
- `services.md`: no long-running backend service and GitHub Actions external boundary define architecture.
- `business-logic-model.md`: Startup、Help、Command Parsing、Delegation workflows define deployment flow.
