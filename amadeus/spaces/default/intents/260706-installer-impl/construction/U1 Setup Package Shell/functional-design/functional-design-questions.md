# Functional Design Questions — U1 Setup Package Shell

> Stage: functional-design / Unit: `U1 Setup Package Shell`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Question Assessment

No additional human questions are required for this unit. The upstream artifacts already fix the relevant user-visible contract:

- `requirements.md` fixes the CLI commands as `install` and `upgrade`, with `init` explicitly rejected for the first release.
- `unit-of-work.md` scopes U1 to package metadata, bin exposure, Bun/npx startup, parser, and runtime shell.
- `unit-of-work-story-map.md` maps U1 to US-001, US-002, US-003, US-004, and US-009.
- `components.md`, `component-methods.md`, and `services.md` define the hexagonal boundary: entrypoint/parser are shell concerns and delegate to application service/domain ports.

[Answer]: No additional questions. Proceed with artifact generation from accepted upstream contracts.

