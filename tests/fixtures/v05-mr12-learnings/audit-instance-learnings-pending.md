# AI-DLC Audit Log

## Workflow Started
**Timestamp**: 2026-05-28T08:00:00Z
**Event**: WORKFLOW_STARTED
**Workflow ID**: t98-instance-learnings-pending
**Scope**: feature
**Intent**: t98 fixture (#761): 2-Bolt parent with one merged + one still-open instance (rollup = pending); a RULE_LEARNED row sits inside the window but learnings_captured MUST stay null on the non-approved parent

---

## Stage Started
**Timestamp**: 2026-05-28T08:01:00Z
**Event**: STAGE_STARTED
**Stage**: code-generation

---

## State Forked
**Timestamp**: 2026-05-28T08:02:00Z
**Event**: STATE_FORKED
**Bolt slug**: alpha
**Worktree path**: .amadeus/worktrees/bolt-alpha
**Source state hash**: a1a1a1
**Target state hash**: a1a1a1

---

## State Forked
**Timestamp**: 2026-05-28T08:02:30Z
**Event**: STATE_FORKED
**Bolt slug**: beta
**Worktree path**: .amadeus/worktrees/bolt-beta
**Source state hash**: b2b2b2
**Target state hash**: b2b2b2

---

## State Merged
**Timestamp**: 2026-05-28T08:20:00Z
**Event**: STATE_MERGED
**Bolt slug**: alpha
**Worktree path**: .amadeus/worktrees/bolt-alpha
**Source state hash**: a1a1a1
**Target state hash**: a1a1f0
**Conflict resolution**: clean

---

## Rule Learned
**Timestamp**: 2026-05-28T08:21:00Z
**Event**: RULE_LEARNED
**Stage**: code-generation
**Candidate-ID**: c1
**Destination**: amadeus/spaces/default/memory/project.md
**Heading**: ## Corrections
**Source**: orchestrator
