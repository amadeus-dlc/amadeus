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
