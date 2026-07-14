# Upstream sync artifact contracts

Read this file before writing or validating upstream-sync artifacts or preparing
the Intent handoff.

## Contents

1. Ledger contract
2. Classification contract
3. Report template
4. Intent completion contract

## Ledger contract

Store the committed ledger at `docs/research/upstream-sync/ledger.json` using
this shape. Use ISO 8601 UTC timestamps and full Git SHAs.

```json
{
  "schema_version": 1,
  "upstream": {
    "repository": "https://github.com/awslabs/aidlc-workflows",
    "baseline": {
      "tag": "v2.2.0",
      "commit": "<full-sha>",
      "status": "REVIEWED"
    },
    "target": {
      "tag": "v2.3.0",
      "commit": "<full-sha>"
    }
  },
  "amadeus": {
    "repository": "<remote-url>",
    "comparison_commit": "<full-sha>"
  },
  "status": "PLANNED",
  "report": "docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md",
  "intent": null,
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>",
  "domains": [],
  "verification": {
    "required": [
      "targeted tests",
      "bun run typecheck",
      "bun run lint:check",
      "bun run dist:check",
      "bun run promote:self:check",
      "bun run test:ci"
    ],
    "completed": []
  },
  "unresolved_items": []
}
```

Allowed top-level status transitions are:

```text
PLANNED -> INTENT_IN_PROGRESS -> APPLIED
                              -> BLOCKED
```

- The upstream-sync skill writes only `PLANNED`.
- The new Intent writes `INTENT_IN_PROGRESS` and records its stable identifier.
- The Intent writes `APPLIED` only after every required verification succeeds.
- A failed or abandoned Intent writes `BLOCKED` with evidence and must not
  advance the next comparison baseline.
- `REVIEWED` means inspected as a comparison boundary; it never implies that
  Amadeus implemented every upstream behavior.

## Classification contract

Each `domains[]` entry uses this shape:

```json
{
  "id": "plugin-mechanism",
  "title": "Plugin mechanism",
  "approval": "APPROVED",
  "approved_at": "<timestamp>",
  "items": [
    {
      "id": "plugin-compose-hook",
      "summary": "Compose installed plugin contributions into the host tree",
      "disposition": "ADAPT",
      "local_state": "MISSING",
      "rationale": "Amadeus uses package-owned source roots and generated self-install trees.",
      "upstream_evidence": [
        "CHANGELOG.md#2.3.0",
        "<upstream-commit>:<path>"
      ],
      "local_evidence": [
        "<amadeus-commit>:<path-or-absence-check>"
      ],
      "dependencies": [],
      "risks": [],
      "verification": [],
      "confidence": "HIGH"
    }
  ]
}
```

Allowed values:

- `approval`: `PENDING`, `APPROVED`, `REVISE`, `REJECTED`.
- `disposition`: `ADOPT`, `ADAPT`, `SKIP`.
- `local_state`: `MISSING`, `PARTIAL`, `EQUIVALENT`, `NOT_APPLICABLE`.
- `confidence`: `HIGH`, `MEDIUM`, `LOW`.

An item with `LOW` confidence is unresolved. An `APPROVED` domain may not
contain unresolved items. Every `SKIP` requires positive evidence and a reason;
absence of a local mapping is not sufficient.

## Report template

Use this exact top-level structure:

```markdown
# Upstream AI-DLC sync plan: <baseline> to <target>

## Executive summary

## Compared revisions

## Method and completeness checks

## Change inventory

## Domain decisions

### <Domain title>

## Residual whole-tree drift

## Approved Intent scope

## Explicit exclusions

## Risks and blockers

## Verification contract

## Ledger transition contract

## Handoff
```

For each domain, include a table with item ID, summary, disposition, local
state, confidence, and implementation effect. Follow it with evidence,
dependencies, risks, and verification details that remain readable without the
ledger.

The Handoff section must contain:

- the report path;
- the exact immutable upstream tag/SHA pairs;
- the Amadeus comparison SHA;
- the approved domain and item counts;
- zero unresolved items;
- the command the user should invoke next;
- a warning that the command starts a new Intent and must not be run while
  another Intent is active.

## Intent completion contract

The approved report must instruct the new Intent to:

1. Revalidate upstream tag/SHA pairs without executing upstream code.
2. Change only approved `ADOPT` and `ADAPT` items; preserve `SKIP` decisions.
3. Update the ledger to `INTENT_IN_PROGRESS` with its stable Intent identifier
   before implementation.
4. Implement changes in dependency order against hand-authored Amadeus source;
   regenerate `dist/` and dogfood projections through canonical tooling.
5. Fail closed on ambiguity, conflicts, unsafe working-tree state, or test
   failure. Record evidence and set `BLOCKED` rather than guessing.
6. Run domain-targeted tests, then all required commands listed in the ledger.
7. Set `APPLIED` only after all verification succeeds, recording results and
   the final Amadeus commit SHA used for comparison. This records the worktree
   state even when the user has not requested a Git commit.
8. Do not create commits, push, or open a PR unless the user explicitly asks.
