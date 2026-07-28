# Intent Mirror Reference

> Languages: **English** | [日本語](20-intent-mirror.ja.md)

This reference defines the runtime and distribution contract.

<!-- amadeus-topic:modes -->
<!-- amadeus-contract:modes {"modes":["off","prompt","auto"],"defaultMode":"prompt","booleanCompatibility":"rejected"} -->
## Mode schema

The closed union is `off | prompt | auto`; default is `prompt`.

<!-- amadeus-topic:precedence -->
<!-- amadeus-contract:precedence {"precedence":["global","space","intent"]} -->
## Resolution

Resolution order is Global, Space, Intent, with the last present value winning.

<!-- amadeus-topic:boundaries -->
<!-- amadeus-contract:boundaries {"boundaries":["intent-capture-approved","phase-verified","parked","workflow-completed","manual"]} -->
## Event boundaries

Each receipt binds the full Intent UUID, boundary instance, and operation.

<!-- amadeus-topic:completion -->
<!-- amadeus-contract:completion {"completionOrder":["create","sync","close"]} -->
## Completion state machine

Only success advances `create → sync → close`.

<!-- amadeus-topic:failure -->
<!-- amadeus-contract:failure {"workflowMayAdvance":true,"retry":"next-eligible-boundary-or-explicit-manual-command"} -->
## Failure semantics

Receipts distinguish not-started, no-effect-confirmed, and outcome-unknown.

<!-- amadeus-topic:safety -->
<!-- amadeus-contract:safety {"closeGuards":["verified-provenance","matching-repository","workflow-landed","final-sync-succeeded"]} -->
## Provenance and repair

New relinks write Provenance V2. Its digest includes inspection-clock
`createdAt`; C3 recomputes the plan binding inside the atomic transition.

<!-- amadeus-topic:cli -->
<!-- amadeus-contract:cli {"commands":[{"path":["boundary","intent-capture"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","phase"],"requiredOptions":["--instance","--phase"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","park"],"requiredOptions":["--instance","--stage"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","completion"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","create"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","sync"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","close"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["repair","status"],"requiredOptions":[],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","relink"],"requiredOptions":["--issue"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","abandon"],"requiredOptions":["--operation"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false}],"selectorDefaults":{"space":"active-space","intent":"active-intent"},"positionalArguments":"forbidden"} -->
## Command schema

`repair status` is read-only. Relink requires `--issue`; abandon requires
`--operation`. Repair challenge TTL is ten minutes and confirmation is exact.

<!-- amadeus-topic:scope -->
<!-- amadeus-contract:scope {"scopeExclusions":["pull-request","release","deploy","daemon","polling"]} -->
## Exclusions

The contract grants no authority for pull requests, releases, deploys,
background daemons, or polling.

<!-- amadeus-topic:projects -->
<!-- amadeus-contract:projects {"key":"mirror-projects","shape":"array of { project: \"<owner>/<number>\", status-names?: { <phase>: string } }","phaseKeys":["ideation","inception","construction","operation","done"],"layerResolution":"last-layer-with-a-value-replaces","independentOf":"auto-mirror","authoritativeField":"Intent Phase","auxiliaryStatus":{"active":"In progress","complete":"Done","parked":"keep","failureMode":"non-blocking"}} -->
## Project configuration schema

`mirror-projects` is an array of `{ project, status-names? }`. `project` matches
`"<owner>/<number>"` with a positive integer number; a padded, float, or
otherwise malformed value is rejected rather than coerced. `status-names` keys
are the closed phase vocabulary `ideation | inception | construction |
operation | done`, and each value is a non-empty string. An unknown element key,
an unknown phase key, or one malformed element rejects the whole layer instead
of contributing a partial list. `auto-mirror` and `mirror-projects` resolve
independently: for each key, the last layer carrying a valid value wins, and a
winning `mirror-projects` replaces the previous layer's target list entirely.

`Intent Phase` is authoritative for lifecycle reconciliation and the completion
gate. `Status` is auxiliary: active maps to `In progress`, complete maps to
`Done`, parked keeps its current value, and auxiliary failures do not block
reconciliation or close.

<!-- amadeus-topic:auth -->
<!-- amadeus-contract:auth {"scope":"project","credentialStore":"gh","automaticScopeChange":false} -->
## Project authorization

ProjectV2 item and field reads, item addition, and field updates require the
`project` token scope. Credentials are
delegated to `gh`; no token value is read, stored, logged, or included in any
rendered text, and no scope is changed or refreshed automatically. A credential
lacking the scope surfaces as the `permission-denied` diagnostic naming the
board and the scope, and nothing else.

<!-- amadeus-topic:diagnostics -->
<!-- amadeus-contract:diagnostics {"command":["repair","status"],"resolutions":["resolved","field-missing","option-missing","permission-denied"],"availableOptionsOn":"option-missing","mutatesRemote":false} -->
## Project diagnostics

`repair status` reports one diagnostic per board over the union of configured
targets, ledger entries, and current Issue memberships, ordered by canonical
`owner/number`. Each row carries `membership`, `currentStatus`,
`expectedStatus`, `drift`, `resolution`, and a `summary` sentence; a null
`expectedStatus` (no column expected at this boundary) makes `drift` false by
construction. `expectedStatus` comes from the same definition the sync applies,
so a diagnosis cannot disagree with what a sync would do. `availableOptions` is
present only for `option-missing` and lists the board's declared option names
verbatim. The path is read-only: only the gateway's read methods are reachable,
and the ledger is an input, never an output.

The per-board ledger records `synced`, `pending`, or `safety-blocked` with the
last applied column, so a partially applied boundary is representable. Gateway
work runs as `gh` subprocesses invoked with an argument array; a missing,
unauthenticated, rate-limited, or failing `gh` fails the mirror operation loudly
while the workflow may still advance.
