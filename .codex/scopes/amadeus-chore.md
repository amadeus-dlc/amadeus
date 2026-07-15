---
name: chore
depth: Minimal
keywords:
  - chore
  - tweak
description: Small self-contained tweak
---

# chore scope

The lightest incremental scope, for a small self-contained tweak — a
one-to-few-file change to a dev script, docs, or CI config that touches no
user-visible contract. It is even leaner than `bugfix`: it skips
reverse-engineering and requirements-analysis, running only bootstrap
initialization, code-generation, and build-and-test.

## Why these stages, why skip those

A chore is a low-risk edit to a known, small surface. It does not need to
reverse-engineer the whole codebase or write a requirements spec — the change
is self-evident from the task itself. It still needs to bootstrap the record
(initialization), make the change (code-generation), and verify nothing broke
(build-and-test). Everything else — ideation, the rest of inception,
functional-design, and the operation phase — is SKIP, because there is no new
product, no behaviour to pin down beyond the task, and no new deployment
surface. Like `bugfix`, `refactor`, and `security-patch` it is an incremental
scope that skips the walking-skeleton ceremony, since there is nothing to
bootstrap.

Reach for a heavier scope when the change grows past a self-contained tweak:
`bugfix` when you are fixing a defect that needs the current code understood,
`refactor` when you are reshaping structure, `feature` when you are adding
user-visible behaviour.

## Membership

Keyword triggers: `chore`, `tweak` (word-boundary matched). Initialization,
code-generation, and build-and-test execute; everything else is SKIP.
