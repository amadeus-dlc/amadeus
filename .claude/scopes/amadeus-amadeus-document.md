---
name: amadeus-document
depth: Standard
testStrategy: Minimal
keywords: []
description: Write or update Amadeus documentation grounded in measured implementation facts
---

# amadeus-document scope

Standard depth, minimal test strategy, for writing and updating the
Amadeus framework's own documentation — `README*.md` and everything under
`docs/` — where the prose must be grounded in what the implementation
actually does rather than in what it was once said to do.

The defining constraint is verification, not authoring. Documentation
drifts silently: nothing fails when a `docs/` page describes a flag that
was renamed three releases ago. This scope therefore keeps
reverse-engineering as a first-class stage so every claim traces to a
measured fact in `packages/framework/core/`,
`packages/framework/harness/<name>/`, or the git history — and keeps
build-and-test so the docs gates (legacy-refs, language rules, EN/JA
pairing) actually run.

## Why these stages, why skip those

Nine of the thirty-two stages execute: the three initialization stages,
then intent-capture, reverse-engineering, requirements-analysis,
functional-design, code-generation, and build-and-test.

**intent-capture** executes because the target document set is the
genuinely open question. The sibling incremental scopes (`amadeus-bugfix`,
`amadeus-refactor`) skip it since their subject is already fixed by an
Issue or a named module; documentation work arrives with "update the
docs", and which pages, for which reader, to what depth has to be pinned
before anything else is worth doing.

**reverse-engineering** is the core of this scope. It diff-refreshes the
codekb against the implementation and the git log so the writing starts
from measured behaviour. Skipping it is what produces confidently wrong
documentation, which is worse than no documentation — a reader cannot tell
a stale page from a current one.

**requirements-analysis** fixes, in testable form, which passage must match
which implementation fact. Without it "verify the docs against the code"
has no pass/fail criterion and build-and-test degenerates into a spell
check.

**functional-design** carries the information architecture: the inventory
of target files, the EN/JA translation-pair map, and the section layout.
This is the same reasoning that puts functional-design back into
`amadeus-refactor` — restructuring needs a target shape — applied to prose
structure instead of code structure.

**code-generation** is where the documents are actually written, and
**build-and-test** is where the documentation gates run. Documentation
work does not get to skip verification.

The rest is SKIP:

- **market-research**, **feasibility**, **scope-definition** — there is no
  new product to discover and no feasibility question, because everything
  being described is already implemented. (An Intent that wants to
  document planned-but-unbuilt behaviour does not belong in this scope.)
- **team-formation** — staffing is settled before the Intent starts.
- **rough-mockups**, **refined-mockups** — no UI surface; Markdown
  conventions decide presentation.
- **approval-handoff** — the ideation phase is almost entirely skipped, so
  there is no set of ideation decisions to hand across the phase boundary.
- **practices-discovery** — the documentation rules this scope obeys are
  already decided in `memory/project.md` and `memory/team.md`: docs are
  written in English by default, `amadeus/**/*.md` in Japanese, and paired
  EN/JA surfaces move in the same change. Rediscovering settled norms
  relitigates them.
- **user-stories** — correctness here is "the prose matches the
  implementation", judged by the requirements, not by actor/value stories.
- **application-design** — no components, services, or ADRs are being
  designed; the document structure lives in functional-design instead.
- **units-generation**, **delivery-planning** — a cohesive documentation
  pass is not worth splitting into Units and Bolts. Like the other
  incremental scopes, this one skips the walking-skeleton ceremony because
  there is nothing to bootstrap. Note the consequence: with
  units-generation skipped, the per-Unit loop degrades and
  code-generation artifacts still go in a Unit-shaped directory.
- **nfr-requirements**, **nfr-design** — no performance, availability, or
  security contract is in play; document quality is expressed as testable
  requirements instead.
- **infrastructure-design** — no infrastructure artifacts.
- **ci-pipeline** — the existing CI (typecheck, lint, `dist:check`,
  `promote:self:check`, `tests/run-tests.sh`) is reused as the single
  source of truth; this scope does not author new workflows.
- **deployment-pipeline**, **environment-provisioning**,
  **deployment-execution** — this repository has no application deployment
  substrate; releases run solely through `release.yml`'s manual
  `workflow_dispatch`, and documentation does not touch that surface.
- **observability-setup**, **incident-response**,
  **performance-validation**, **feedback-optimization** — there is no
  running service to instrument, page for, benchmark, or gather
  operational feedback from.

## Membership

No keyword triggers. `keywords: []` is deliberate: scope inference takes
the first alphabetical keyword match, so claiming a generic term like
`docs` or `readme` would permanently shadow other scopes on every future
cold start. This scope is selected explicitly with
`/amadeus --scope amadeus-document`. Making it inferable is a separate,
explicit human decision.

Initialization, intent-capture, reverse-engineering,
requirements-analysis, functional-design, code-generation, and
build-and-test execute; the rest is SKIP.

Lightening review 2026-07-28: only one completed amadeus-document intent
exists, too few for the evidence-mining methodology that lightened
amadeus-feature. Revisit once completed intents accumulate.
