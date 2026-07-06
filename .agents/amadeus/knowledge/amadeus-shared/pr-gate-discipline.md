# PR Gate Discipline

> **Audience**: any agent that opens, monitors, or responds to review on a
> pull request (phase PR or Bolt PR).
> **Referenced from**: `amadeus/spaces/*/memory/team.md` (`### PR 監視`),
> `amadeus/spaces/*/memory/phases/construction.md` (`## PR Gate`), and
> `amadeus-common/protocols/stage-protocol.md` (Construction Bolt gates).
> Those rule-layer files carry only the invariants below in the workspace's
> own language; this file is the single source for the procedure.

## 1. Invariants

These four hold regardless of scope, phase, or autonomy mode. They are
restated (in the workspace's language) at each rule-layer location listed
above. The rule layer is authoritative: if this list ever drifts from a
rule-layer restatement, follow the rule layer and realign this document.

1. When a PR has comments, leaving them without a reply or resolution —
   or merging past them — is not acceptable.
2. Monitor a PR after creation, following the procedure in this document.
3. Merge is performed by a human, never by an agent.
4. Never loosen a verification setting (e.g. a coverage threshold) to
   force a pass.

## 2. CI first

Resolve CI errors — including merge conflicts — before reading review
comments. Reading and responding to comments while CI is red is wasted
effort: any code change forced by a comment will re-run CI anyway, and a
red CI run usually explains findings that a bot or human reviewer flags
independently. Fix conflicts, then fix remaining CI failures, then move to
comments.

## 3. Wait for review bots

Always wait for every review bot that is still pending on the PR before
concluding the review pass is complete. A bot is still working if its
check run or status is pending, or if the PR conversation shows it has
posted a "starting review" placeholder without a follow-up verdict yet.
Some bots are slow; a slow bot must still be waited for — do not treat
slowness as a signal to skip it.

Do not build a long sleep-based polling interval to wait for bots. A long
sleep delays your reaction to whatever posts during that window by the
full sleep duration — a fast bot's comment sits unanswered until the
sleep ends. Poll on a short, bounded interval instead, so a new posting is
caught close to when it happens.

## 4. Respond to every comment

Every comment on the PR requires a response — top-level and inline alike.
None are skipped because they seem minor or because they arrived late.

- If a finding is adopted: reply describing what was changed to address
  it.
- If a finding is not adopted: reply with the reason it was not adopted.

Before replying, judge the finding rather than taking it at face value.
Cross-check it against the PR's stated purpose and the actual code in the
diff — a finding can be technically correct and still not apply to what
this PR is trying to do, or can be based on a misreading of the diff.
Treat every finding as a claim to verify, not an instruction to execute.

If the same finding is raised again after you have already replied to it
— by the same reviewer or a different one — stop and escalate to a human
rather than replying a second time on your own judgment (see §5).

## 5. Escalation

A finding can be valid on its own terms but out of scope for this PR's
purpose. Scope it out: note in the reply that it is out of scope, and
record it as a candidate for a new issue. Drafting that issue is a human
(or lead) responsibility, not something the engineer does unilaterally.

A repeated finding — the same point raised again after a reply already
addressed it — is a signal that either the reply did not land or the
finding deserves more judgment than an agent should apply alone. Halt and
escalate to a human instead of replying again (cross-reference §4).

## 6. Merge readiness

Coverage errors (or any other verification-tool failure) must be
addressed properly — by fixing the underlying gap — never by relaxing the
verification configuration to force a pass (invariant 4).

A PR is merge-ready only when all of the following hold:

- CI is green.
- Every review bot has finished (no pending checks or placeholder
  comments per §3).
- Every comment, top-level and inline, is either resolved or has a reply
  per §4.

Even when a PR is merge-ready, the merge itself is performed by a human
(invariant 3). An agent that reaches merge-ready status stops there and
hands off.
