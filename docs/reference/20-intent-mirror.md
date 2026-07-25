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
