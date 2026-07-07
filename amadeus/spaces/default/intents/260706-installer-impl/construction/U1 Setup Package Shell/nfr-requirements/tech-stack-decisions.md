# Tech Stack Decisions — U1 Setup Package Shell

> Stage: construction / nfr-requirements  
> Unit: U1 Setup Package Shell  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript / ESM | Matches `technology-stack.md` and existing repo conventions |
| Primary runtime | Bun | Required by `requirements.md` FR-002 and current Amadeus tooling |
| Node/npm behavior | best-effort wrapper delegation to Bun | Allows `npx` when Bun exists without promising Node-only compatibility |
| Package location | `packages/setup/` | Required by FR-003; keeps root package dev-only |
| CLI bin | `amadeus-setup` | Required by FR-001 and U1 business rules |
| Command parser | small local parser or existing zero/low-dependency parser | Avoid runtime dependency growth unless justified under NFR-005 |
| Reporter output | plain text snapshots | Keeps help/error output stable for CI and docs |
| Package validation | maintainer script plus U7 package gate | Ensures metadata/files/license/repository are checked before release |

## Explicit Non-Decisions

- Do not convert root `package.json` into the publishable installer package.
- Do not promise full Node runtime support in the first release.
- Do not add `init` alias.
- Do not introduce a backend service, daemon, database, or cloud infrastructure for U1.
- Do not make U1 import GitHub archive, target detection, planning, or apply adapters on help/parse error paths.

## Dependency Policy

Any runtime dependency added under `packages/setup/package.json` must include:

- purpose;
- user-facing benefit;
- why standard library or a small local parser is insufficient;
- package size impact;
- license compatibility;
- vulnerability scan status.

This satisfies `requirements.md` NFR-005 and the supply-chain risk surfaced by `technology-stack.md`.

## CI And Tooling

U1 implementation must integrate with the existing Bun/TypeScript toolchain:

- `bun run typecheck`;
- package-specific parser/help tests from U6;
- package metadata check from U7;
- package dry-run before U8 release;
- smoke test for Bun and best-effort `npx` behavior.

## Portability Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Delegation API | spawn Bun with argv array and inherited stdio | Avoid shell quoting bugs and command injection across macOS/Linux/Windows-compatible shells |
| PATH discovery | fixed Bun executable lookup with platform-aware path delimiter | Supports Bun-required failure without POSIX-only assumptions |
| Target path handling | preserve raw `--target` string without resolving during U1 parse | Allows paths with spaces and platform-specific separators; downstream units own filesystem semantics |
| Test strategy | Ubuntu CI smoke plus platform-neutral unit tests for argv/PATH behavior; optional Windows lane when available | Satisfies NFR-004 without requiring target filesystem mutation in U1 |

`technology-stack.md` notes current root metadata is stale for publication. U1 resolves this by creating `packages/setup/package.json`; it does not mutate root package identity into the installer.

## Upstream Coverage

- `business-logic-model.md`: U1 shell, parser, help, and delegation workflows drive stack choices.
- `business-rules.md`: package metadata, runtime, and command contract rules drive decisions.
- `requirements.md`: FR-001 / FR-002 / FR-003 / NFR-004 / NFR-005 are the primary constraints.
- `technology-stack.md`: TypeScript/ESM/Bun, root dev-only metadata, and current CI define the implementation baseline.
