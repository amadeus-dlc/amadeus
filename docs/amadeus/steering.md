# Space Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Initialization Stage](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/initialization.md)
- [AI-DLC v2 Rule System](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/08-rule-system.md)

## Positioning

Space is not a phase of Amadeus DLC.

Space is the foundation that aligns the purpose, policy, knowledge, terminology, actors, external systems, and Intent list shared across the whole workspace before work proceeds into Ideation, Inception, and Construction. It corresponds to AI-DLC v2's space memory.

Space scaffolding is owned by the engine: the workspace-scaffold initialization stage (0.1) creates this Space (`amadeus/spaces/<space>/`), greenfield or brownfield, and the `space` / `space-create` utility verbs list, switch to, and create Spaces.

Treating Amadeus itself as the target workspace is also handled as brownfield. There is no dedicated self-development steering mode: the engine inspects the existing materials and the existing `amadeus/` tree, then fills in only the Space artifacts that are missing.

Space does not own design decisions. The Domain Map and Context Map start as empty indexes at Space initialization; their content is updated only from Construction's approved artifacts (adoption decisions surfaced as Functional Design reflection candidates).

## Responsibility

Space scaffolding handles only the workspace's initial context and the artifacts its initialization requires.

It does not create the lifecycle artifacts of an individual Intent. When an individual Intent is needed, it hands off to the single entry point `amadeus`'s Intake.

Space scaffolding does not make adoption decisions for Subdomains, Bounded Contexts, cross-context dependencies, detailed Domain Models, or contracts. Later stages handle those, based on the target stage's artifacts, decisions, traceability, and approvals.

## Artifacts

| Artifact | Description |
|---|---|
| `memory/org.md` | Amadeus DLC's organizational defaults |
| `memory/team.md` | Team working conventions (overrides `org.md`) |
| `memory/project.md` | Project-specific judgment criteria (overrides `team.md`) |
| `memory/phases/` | Phase-specific supplements (optional) |
| `memory/templates/` | Project-specific template overrides (optional) |
| `knowledge/glossary.md` | Glossary for Amadeus DLC as a whole |
| `knowledge/actors.md` | Actor list |
| `knowledge/external-systems.md` | External system list |
| `knowledge/background.md` | Background, assumptions, and open questions |
| `knowledge/domain-map.md` | Index of adopted or retired Subdomains and Bounded Contexts (empty at initialization) |
| `knowledge/context-map.md` | Index of adopted or retired cross-context dependencies (empty at initialization) |
| `knowledge/event-storming/` | Event Storming performed before Intent creation |
| `codekb/<repo>/` | Codebase knowledge (v2's codekb); an optional directory created in brownfield |
| `intents/intents.json` | Intent registry (the canonical ledger); empty `[]` at initialization. A human-readable list is generated from it on demand (the `intents.md` index is retired — GD009) |
| `intents/active-intent` | Cursor (gitignored); Initialization writes its value |
| `intents/<dirName>/` (record) | Artifacts of an individual Intent; created by Initialization |

## Self-Development Bootstrap

In self-development bootstrap, the initial `amadeus/` may serve as a bootstrap rather than the adoption target.

When a promoted skill recreates the Space, the pre-recreation Space is evacuated to `.amadeus-snapshots/previous/`; the evacuated copy stays outside git and retains only the most recent generation.

Only the adoption decision from the diff review is summarized into the adoption target Space's existing artifacts — `knowledge/background.md` for a full self-development cycle, or the target phase's `decisions.md` for a single Intent's regeneration.

This handling does not depend on how the Space scaffolding is executed.

## Notes

AI-DLC v2's Initialization (Stage 0.1–0.3) runs directly: the single entry point `amadeus` executes it immediately after Birth approval, creating the Intent record scaffold and `amadeus-state.md`. Filling in the Intent Record's content is the responsibility of the following Ideation Stage 1.1, Intent Capture & Framing.

Space scaffolding differs in scope from the per-Intent part of Initialization: it builds the shared foundation of the Space (`amadeus/spaces/<space>/`), not an individual Intent's record. It prepares the containers for the Space's `memory/`, `knowledge/`, and `intents/`; Initialization creates the record for each individual Intent.

## Cross-References

- [Lifecycle Overview](lifecycle/overview.md)
- [Ideation Phase Stages](lifecycle/ideation.md)
- [ADR 0002: Adopt the Intent Phase Directory Layout](../adr/0002-intent-phase-directory-layout.md)
- [Extension Guide](extension-guide.md) — which extension point among `memory/`, `knowledge/`, `codekb/`, and others to use, and whether humans may edit it directly
