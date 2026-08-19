// covers: function:formatIntentAutonomyUpdateFailure, file:docs/reference/24-intent-autonomy.md, file:packages/framework/core/hooks/amadeus-mint-presence.ts
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
// Seams: the CLI formatter (public refusal text) and the published contract
// in docs/reference/24-intent-autonomy.md. Expected strings are literals, not
// recomputed from the implementation.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";
import { formatIntentAutonomyUpdateFailure } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";

const AUTONOMY_DOC = join(REPO_ROOT, "docs", "reference", "24-intent-autonomy.md");
const MINT_HOOK = join(REPO_ROOT, "packages", "framework", "core", "hooks", "amadeus-mint-presence.ts");

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

  test("the autonomy chapter documents that queued mid-turn input is not presence", () => {
    const doc = readFileSync(AUTONOMY_DOC, "utf-8");
    expect(doc).toContain("queued while the agent is mid-turn");
    expect(doc).toContain("UserPromptSubmit");
    expect(doc).toContain("turn boundary");
    expect(doc).toContain("PROVENANCE_REQUIRED");
  });

  test("the mint hook header names the queued-delivery skip", () => {
    const src = readFileSync(MINT_HOOK, "utf-8");
    expect(src).toContain("queued mid-turn");
    expect(src).toContain("UserPromptSubmit");
  });
});
