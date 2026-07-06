# GitHub Issue Reference Contract

This reference backs the "GitHub Issue references as input" section of
`../SKILL.md`. It documents the contract in full and how to verify it
mechanically.

## Contract

A public skill that reads a GitHub Issue reference from freeform input
(today: `amadeus`, via its Intake path) follows 3 rules:

1. When the target repository context is resolvable, a short reference
   (`#nnn`) is equivalent to that Issue's full URL
   (`https://github.com/<owner>/<repo>/issues/<nnn>`) — both name the same
   input.
2. The explicit `owner/repo#nnn` form is accepted as-is; it names its own
   repository context regardless of the current remote.
3. When the repository context is ambiguous (multiple remotes, a fork whose
   upstream differs, or no Git repository at all) and the input is a bare
   `#nnn` with no `owner/repo` prefix, stop and ask the human which
   repository `#nnn` refers to — never guess.

## Scope

This contract applies only to public skills that take a GitHub Issue as
input. It does not cover other trackers, Issue-body structuring, or PR
comment handling (out of scope per `requirements.md` R005 / #252).

## Verification

A deterministic check (`dev-scripts/issue-ref-contract.ts`) confirms that
every skill named in its `issueInputSkills` list carries all 3 contract
clauses (as literal markers) in both its source (`skills/<name>/SKILL.md`)
and promoted (`.agents/skills/<name>/SKILL.md`) copies.

```sh
npm run issue-ref-contract:check
```

The eval (`dev-scripts/evals/issue-ref-contract/check.ts`, wired to
`npm run test:it:issue-ref-contract`) exercises the checker against isolated
fixtures (complete contract, missing markers, missing/stale promoted copy)
before asserting the real repository passes.

Add a new skill name to `issueInputSkills` in
`dev-scripts/issue-ref-contract.ts` when another public skill grows a
GitHub-Issue-input path.
