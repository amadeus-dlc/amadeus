# Requirements Analysis Questions

Stage: requirements-analysis
Intent: 260813-remove-team-up
Depth: Minimal (budget ≤ 4)
Mode: full autonomy (`decide-question`)

- **E-OC1 承認証跡:** 2026-08-13T14:05:00Z — ユーザーの HUMAN_TURN により発行された full autonomy grant `intent-grant-70bd19602b3b400c4ce854fda0f93ae6` が question interaction を認可し、Q1〜Q3 は同 grant 下の `agent-recommendation` として裁定・記録された。

User-decided items not re-asked (`cid:requirements-analysis:c5`):
- Delete unused `team-up.sh` rather than patching #2970's bash 3.2 crash.

---

## Q1. `team-msg.sh` after launcher removal

`team-msg.sh` is a separate messaging CLI. RE found it does not exec `team-up.sh` (comment-only inverse mapping at `:57`).

A. Keep `team-msg.sh` in this intent (launcher-only deletion)
B. Delete `team-msg.sh` in the same change
C. Defer `team-msg.sh` to a follow-up intent
X. Other (please specify)

[Answer]: A. Keep `team-msg.sh` in this intent (launcher-only deletion)
**Mode:** full / decide-question
**Decider:** agent-recommendation (`keep-team-msg`)
**Decision id:** auto-decision-2eac2ed6c3f1769fa858f1d267ab9471
**Degraded:** solo-election unavailable

---

## Q2. User-facing Team Mode documentation

`docs/guide/20-team-mode.md` (and ja) still documents `bash {{HARNESS_DIR}}/tools/team-up.sh` as the current launcher.

A. Rewrite the guide to state Team Mode launcher is removed; drop live invocation recipes
B. Delete the Team Mode guide files entirely in this change
C. Leave the guides unchanged (docs follow-up later)
X. Other (please specify)

[Answer]: A. Rewrite the guide to state Team Mode launcher is removed; drop live invocation recipes
**Mode:** full / decide-question
**Decider:** agent-recommendation (`rewrite-removed`)
**Decision id:** auto-decision-f733005c997504c15c5c48ffec3549c5
**Degraded:** solo-election unavailable

---

## Q3. Related open team-up enhancement issues

Open: #1250, #998, #1136, #1087. They assume the launcher remains.

A. This intent's requirements note them as obsolete; closing is a follow-up after the deletion PR, not a code deliverable
B. This intent must close those GitHub issues as part of completion
C. Ignore them
X. Other (please specify)

[Answer]: A. This intent's requirements note them as obsolete; closing is a follow-up after the deletion PR, not a code deliverable
**Mode:** full / decide-question
**Decider:** agent-recommendation (`note-obsolete-followup`)
**Decision id:** auto-decision-4de3b367df97ca180d4144cd0f274370
**Degraded:** solo-election unavailable
