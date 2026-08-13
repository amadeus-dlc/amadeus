---
slug: pr-convergence
phase: construction
execution: CONDITIONAL
condition: Runs when selected by a host-owned scope binding or by an explicit `--stage pr-convergence` invocation (with or without `--single`).
lead_agent: amadeus-developer-agent
support_agents:
  - amadeus-quality-agent
mode: inline
produces: []
consumes: []
requires_stage: []
inputs: the Bolt branch and authored pull-request body, an optional existing open pull request, plus the GitHub checks and review threads reachable through the `gh` boundary.
outputs: the machine-rendered convergence report at `<record>/construction/<unit>/code-generation/pr-convergence-report.md`, written and attested only by the plugin CLI as a `created`, `converged`, or `override` record.
sensors:
  - pr-convergence-report-format
scopes: []
---

# PR Convergence

The `pr-convergence` plugin stage drives one pull request to **convergence**:
there is no merge conflict, every required check is green, and every actionable
review thread is terminalised. Its empty `scopes:` keeps scope ownership in the
host:
once composed, the host can assign it through `plugin.scope-bindings`, and it
remains directly reachable via `amadeus-orchestrate next --stage
pr-convergence`. Whether a run starts depends on the Intent autonomy mode:
under `none` a human decides when to start it; under `semi` or `full`, an
engine advisory raised for this plugin is routed through the autonomy ladder
as a `question` occurrence (`amadeus-advisory-choice.ts`), and a `run-now`
decision can start it unattended — any other ladder outcome falls back to the
human.

Installing the plugin overlays both `pr-convergence-report` and the blocking
`pr-convergence-report-format` sensor onto `code-generation`. The shared
required-all completion guard will not advance a unit until every required
artifact exists and the report's current sensor verdict passes. Dropping the
plugin restores the host stage byte-identically and removes both resources.

Convergence is **not** merge. Merging stays a human decision, asked for
separately; this stage only establishes that the pull request is ready to be
asked about.

## The loop

Run the steps in order. Steps (2)-(5) repeat until (6) holds or the loop is
handed back to a human.

### (0) Resolve conflicts first

Read the pull request's mergeability before looking at anything else:

```
bun {{HARNESS_DIR}}/plugins/pr-convergence/tools/pr-convergence-cli.ts status \
  --repo <owner/repo> --pr <number> --unit <unit> --record <record-root>
```

While the merge state is not clean, **do not** work review threads or chase
checks. A conflicted pull request suppresses `pull_request` CI entirely (GitHub
cannot build the merge commit), so every check verdict read in that state is
stale, and review threads re-anchor once the branch moves. Rebase or merge the
base, push, and re-read.

Materialize and resolve the conflict locally:

```
git fetch origin <base-branch>
git merge origin/<base-branch>
# resolve every unmerged path, then
git add <resolved paths> && git commit
```

Reconstruct each conflicted file from the three-stage blobs rather than by
pasting around markers, verify no conflict markers remain (`<<<<<<<` /
`>>>>>>>` / `|||||||`) as an independent check, run the fast, targeted
validation the touched surface requires, and inspect the staged resolution
(`git diff --staged`) before committing. Commit and push under the
workspace's approval boundary for remote writes.

`mergeable` is computed asynchronously: the first read after a push is almost
always `UNKNOWN`. The CLI already retries a bounded number of times at a fixed
interval and then reports `UNKNOWN` as *not converged* rather than blocking —
an unresolved `UNKNOWN` is a reason to come back at step (4), never a reason to
wait indefinitely.

`status` and `report` treat the pull request as Intent-linked by default. For a
pull request that is explicitly not linked to an Intent, append
`--unlinked true`; only the exact lowercase value `true` is accepted. This flag
skips only provenance checking. It does not skip GitHub reads, convergence
evaluation, or the report contract. Self-development scopes reject
`--unlinked true`; their report must remain bound to the active Intent.

`status` is a read-only diagnostic and stays runnable mid-work: for a
self-development record it is exempt from the delivery prerequisites (clean
worktree, matching heads) and from the created-report requirement. Provenance
checking and the self-scope `--unlinked` rejection still apply to it; `report`
and `override` remain fully fail-closed.

### (1) Create the pull request

Create the pull request for this Bolt if it does not exist yet. One Bolt, one
pull request: do not fold several units, workflow-record commits, or unrelated
refactors into it. Record the number — every later step needs it.

Write the authored body to a machine-local file, then create the pull request
through the plugin CLI:

```
bun {{HARNESS_DIR}}/plugins/pr-convergence/tools/pr-convergence-cli.ts create \
  --repo <owner/repo> \
  --head <bolt-branch> \
  --title "<change summary>" \
  --body-file <authored-body.md> \
  --record <record-root> \
  --bolt <bolt-name> \
  --unit <unit-name> \
  [--base <base-branch>]
```

`--head` is required and is passed explicitly to `gh pr create`; the current
working directory and checked-out branch never select the pull request source.

For a self-development Intent, `create` first verifies that the checked-out
branch is the requested non-base branch, the local commit contains target
changes, tracked files are clean, the branch exists on `origin`, and the local
and remote head SHAs — and the head branch name — match. It never commits or
pushes. A failed prerequisite refuses before any GitHub mutation. A successful
create immediately writes a `created` report, emits its canonical attestation,
and fires the blocking sensor in that order.

When an open pull request for the same head branch already exists, `create`
does not fail on the duplicate: it verifies the existing pull request's head
SHA and branch name against the local/remote HEAD and its title/body against
this delivery's identity, then re-mints the `created` report, attestation, and
sensor pass for that pull request — a new created epoch. This is also the
recovery for a `created` attestation invalidated by later pushes ("PR head
changed"): push the current HEAD, then run `create` again; the pull request is
reused, never closed and reopened. An existing pull request whose head or
identity does not match refuses with the remediation named on stderr (`gh pr
edit` for provenance, push for a stale head). `report` and `override` name this
same remedy on stderr when they meet a report whose attestation is intact and
names this delivery but was bound to an earlier head — they still refuse and
still write nothing. A receipt that is tampered, copied, or replayed keeps the
undifferentiated refusal: it earns no diagnosis it could steer.

Pass `--record`, `--bolt`, and `--unit` together when the pull request is linked
to an Amadeus Intent. The CLI resolves the record against the adjacent
`intents.json`, prefixes the title as `[<intent>/<bolt>/<unit>] <change summary>`,
and appends one canonical `## Amadeus Work` section containing the Intent, Bolt,
and Unit names, the repository-relative record path (`dirName`), and the UUID.
A missing, malformed, or ambiguous identity refuses before touching GitHub. For
a pull request that is not linked to an Intent, omit all three flags; the title
and authored body are passed unchanged. Do not hand-copy workflow identity into
the title or body. A linked body that already contains `## Amadeus Work` is
rejected rather than receiving a duplicate canonical section.

### (2) Observe

Re-run `status`. The verdict is derived from **all** checks and **all** review
threads, paged to exhaustion — never from the first page and never from a
human's reading of the web UI. Exit codes:

| exit | meaning | next |
|---|---|---|
| 0 | converged | go to (6) |
| 1 | not converged — the JSON names the violating checks/threads | go to (3) |
| 2 | the `gh` boundary failed (absent, unauthenticated, rate-limited, API fault) | stop; see *When GitHub is unreachable* |
| 3 | linked PR provenance is invalid — JSON names every violation and stderr gives remediation | edit the PR title/body, then re-run (2) |

The state query reads the title and body in the same GraphQL snapshot as the
merge state; provenance checking adds no GitHub request. A linked pull request
must retain the canonical title prefix and `## Amadeus Work` section created in
step (1). A provenance failure is fail-closed for both active and already-merged
pull requests: `status`/`report` exits 3, raw body content is not printed, and
`report` writes no file. Remediate with `gh pr edit --title ... --body-file ...`;
the CLI never rewrites authored pull-request content automatically.

### (3) Act on failing checks — never wait behind a red

Read the complete attached check set, not the first page and not only GitHub
Actions:

```
gh pr checks <number> --json name,bucket,state,workflow,link
```

`gh pr checks` is the source of truth for the attached set; `gh run list`
covers only GitHub Actions. Re-run this read after every push — the check set
itself can change between heads.

- **A visible failure outranks every pending check.** Never wait for pending
  checks while any check is already red; the failure is actionable now.
  Diagnose it from the failing check's own log (`gh run view <run-id>
  --log-failed` when the check links to a GHA run), apply the smallest scoped
  fix — one failure cause per fix when possible — and push per the ordering
  policy in *CI observation and local validation ordering* below.
- A failure that looks unrelated must be attributed, not assumed: reproduce
  the same failure set on the unmodified base before classifying it as
  pre-existing. If the base has since fixed it, merge the latest base instead
  of patching around it inside this pull request.

### (4) Triage each actionable thread

Classify every violating thread on two axes, both settled by measurement rather
than by impression:

1. **Is it caused by this diff?** Compare against the base. A finding that
   reproduces on the base is pre-existing and is not this pull request's debt.
2. **Does the change close inside this pull request's surface?** A fix that
   pulls in files this pull request does not touch does not close here.

The two axes give three dispositions:

| caused by this diff | closes in this surface | disposition |
|---|---|---|
| yes | yes | **fix in this pull request** — push, then go to (5) |
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

### (5) Re-observe after every push

Every push invalidates the previous reading. Review bots re-post against the new
head, checks re-run, and threads that were outdated may become live again.
Return to (2) after **each** push — not once at the end. While the re-started
CI runs, keep working per *CI observation and local validation ordering*
below: local validation, thread triage, and the next fix all proceed in
parallel with CI, never behind it.

### (6) Report convergence

When `status` exits 0, write the report:

```
bun {{HARNESS_DIR}}/plugins/pr-convergence/tools/pr-convergence-cli.ts report \
  --repo <owner/repo> --pr <number> --unit <unit> --record <record-root>
```

`report` re-evaluates before it writes and refuses to write anything when the
pull request is not converged — a report that exists without convergence is
exactly the fail-open this tooling exists to prevent. Every number in it is
machine-derived; do not hand-write or hand-edit the file. The
`pr-convergence-report-format` sensor rejects missing, malformed, stale,
tampered, copied, or replayed evidence. The CLI writes the report, emits the
canonical `ARTIFACT_ATTESTED` event, and fires the sensor automatically. A
failed emission or sensor fire returns non-zero and leaves the completion guard
closed; re-running the same verb with the same identity resumes the interrupted
delivery (it completes the missing audit emission and sensor fire), while
tampered or copied evidence is still refused. Manual report edits and manual
sensor invocation are not delivery paths. The unit's own
`pr-convergence-report.md` and the record's audit shards — the files the CLI
itself writes — are exempt from the clean-worktree prerequisite, so
`create` → `report` completes inside one head epoch and the record checkpoint
commit happens after the verdict; every other tracked modification still
refuses.

The packaged checker resource is
`{{HARNESS_DIR}}/plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`;
the CLI reaches it through the host sensor dispatcher so attestation and latest
verdict bookkeeping cannot be bypassed.

Announce convergence with the report's own counts. Do not paraphrase them and
do not round them.

**Already merged?** A pull request whose state is `MERGED` is not convergence
evidence. For self-development records both `status` and `report` refuse it,
and no `landed` report can satisfy the blocking sensor. A merge performed
outside this loop earns no retroactive convergence verdict.

## When GitHub is unreachable

If the boundary fails (exit 2), the default is to **park** and hand the
workflow back to a human. Parking is a normal outcome, not a failure of the
loop, and it never terminates the workflow.

A human may instead rule the Bolt forward without convergence. That ruling is
recorded, never assumed:

```
bun {{HARNESS_DIR}}/plugins/pr-convergence/tools/pr-convergence-cli.ts override \
  --repo <owner/repo> --pr <number> --unit <unit> --record <record-root> \
  --reason "<why the human ruled forward>"
```

`override` requires a linked PR, an existing valid `created` attestation, a
real human turn in the record's audit shards, and a non-blank reason. It
refuses to override an already-converged or merged pull request, records the
ruling, then writes and attests an `override` report with `converged: false`.
There is no environment variable, flag, or state field that skips the guard
silently: a bypass that leaves no record is not offered.

## CI observation and local validation ordering

Two standing rules govern how CI is watched and when local validation runs
relative to a push. They exist because wall-clock is the scarcest resource in
the loop, and a conductor that sits watching a spinner is spending it on
nothing.

**Do not watch CI serially.** Waiting on CI must never be the only thing the
loop is doing. After a push, keep working — run local validation, triage the
remaining review threads, prepare the next fix — and re-read the check set at
the natural re-observe points (step (5)) instead of blocking on it. A blocking
watch such as `gh pr checks --watch --fail-fast` is permitted only when
nothing else remains: no failing check, no unresolved actionable thread, no
local validation still running, and no fix in flight. Prefer a background or
timer-based re-read over a dedicated foreground watch when the harness offers
one.

**Push first when CI is slow.** Estimate the pull request's CI wall clock from
its recent runs (`gh run list` durations, or the durations on the previous
check read). When that estimate exceeds **3 minutes** — or when no estimate
exists — do not make local verification a pre-push gate: push the coherent
minimal fix first so CI restarts immediately, then run the relevant local
build and tests **in parallel** with the CI run. Before such a push, run only
the fast sanity checks needed to avoid an obviously invalid commit (for
example a typecheck of the touched files), never the full suite. If local
validation later fails, diagnose, fix, and push again without waiting for the
in-flight CI run. Only when CI reliably completes within 3 minutes may local
verification run to completion before the push.

Push-first changes the *ordering* of validation, never the approval boundary:
every push remains a remote write and still follows the workspace's approval
rules. Nor does it lower the finish line — the loop terminates only when the
required check set is green **and** the relevant local validation has passed;
a green CI run does not waive a still-running or failed local validation.

## Guardrail

These rules are part of this stage, not a pointer to something outside it.

- **Failures come first.** Read the failing check's log and the failing
  assertion's text before forming any theory about it. A summary line, a job
  name, or a wall-clock note is not a diagnosis.
- **No flat comments.** A reply belongs on the thread it answers, so the thread
  can terminalise. A top-level comment that responds to an inline finding leaves
  that finding open, and the verdict will keep counting it — correctly.
- **Ask before writing to the remote.** Pushing, replying, resolving, and
  filing Issues are all writes to a shared surface. Follow this workspace's
  approval boundary for them, and never merge: merging is a separate human
  decision and no convergence verdict authorises it.
- **No hook bypass.** Do not bypass hooks (`--no-verify`) to force progress.
- **Flakes are evidence, not noise.** Re-run a suspected flake and record both
  outcomes. If it passes on re-run, say so explicitly rather than quietly
  discarding the red run, and do not assume a re-run failure shares the first
  run's cause — re-attribute it from the job log. A check muted or retried
  until green without a recorded reason is a false green.
- **Convergence is not merge.** Exit 0 means "ready to be asked about". The
  merge question goes to a human, every time.

This stage is self-contained: the loop, the triage axes, and the CI ordering
rules above are carried in full here, so an installed plugin behaves the same
on every harness and requires no external skill or workspace-local document.
