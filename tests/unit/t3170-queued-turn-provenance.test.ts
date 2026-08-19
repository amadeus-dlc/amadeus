// covers: function:formatIntentAutonomyUpdateFailure
// size: small
//
// t3170 — queued mid-turn input is not HUMAN_TURN provenance (#3170).
//
// Completion condition 1 (harness primary evidence): Claude Code skips
// UserPromptSubmit for a message queued while the agent is mid-turn
// (anthropics/claude-code#31114; HTTP and command hooks both skip on 2.1.69–
// 2.1.70; the same skip is the living shape on 2.1.233). The mint hook therefore
// never sees `queued_command` attachments. Complementary capture would require
// scraping a channel the host does not treat as a prompt, which collides with
// the machine-injection classifier (#708/#755) and with consuming an unrelated
// turn (#3153). The simplest close is (b): document the constraint and make
// PROVENANCE_REQUIRED name the turn-boundary retry.
//
// This unit file stays small: it pins the formatter only. File-read pins
// would import node:fs and measure as medium (unit max is small). The
// published contract is still in docs/reference/24-intent-autonomy.md; the
// CLI spawn in t435 asserts the same turn-boundary diagnostic. Expected
// strings are literals, not recomputed from the implementation.

import { describe, expect, test } from "bun:test";
import { formatIntentAutonomyUpdateFailure } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";

describe("t3170 queued mid-turn input is not HUMAN_TURN provenance", () => {
  test("PROVENANCE_REQUIRED names the turn-boundary retry", () => {
    expect(formatIntentAutonomyUpdateFailure("PROVENANCE_REQUIRED")).toBe(
      "Intent autonomy update failed: PROVENANCE_REQUIRED. Queued mid-turn input is not recorded as HUMAN_TURN; submit the command again at a turn boundary (after the agent yields).",
    );
  });

  test("other autonomy failures stay a prefix-only relay", () => {
    expect(formatIntentAutonomyUpdateFailure("STALE_REVISION")).toBe(
      "Intent autonomy update failed: STALE_REVISION",
    );
  });
});
