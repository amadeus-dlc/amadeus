# GitHub Issue Reference Contract

This reference backs the "GitHub Issue references as input" section of
`SKILL.md` beside it. It documents the input contract in full.

## Contract

A public skill that reads a GitHub Issue reference from freeform input
(today: `amadeus`, via its Birth / continuation intake) follows 3 rules:

1. When the target repository context is resolvable (a single Git remote, or
   a repository the current session is already scoped to), a short reference
   (`#nnn`) is equivalent to that Issue's full URL
   (`https://github.com/<owner>/<repo>/issues/<nnn>`) — both name the same
   input.
2. The explicit `owner/repo#nnn` form is accepted as-is; it names its own
   repository context regardless of the current remote.
3. When the repository context is ambiguous (multiple remotes, a fork whose
   upstream differs, or no Git repository at all) and the input is a bare
   `#nnn` with no `owner/repo` prefix, do not guess which repository it names
   — stop and ask the human which repository `#nnn` refers to before
   treating it as an Issue input.

## Scope

This contract applies only to public skills that take a GitHub Issue as
input. It does not cover other trackers, Issue-body structuring, or PR
comment handling. The equivalence in clause 1 governs how `#nnn` and Issue
URLs are read as Intent input (e.g. during Birth or a continuation); it does
not change engine routing or `next` / `report` argument parsing.

## Enforcement

The contract lives as prose in the "GitHub Issue references as input"
section of `SKILL.md`; the conductor applies clauses 1-3 when it reads the
invocation as Intent input. This annex is the single full statement of the
contract that the SKILL.md section points to — keep the two in step whenever
either changes.
