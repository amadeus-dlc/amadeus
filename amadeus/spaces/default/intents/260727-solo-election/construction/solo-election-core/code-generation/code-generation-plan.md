# Code Generation Plan — solo-election-core (U1)

**Intent:** 260727-solo-election | **Unit:** U1 walking skeleton | **Test strategy:** Comprehensive
**Traceability:** FR-05/06/07, BR-U1-1〜8, bolt-plan Bolt 1 intra-bolt order

## Step 1: Baseline & failing-proof tests (red first)

- [x] Run `tests/run-tests.sh --ci` (or targeted t234/t244) on **current** code; record green baseline
- [x] Add **2-voter election fixture** (`voters: ["subagent-1", "subagent-2"]`) helper in t234
- [x] Write **failing-proof** assertions (must fail on current tally):
  - [x] `{5,1}` → hold `discussion-needed` (currently established — line ~150-151)
  - [x] `{4,1}` → hold `quorum-short` (currently established)
  - [x] `{1,7}` same choice → hold `split` (currently established — line ~147-148)
- [x] Confirm new tests **fail red** before implementation (bolt-plan order (1))

**Maps to:** FR-05 AC (落ちる実証), BR-U1-1/2/3, bolt-plan (1)

## Step 2: Domain model — HoldReason + HOLD_RESOLUTIONS

- [ ] Extend `HoldReason` with `"split"` in `packages/framework/core/tools/amadeus-election-model.ts:419`
- [ ] Add `split: { adopted: "tallied", rejected: "tallied", reopen: "collecting" }` to `HOLD_RESOLUTIONS` in `packages/framework/core/tools/amadeus-election.ts:81-86`
- [ ] Propagate type changes to harness copies via dist pipeline (Step 7)

**Maps to:** FR-07, BR-U1-6, domain-entities.md

## Step 3: tally() 2-voter branch (ADR-1/2)

- [ ] In `tally()` (`amadeus-election-model.ts:440`), after block check, branch on `election.voters.length === 2`:
  - [ ] `discuss >= 1` → hold `discussion-needed` (not `>= 2`)
  - [ ] `abstain >= 1` → hold `quorum-short`
  - [ ] `favor === 1 && against === 1` → hold `split`
- [ ] Preserve existing 3+ voter path unchanged (`discuss >= 2`, `favor+against === 0`, choice winner/tie)
- [ ] Preserve first-match order: block → discussion → quorum → split → choice winner

**Maps to:** FR-05, FR-06, BR-U1-1/2/3/4/5/7, business-logic-model.md

## Step 4: Unit tests — t234 audit & regression

- [ ] Update existing t234 test `"tally GoA holds..."` (~142-155): 2-voter cases expect hold not established
- [ ] Add exhaustive 2-voter combination matrix (15 combos per business-logic-model)
- [ ] Add BR-U1-7 test: 2 declared voters with member transport ballots → same 2-voter rules
- [ ] Add split resolution path test: hold split → report adopted/rejected/reopen → state transition
- [ ] Run full t234 + t244; **bit-match** all 3+ voter cases (FR-06 regression)
- [ ] Add 3–6 voter representative combo regression cases if not already covered

**Maps to:** FR-05/06/07, BR-U1-1〜7

## Step 5: TLA formal model extension

- [ ] Extend `specs/tla/FormalElection.tla`:
  - [ ] Parameterize / add 2-voter instance path (Voters 2-body)
  - [ ] Add `"SPLIT"` to `HoldReasons`
  - [ ] Extend `HoldReason(r)` with 2-voter discuss/abstain/split branches mirroring TS
- [ ] Update `specs/tla/model-map.json` SHA mappings for changed symbols
- [ ] Run TLC exploration (two-layer-verification-posture); ensure NOT_DETECTED or document counterexample

**Maps to:** business-logic-model TLA section, ADR-1 (a)

## Step 6: Solo loop integration test

- [ ] Add integration test (new file or extend t236/t237 pattern):
  - [ ] Open election with `subagent-1`, `subagent-2`
  - [ ] Submit 2 ballots with `voterKind: "subagent"`
  - [ ] 2-0 established path → recorded state + tally.json + record.md
  - [ ] 1-1 split path → hold split (walking skeleton escalation proof)
- [ ] Add fail-closed case: ballot missing voterKind → Ballot.parse rejects (U1-SEC-01)
- [ ] Use in-process canonical import (not dist copies) per BR-U1-8 / cid:code-generation:injection-surface-verify

**Maps to:** FR-01/03, BR-U1-8, U1-SEC-01

## Step 7: Dist & self-install sync

- [ ] Apply model/election changes to canonical `packages/framework/core/tools/`
- [ ] Run `bun run dist:check` from repo root; fix any drift
- [ ] Run `bun run promote:self:check`; apply promote if needed
- [ ] Verify all 7 CLI dist faces + 5 self-install faces green (FR-13 CLI portion for U1)

**Maps to:** FR-13 (CLI/model faces), unit-of-work U1 scope

## Step 8: Verification gate

- [ ] `tests/run-tests.sh --ci` full green
- [ ] `bun run dist:check && bun run promote:self:check` exit 0
- [ ] Grep: no HOLD_RESOLUTIONS bypass paths for split
- [ ] Mark plan checkboxes complete in this file

**Maps to:** NFR-01, build-and-test readiness

## Step 9: Code summary artifact

- [ ] Write `code-summary.md` listing files changed, test counts, deviations, skeleton proof status

**Maps to:** stage protocol Step 5

---

**Execution order note (risk control):** Steps 1→3→4→5→6→7→8 — do not run skeleton election (Step 6 happy path) until tally (Steps 2-3) is green.

**Out of scope for U1:** SKILL.md / team.md changes (U2), spawn transport driver (U2 surface), new CLI verbs
