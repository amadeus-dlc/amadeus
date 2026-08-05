---
slug: pr-convergence
phase: construction
execution: CONDITIONAL
condition: Opt-in — install is the boundary. Once composed, runs on an explicit `--stage pr-convergence` invocation (with or without `--single`); never auto-selected by a stock scope (scopes is empty).
lead_agent: amadeus-developer-agent
support_agents:
  - amadeus-quality-agent
mode: inline
produces: []
consumes: []
requires_stage: []
inputs: the open pull request that carries this Bolt, plus the GitHub checks and review threads reachable through the `gh` boundary.
outputs: the machine-rendered convergence report at `<record>/construction/<unit>/code-generation/pr-convergence-report.md`, written only by the plugin CLI.
sensors:
  - pr-convergence-report-format
scopes: []
---

# PR Convergence

The `pr-convergence` plugin stage drives one pull request to **convergence**:
no merge conflict, every required check green, and every actionable review
thread terminalised. It is an opt-in plugin stage (empty `scopes:`) — install
is the opt-in boundary, so once composed it is reachable via
`amadeus-orchestrate next --stage pr-convergence`. It never joins a stock
scope's workflow and Amadeus never runs it automatically.

Installing the plugin also overlays `pr-convergence-report` onto the
`code-generation` stage's `produces`. From that point the existing per-unit
artifact guard will not advance a unit until the report exists on disk — the
guard is untouched core, the plugin only supplies it with data. Dropping the
plugin restores the stage file byte-identically and the guard forgets it.

Convergence is **not** merge. Merging stays a human decision, asked for
separately; this stage only establishes that the pull request is ready to be
asked about.

## The loop

Run the steps in order. Steps (2)-(4) repeat until (5) holds or the loop is
handed back to a human.

### (0) Resolve conflicts first

Read the pull request's mergeability before looking at anything else:

```
bun plugins/pr-convergence/tools/pr-convergence-cli.ts status \
  --repo <owner/repo> --pr <number> --unit <unit> --record <record-root>
```

While the merge state is not clean, **do not** work review threads or chase
checks. A conflicted pull request suppresses `pull_request` CI entirely (GitHub
cannot build the merge commit), so every check verdict read in that state is
stale, and review threads re-anchor once the branch moves. Rebase or merge the
base, push, and re-read.

`mergeable` is computed asynchronously: the first read after a push is almost
always `UNKNOWN`. The CLI already retries a bounded number of times at a fixed
interval and then reports `UNKNOWN` as *not converged* rather than blocking —
an unresolved `UNKNOWN` is a reason to come back at step (4), never a reason to
wait indefinitely.

### (1) Create the pull request

Create the pull request for this Bolt if it does not exist yet. One Bolt, one
pull request: do not fold several units, workflow-record commits, or unrelated
refactors into it. Record the number — every later step needs it.

### (2) Observe

Re-run `status`. The verdict is derived from **all** checks and **all** review
threads, paged to exhaustion — never from the first page and never from a
human's reading of the web UI. Exit codes:

| exit | meaning | next |
|---|---|---|
| 0 | converged | go to (5) |
| 1 | not converged — the JSON names the violating threads | go to (3) |
| 2 | the `gh` boundary failed (absent, unauthenticated, rate-limited, API fault) | stop; see *When GitHub is unreachable* |

### (3) Triage each actionable thread

Classify every violating thread on two axes, both settled by measurement rather
than by impression:

1. **Is it caused by this diff?** Compare against the base. A finding that
   reproduces on the base is pre-existing and is not this pull request's debt.
2. **Does the change close inside this pull request's surface?** A fix that
   pulls in files this pull request does not touch does not close here.

The two axes give three dispositions:

| caused by this diff | closes in this surface | disposition |
|---|---|---|
| yes | yes | **fix in this pull request** — push, then go to (4) |
| yes | no | **file an Issue** and land this pull request first; resolve the thread citing the Issue number |
| no | — | **reject** — reply with a falsifiable rebuttal citing the contract at `file:line`, then resolve |

Boundary rules, in force over the table above:

- **(i)** A security or correctness finding that is real gets fixed **in this
  pull request** whenever this pull request touches that surface — regardless of
  which axis suggested deferral.
- **(ii)** When the classification is genuinely unclear, **escalate** to a human
  rather than picking the convenient reading. Ambiguity is not a licence to
  reject.
- **(iii)** Deferral terminates only through a **resolve that names the filed
  Issue number**. A thread left open "to be handled later" is not terminalised
  and keeps the verdict red — which is the intended behaviour.

A rejection is a claim, and claims carry evidence. "Not applicable here" with
no citation is not a rebuttal; it is the thread being ignored, and the verdict
will keep counting it.

### (4) Re-observe after every push

Every push invalidates the previous reading. Review bots re-post against the new
head, checks re-run, and threads that were outdated may become live again.
Return to (2) after **each** push — not once at the end.

### (5) Report convergence

When `status` exits 0, write the report:

```
bun plugins/pr-convergence/tools/pr-convergence-cli.ts report \
  --repo <owner/repo> --pr <number> --unit <unit> --record <record-root>
```

`report` re-evaluates before it writes and refuses to write anything when the
pull request is not converged — a report that exists without convergence is
exactly the fail-open this tooling exists to prevent. Every number in it is
machine-derived; do not hand-write or hand-edit the file. The
`pr-convergence-report-format` sensor surfaces a report whose required fields
are missing or self-contradictory, and the review gate treats a hand-written
report as a finding.

Announce convergence with the report's own counts. Do not paraphrase them and
do not round them.

## When GitHub is unreachable

If the boundary fails (exit 2), the default is to **park** and hand the
workflow back to a human. Parking is a normal outcome, not a failure of the
loop, and it never terminates the workflow.

A human may instead rule the Bolt forward without convergence. That ruling is
recorded, never assumed:

```
bun plugins/pr-convergence/tools/pr-convergence-cli.ts override \
  --repo <owner/repo> --pr <number> --unit <unit> --record <record-root> \
  --reason "<why the human ruled forward>"
```

`override` requires a real human turn in the record's audit shards, refuses to
override an already-converged pull request, writes the ruling to the audit
trail, and only then writes a report that says `converged: false` permanently.
There is no environment variable, flag, or state field that skips the guard
silently: a bypass that leaves no record is not offered.

## Guardrail

These rules are part of this stage, not a pointer to something outside it.

- **Failures come first.** Read the failing check's log and the failing
  assertion's text before forming any theory about it. A summary line, a job
  name, or a wall-clock note is not a diagnosis. Do not classify a failure as
  environmental or unrelated until the same failure set reproduces on the
  unmodified base.
- **No flat comments.** A reply belongs on the thread it answers, so the thread
  can terminalise. A top-level comment that responds to an inline finding leaves
  that finding open, and the verdict will keep counting it — correctly.
- **Ask before writing to the remote.** Pushing, replying, resolving, and
  filing Issues are all writes to a shared surface. Follow this workspace's
  approval boundary for them, and never merge: merging is a separate human
  decision and no convergence verdict authorises it.
- **Flakes are evidence, not noise.** Re-run a suspected flake and record both
  outcomes. If it passes on re-run, say so explicitly rather than quietly
  discarding the red run, and do not assume a re-run failure shares the first
  run's cause — re-attribute it from the job log. A check muted or retried
  until green without a recorded reason is a false green.
- **Convergence is not merge.** Exit 0 means "ready to be asked about". The
  merge question goes to a human, every time.

Credit: the loop shape and the triage axes are adapted from the
`j5ik2o-gh-pr-converge-loop` skill; this stage carries them in full rather than
by reference so an installed plugin behaves the same on every harness and in
workspaces where that skill is absent.
