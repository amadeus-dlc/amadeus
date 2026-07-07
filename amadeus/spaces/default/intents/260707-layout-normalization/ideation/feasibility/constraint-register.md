# Constraint Register

## Upstream Trace

This register traces to the `intent-statement` for Issue 610, which requires comparing repository layout candidates, inventorying path impact, and documenting either a migration plan or a no-migration rationale.

## Technical Constraints

| ID | Constraint | Impact |
| --- | --- | --- |
| C-01 | `scripts/package.ts` derives `CORE_ROOT` from root-level `core/` and `HARNESS_ROOT` from root-level `harness/`. | Full normalization must update build input discovery without breaking `dist:check`. |
| C-02 | `dist/<harness>/` is committed generated output and is checked byte-for-byte. | Any output relocation changes a large committed tree and must be regenerated, not hand-edited. |
| C-03 | `scripts/promote-self.ts` copies from root-level `dist/` into root-level `.claude/`, `.codex/`, and `.agents/`. | Self-install paths must remain compatible or be migrated with explicit merge logic. |
| C-04 | Existing docs describe the root-level three-zone model. | A migration changes user and maintainer mental models and requires coordinated docs updates. |
| C-05 | Tests import and reference `dist/claude/.claude/...` and other root-level generated paths. | Test fixtures and path helpers need a systematic update if generated output moves. |
| C-06 | The current checkout has no `packages/` directory, and the user clarified `packages/setup` will proceed in a separate parallel intent. | Later planning must model `packages/setup` as a planned sibling package and avoid blocking this design intent on that implementation. |

## Organizational Constraints

| ID | Constraint | Impact |
| --- | --- | --- |
| O-01 | Team rules forbid hand-editing `dist/<harness>/`. | Directory moves must be scripted and regenerated. |
| O-02 | Source, distribution, and self-install trees must not drift across commits. | Migration commits need to include source changes, regenerated `dist/`, and affected self-install updates together. |
| O-03 | This work was split from installer implementation to reduce blast radius. | The layout decision should not silently reopen unrelated installer behavior. |
| O-04 | Amadeus workflow records are version-controlled checkpoints. | Design and migration rationale should be committed with the workflow artifacts. |
| O-05 | `packages/setup` is a parallel intent, not a subtask of this workflow. | Cross-intent coordination should be documented as a dependency, not absorbed into this scope. |

## Compliance Constraints

| ID | Constraint | Impact |
| --- | --- | --- |
| G-01 | Decision rationale must be auditable. | The final recommendation needs an ADR or equivalent design record linked to issue #610. |
| G-02 | Release evidence must remain deterministic. | Existing drift and test commands must remain part of the acceptance path. |
| G-03 | Generated output ownership must stay explicit. | Moving `dist/` under a package must not make generated artifacts look hand-authored. |

## Non-Constraints

- AWS accounts, regions, IAM, and cloud service limits are not relevant to this intent.
- External regulatory frameworks such as PCI, HIPAA, SOC 2, GDPR, and FedRAMP are not indicated by the current scope.
- UI mockups and end-user workflows are not part of the feasibility surface.
