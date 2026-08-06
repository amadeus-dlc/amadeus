# Fixed Unit Pool — requirement fragments (E2E fixture)

Fixture subject for the `tla-authoring` end-to-end path (FR-012). The subject is
the swarm fixed Unit pool lifecycle — acquire, confirm-dispatch, settle-release,
reconciliation — read from `amadeus-swarm.ts` and its pool runtime. It is not
`FormalElection` and not `MirrorLifecycle`: the point of the fixture is that the
authoring path works on a subject it has never seen.

The headings below follow the heading-driven grammar the identity extractor
reads (`### FR-\d{3}` / `### NFR-\d{3}` / `### AC-\d{3}`), so this file is a
usable starting point for `identity extract --doc-kind requirements`.

## Lifecycle

### FR-001 Acquire never exceeds the pool's capacity

A dispatch attempt acquires a Unit from the queue only while the pool is open
and the active set is below the configured concurrency. An acquire that would
take the active set past capacity is refused rather than queued twice, so the
number of Units being worked never exceeds what the batch was planned for.

### FR-002 A settled Unit leaves the active set exactly once

`confirm-dispatch` binds an acquired Unit to a native handle, and
`settle-release` moves it from the active set into the terminal set with its
outcome. A Unit that has settled is not settled again, and a Unit still active
is not counted as terminal.

### AC-001 Reconciliation drains the pool without losing a Unit

When reconciliation records a terminal effect for an attempt, every Unit the
batch enqueued is in exactly one of the queue, the active set, or the terminal
set. The pool reaches its terminal phase only when the queue and the active set
are both empty, so no Unit is dropped between the phases.
