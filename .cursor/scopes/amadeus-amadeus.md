---
name: amadeus
depth: Standard
testStrategy: Comprehensive
keywords: []
description: Self-hosted Amadeus framework development without infrastructure operations
---

# amadeus scope

Standard-depth scope for using Amadeus to develop Amadeus itself. This is a
brownfield CLI and development-tool workflow: it keeps the requirements,
architecture, implementation, and comprehensive verification spine while
excluding product-market discovery, GUI design, infrastructure, deployment,
and production-operations ceremony.

This legacy compatibility name remains available for existing in-flight
intents. New work should select the equivalent `amadeus-feature` scope.

## Why these stages execute

Initialization always runs. Intent capture, feasibility, scope definition, and
approval handoff establish the change boundary and preserve the decision trail.
Reverse engineering and practices discovery refresh the current framework
architecture and contributor conventions before requirements analysis.
Application design, units generation, delivery planning, functional design,
and the NFR pass cover the core/harness boundary, deterministic behavior,
portability, audit integrity, and safe sequencing across generated surfaces.
Code generation then implements the approved units.

Build and test is the release-quality boundary for this scope. It must exercise
the repository's applicable `dist:check`, `promote:self:check`, `typecheck`,
`lint`, and test commands, and verify byte-parity and drift guarantees across
all generated `dist/<harness>` trees. Documentation and distributable changes
are part of the implementation and verification surface, not a deployment.

## Why these stages skip

Market research is unnecessary for continuous development of the known
framework. Team formation is stable across intents. Rough and refined mockups
are GUI-oriented; CLI interaction behavior belongs in requirements and the
functional/application designs. User stories are omitted for this
developer-tool scope, while user-visible acceptance criteria remain in the
requirements. Infrastructure design is inapplicable because Amadeus has no
provisioned runtime infrastructure.

CI pipeline creation is outside the default self-development path; the existing
CI contract is verified by build and test. The entire Operation phase is
skipped because `dist/<harness>` generation and `promote:self` synchronize
distributable and local self-install artifacts rather than deploy a running
service. There are no environments to provision, services to observe,
production incidents to handle, or operational feedback loops to configure.

## Membership

Eighteen of 32 stages execute. This composed scope is intentionally not
inferable by keyword and is selected explicitly with `--scope amadeus`.
