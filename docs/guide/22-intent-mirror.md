# Intent Mirror

> Languages: **English** | [日本語](22-intent-mirror.ja.md)

Intent Mirror projects lifecycle progress to one GitHub Issue. The Intent
record remains authoritative.

<!-- amadeus-topic:modes -->
<!-- amadeus-contract:modes {"modes":["off","prompt","auto"],"defaultMode":"prompt","booleanCompatibility":"rejected"} -->
## Modes

`off` suppresses boundary operations, `prompt` asks per operation, and `auto`
runs only eligible lifecycle-boundary work. Legacy booleans are rejected.

<!-- amadeus-topic:precedence -->
<!-- amadeus-contract:precedence {"precedence":["global","space","intent"]} -->
## Configuration precedence

Intent overrides Space, which overrides Global.

<!-- amadeus-topic:boundaries -->
<!-- amadeus-contract:boundaries {"boundaries":["intent-capture-approved","phase-verified","parked","workflow-completed","manual"]} -->
## Boundaries

Automation is bounded to approved Intent Capture, verified phases, park,
completion, and explicit manual invocations. There is no daemon or polling.

<!-- amadeus-topic:completion -->
<!-- amadeus-contract:completion {"completionOrder":["create","sync","close"]} -->
## Completion

Completion runs create, final sync, then close. A failure stops the chain but
does not block workflow progress.

<!-- amadeus-topic:failure -->
<!-- amadeus-contract:failure {"workflowMayAdvance":true,"retry":"next-eligible-boundary-or-explicit-manual-command"} -->
## Failure and retry

Inspect status, then retry at the next eligible boundary or use one explicit
manual command. Outcome-unknown work is reconciled before another mutation.

<!-- amadeus-topic:safety -->
<!-- amadeus-contract:safety {"closeGuards":["verified-provenance","matching-repository","workflow-landed","final-sync-succeeded"]} -->
## Safety

Close requires verified provenance, the same repository, a landed workflow,
and a successful final sync. Repair requires a one-time phrase-bound challenge.

<!-- amadeus-topic:cli -->
<!-- amadeus-contract:cli {"commands":[{"path":["boundary","intent-capture"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","phase"],"requiredOptions":["--instance","--phase"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","park"],"requiredOptions":["--instance","--stage"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","completion"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","create"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","sync"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","close"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["repair","status"],"requiredOptions":[],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","relink"],"requiredOptions":["--issue"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","abandon"],"requiredOptions":["--operation"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false}],"selectorDefaults":{"space":"active-space","intent":"active-intent"},"positionalArguments":"forbidden"} -->
## CLI

Use `repair status`, `repair relink --issue <n>`, or
`repair abandon --operation <id>`. Selectors are options; positional arguments
are forbidden.

<!-- amadeus-topic:scope -->
<!-- amadeus-contract:scope {"scopeExclusions":["pull-request","release","deploy","daemon","polling"]} -->
## Scope

Pull requests, releases, deployment, daemons, and polling are outside Intent
Mirror.

<!-- amadeus-topic:projects -->
<!-- amadeus-contract:projects {"key":"mirror-projects","shape":"array of { project: \"<owner>/<number>\", status-names?: { <phase>: string } }","phaseKeys":["ideation","inception","construction","operation","done"],"layerResolution":"last-layer-with-a-value-replaces","independentOf":"auto-mirror"} -->
## Project boards

`mirror-projects` lists the GitHub Project boards this Intent syncs to. Each
element names one board as `project: "<owner>/<number>"` and may carry a
`status-names` override mapping a phase key onto the column name that board
uses. The phase keys are `ideation`, `inception`, `construction`, `operation`,
and `done`; an unknown key is an error rather than an ignored entry.

```json
{
  "mirror-projects": [
    { "project": "acme/7" },
    { "project": "acme/12", "status-names": { "construction": "In Progress" } }
  ]
}
```

The key resolves per layer: the last layer that carries a value replaces the
previous layer's list outright instead of merging into it, so a Space or Intent
layer states the complete set of boards it wants. `mirror-projects` is
independent of `auto-mirror` — the mode decides whether a mirror operation runs,
this key decides which boards that operation touches.

<!-- amadeus-topic:auth -->
<!-- amadeus-contract:auth {"scope":"project","credentialStore":"gh","automaticScopeChange":false} -->
## Authentication for Project boards

Reading a board's Status field and setting a column both go through the GraphQL
ProjectV2 API, which needs the `project` token scope in addition to whatever the
Issue itself required. The credential stays with `gh` and its credential store;
Intent Mirror never reads a token value, never changes a scope, and never
re-authenticates for you. Granting the scope is a human move made outside this
tool — for example `gh auth refresh -s project`.

<!-- amadeus-topic:diagnostics -->
<!-- amadeus-contract:diagnostics {"command":["repair","status"],"resolutions":["resolved","field-missing","option-missing","permission-denied"],"availableOptionsOn":"option-missing","mutatesRemote":false} -->
## Diagnosing Project sync

`repair status` reports one read-only row per board — every board configuration
targets, every board the ledger already recorded, and every board the Issue
currently belongs to. Each row states whether the Issue is on the board, the
column it is in, the column the workflow expects, whether those two have
drifted, and one of four resolutions:

- `resolved` — the expected column is reachable; the row is an observation only.
- `field-missing` — the board's Status field could not be read, so no column can
  be applied.
- `option-missing` — the board declares no Status option matching the expected
  name exactly, case and spacing included. The board's own option names are
  listed as `availableOptions`, so you can either add the option to the board or
  map the phase onto an existing one with a `status-names` override.
- `permission-denied` — the credential in use cannot read that board's Status
  field; grant it the `project` scope and run `repair status` again.

Each row carries a summary sentence naming the board, the column, and the move
that resolves it. No token and no raw API response reaches that text.
`repair status` observes and changes nothing, locally or remotely; a board that
has drifted is reported, not recorded.

Project work runs as `gh` subprocesses invoked with an argument array — no shell
string is built. When `gh` is missing, unauthenticated, rate-limited, or fails,
the mirror operation fails loudly and the AI-DLC workflow still advances; retry
at the next eligible boundary or with one explicit manual command. A boundary
that synced some boards and failed on others keeps a per-board ledger entry —
`synced`, `pending` for a retryable failure, or `safety-blocked` when the board's
own shape or your permissions need a human — so a partial success stays visible
board by board rather than collapsing into one verdict.
