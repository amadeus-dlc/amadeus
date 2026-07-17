---
slug: reverse-engineering
phase: inception
execution: CONDITIONAL
condition: Execute when project is brownfield. Always rerun for freshness. Skip for greenfield projects.
lead_agent: amadeus-developer-agent
support_agents:
  - amadeus-architect-agent
mode: subagent
produces:
  - business-overview
  - architecture
  - code-structure
  - api-documentation
  - component-inventory
  - technology-stack
  - dependencies
  - code-quality-assessment
  - reverse-engineering-timestamp
consumes: []
requires_stage:
  - state-init
sensors:
  - required-sections
  - upstream-coverage
  - answer-evidence
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - refactor
  - security-patch
  - workshop
inputs: <record>/amadeus-state.md
outputs: "amadeus/spaces/<active-space>/codekb/<repo>/ (9 artifacts: business-overview.md, architecture.md, code-structure.md, api-documentation.md, component-inventory.md, technology-stack.md, dependencies.md, code-quality-assessment.md, reverse-engineering-timestamp.md)"
---

# Reverse Engineering

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Check Conditions

Read `<record>/amadeus-state.md` to confirm:
- Project type is brownfield

If project is not brownfield, skip this stage and update amadeus-state.md with skip reason.

#### Resolve the intent's repo set (multi-repo)

This stage runs **per repo** the intent touches. Resolve the repo set from the
intent's registry row before scanning:

1. Read the active intent's `repos` array from
   `amadeus/spaces/<active-space>/intents/intents.json` (the row whose `uuid`/`slug`
   matches the active intent). This is the set captured at intent birth (an explicit
   `--repos a,b` or sibling auto-discovery).
2. **Single-repo / unrecorded:** if `repos` is absent, empty, or has exactly one
   entry, RE runs once against the lone repo — the same flow as before. (An
   unrecorded set means the workspace root is itself the single repo.)
3. **Multi-repo:** if `repos` has more than one entry, run Steps 2–3 **once per
   repo**, scanning that repo's sibling directory (`<workspace>/<repo>/`) and writing
   its 9 artifacts to the directory `codekb-path --repo <repo>` prints (the
   space-level `amadeus/spaces/<active-space>/codekb/<repo>/`; see Step 3). Each repo's codekb is independent;
   nothing in one repo's scan blocks another's, so the per-repo scans may run as
   parallel subagents.

In the steps below, `<repo>` is the repo currently being scanned; repeat for each
repo in the set.

#### Preflight: refresh from the latest reachable codekb

The per-repo codekb store is shared across every intent in the space and is
committed to the trunk. Before scanning, take in the latest reachable state so
this refresh diffs from an up-to-date base instead of a stale one:

1. Fetch/integrate the trunk into the working tree by your team's normal means
   (e.g. `git fetch` + rebase/merge onto the base branch), so any RE artifacts
   another intent already committed under
   `amadeus/spaces/<active-space>/codekb/<repo>/` are present locally.
2. If a merge touches codekb body artifacts, prefer the incoming latest — the 8
   body artifacts are last-writer-wins derived caches (see Step 3). Your own
   per-intent scan record (Step 3) is a distinct file and never conflicts.

This keeps the differential refresh honest without serialising intents.

### Step 2: Developer Code Scan

Delegate to Task tool with amadeus-developer-agent:
- subagent_type="amadeus-developer-agent"
- The agent persona and knowledge are loaded automatically. Do NOT manually inject the persona.
- Include workspace state from amadeus-state.md as context

Developer scans `<repo>`'s codebase (the sibling dir `<workspace>/<repo>/`; for a
single-repo intent this is the whole codebase) for:
- All packages, modules, and their purposes
- Build systems, configuration, and dependency relationships
- External and internal APIs (endpoints, contracts, methods)
- Frameworks, libraries, and their versions
- Test directories, test frameworks, coverage configuration
- Code quality indicators (linting, CI/CD, documentation)
- Technical debt signals

Developer returns structured scan results following the Developer Code Scan Template in `templates/re-artifacts.md`.

### Step 3: Architect Synthesis

Delegate to Task tool with amadeus-architect-agent:
- subagent_type="amadeus-architect-agent"
- The agent persona and knowledge are loaded automatically. Do NOT manually inject the persona.
- Pass the complete developer scan results as context
- Include workspace state from amadeus-state.md

Architect synthesizes scan results into 9 artifacts:
1. **business-overview.md** — Business domain, purpose, key functionality
2. **architecture.md** — System architecture, patterns, component relationships (with Mermaid diagrams). MUST include Interaction Diagrams section depicting how business transactions are implemented across components (sequence or flow diagrams).
3. **code-structure.md** — Package/module organization, file classification, code patterns
4. **api-documentation.md** — External and internal API surfaces, endpoints, contracts
5. **component-inventory.md** — Complete component list with responsibilities and dependencies
6. **technology-stack.md** — Languages, frameworks, libraries with versions
7. **dependencies.md** — External dependencies, internal cross-package dependencies
8. **code-quality-assessment.md** — Test coverage, linting, CI/CD, documentation quality, tech debt
9. **reverse-engineering-timestamp.md** — Records when reverse engineering was performed (date, commit hash if available, scope of analysis). This is the SHARED repo-level freshness/staleness pointer for the per-repo codekb store — a stale timestamp triggers a rerun (see the `condition` frontmatter: "Always rerun for freshness"). It reflects the most-recent scan by ANY intent (last-writer-wins); it is NOT this intent's differential base point — that lives in the per-intent scan record below.

**Resolve the write directory with the engine, do NOT compose the path yourself.**
Run the read-only tool

```
bun .kiro/tools/amadeus-utility.ts codekb-path --repo <repo>
```

(omit `--repo` for a single/unrecorded repo — the engine resolves the repo name).
It prints ONE line: the exact directory, e.g. `amadeus/spaces/<active-space>/codekb/<repo>/`.
Write all 9 artifacts into the directory the tool printed — verbatim, creating it if
absent. This is the durable per-repo code knowledge base, a space-level store shared
across every intent in the space. Never substitute the intent slug, the record dir, or
a hand-composed path for what the tool prints.

**Concurrency contract (last-writer-wins for shared artifacts).** The 8 body
artifacts (business-overview … code-quality-assessment) and the shared
`reverse-engineering-timestamp.md` pointer are derived caches keyed by repo, not by
intent — every intent's RE run rewrites them, and the latest scan is authoritative.
When two intents scan the same repo, the most recent write wins; any focus-area delta
lost on the shared copy is re-derived from live code on the next refresh. Do NOT try to
merge or preserve another intent's body-artifact content.

**Per-intent scan record (this intent's differential base point).** Because a single
shared timestamp file would let concurrent intents overwrite one another's base point
(#707), record THIS intent's scan in its OWN file. Resolve its path with the engine:

```
bun .kiro/tools/amadeus-utility.ts codekb-path --repo <repo> --re-scan
```

It prints ONE line — the per-intent file
`amadeus/spaces/<active-space>/codekb/<repo>/re-scans/<intent-record>.md` (keyed by the
intent's record-dir name, so concurrent intents resolve to distinct files that never
overwrite or git-conflict). Write into it: this intent's **base commit** (the commit its
PREVIOUS scan observed, or the newest observed commit across `re-scans/` if this
intent has no prior scan, or `none` when no re-scan record exists at all), the
**observed commit** (repo HEAD at this scan), the **focus**
(scan scope), and the **date**. On a later differential refresh, resolve this intent's
base point by reading its OWN re-scan record; if this intent has no prior re-scan
record, use the newest **observed commit** across the other records in
`re-scans/` (or `none` — a first full scan — when that directory has no records) —
never derive this intent's base from `reverse-engineering-timestamp.md`.

The pre-#707 single `codekb/<repo>/reverse-engineering-timestamp.md` was the base-point
source of truth; it is now demoted to the shared freshness pointer only. No read
fallback to a per-intent base is derived from it — a leftover copy from before this
change is stale and may be deleted; the per-intent re-scan records supersede it.

### Step 4: Update State

Update `<record>/amadeus-state.md`:
- Mark Reverse Engineering as `[x]` completed
- Update current stage and next stage

### Step 5: Present Completion & Request Approval

Use stage-protocol.md completion template:
- Announcement with completion summary
- Summary of all 9 artifacts produced **per repo** (for a multi-repo intent, list
  each repo's `amadeus/spaces/<active-space>/codekb/<repo>/` set — the directory
  `codekb-path --repo <repo>` printed in Step 3)
- Review path: `amadeus/spaces/<active-space>/codekb/<repo>/` for each repo in the set
- Structured approval question with options: Approve (continue to Requirements Analysis) / Request Changes

## Sensors

This stage's outputs are markdown artefacts under `amadeus/spaces/<active-space>/codekb/<repo>/` (the directory `codekb-path --repo <repo>` resolves).

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. This stage declares no upstream artefacts; the sensor still runs but reports zero unreferenced inputs by default.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → `.kiro/steering/amadeus-phase-<phase>.md` (phase-scoped)
  or `.kiro/steering/amadeus-<org|team|project>.md` (cross-cutting)
- Verification check → new manifest at `.kiro/sensors/amadeus-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

If nothing surfaces or the user skips all, proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
