# Pi TUI formal dogfood checklist

Use this checklist on both macOS and Linux. It verifies the human interaction
boundary that RPC automation cannot prove. Do not commit provider credentials,
raw prompts, raw model output, trust-store contents, or the resulting live
evidence file.

## Before the run

- [ ] Check out the exact candidate commit with a clean worktree and record its
      full 40-hex SHA.
- [ ] Generate and verify the candidate with `bun scripts/package.ts pi` and
      `bun scripts/package.ts pi --check`; record the generated catalog digest.
- [ ] Record `pi --version` and require Pi 0.83.0 or later.
- [ ] Record only the provider identifier. Keep credentials in Pi's normal
      user configuration and out of Amadeus files, logs, shell history, and the
      evidence document.
- [ ] Install the complete candidate with `@amadeus-dlc/setup --harness pi`,
      review Pi's native project-trust prompt, and run `/skill:amadeus --doctor`.

## Interactive TUI journey

- [ ] Start Pi in its normal TUI; do not use `--mode rpc` for this section.
- [ ] Invoke `/skill:amadeus` with a disposable, non-secret test task.
- [ ] Verify that Amadeus renders the next gate as numbered prose.
- [ ] Answer the gate in the TUI through a native Pi `input` event whose source
      is `interactive`.
- [ ] Verify the canonical audit contains a new `HUMAN_TURN` for that input and
      a corresponding `GATE_APPROVED` after the answer is accepted.
- [ ] Let the agent settle and verify that any automatic continuation begins
      only after the token-bound `agent_start` observation, or—when the token
      is appended after `agent_start`—after the same live process observes it
      at `agent_settled`. A restarted process must not infer that observation.
- [ ] Exercise one tool call and verify paired start/end lifecycle evidence.
- [ ] Trigger compaction and verify the canonical mission is reinjected without
      trusting the model-generated summary and without minting human presence.
- [ ] Stop and resume the same workflow, then verify doctor remains green.

## Separate RPC journey

Run the packaged child driver only with explicit opt-in:

```bash
AMADEUS_PI_LIVE_RPC=1 \
AMADEUS_PI_LIVE_PROVIDER_ID='openai-codex' \
AMADEUS_PI_LIVE_PROJECT_DIR='<clean-installed-project>' \
bun scripts/pi-live-rpc.ts
```

Leave `AMADEUS_PI_LIVE_MODEL_ID` unset when `pi-multi-account` owns account and
model routing. The result records the provider account and model selected by Pi.
Set the model variable only for an intentional single-account override.

- [ ] Require `status=passed`; a typed `status=skipped` is not formal evidence.
- [ ] Require `rpcChildSucceeded=true`, `humanTurnCount=0`, and
      `gateApprovedCount=0`.
- [ ] Confirm replay and process-cleanup tests are green for the same commit.

## Evidence assembly

- [ ] Hash the redacted TUI transcript and retain only `transcriptDigest` in the
      formal evidence document.
- [ ] Retain only the live RPC `outputDigest`, not raw provider output.
- [ ] Set M1-M10 assertions to true only after every canonical test path in
      `tests/conformance/pi-m1-m10-trace.md` is green for the same commit.
- [ ] Combine exactly one macOS run and one Linux run.
- [ ] Add the native Windows negative doctor result (`pi.os` rejected).
- [ ] Validate the document with
      `bun scripts/pi-conformance-evidence.ts <evidence.json>`; ordinary CI
      skips and missing platform runs must leave the result invalid rather than
      green.
