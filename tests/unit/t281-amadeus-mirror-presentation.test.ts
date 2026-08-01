// t281 — C8 fixed-field, secret-safe Mirror presentation.
// covers: packages/framework/core/tools/amadeus-mirror-presentation.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  MIRROR_ISSUE_TITLE_MAX_BYTES,
  MIRROR_USER_CONTRACT,
  mirrorContractCommandUsage,
  renderMirrorLegacyHelp,
  renderMirrorLifecycleHelp,
  renderMirrorIssueContent,
  renderMirrorPrompt,
  renderMirrorStatus,
} from "../../packages/framework/core/tools/amadeus-mirror-presentation.ts";
import {
  EMPTY_MIRROR_STATE,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import { mirrorEventIdentity } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";

const EVENT = mirrorEventIdentity(
  "intent-1",
  { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
  "create",
);

describe("t281 Issue content", () => {
  test("renders the documented headings in a fixed order", () => {
    const content = renderMirrorIssueContent({
      snapshot: {
        intentUuid: "intent-1",
        intentDir: "amadeus/spaces/default/intents/demo",
        projectSummary: "Mirror the lifecycle",
        lifecyclePhase: "CONSTRUCTION",
        currentStage: "code-generation",
        status: "Running",
        registryStatus: "in-flight",
        updatedAt: "2026-07-25T00:00:00Z",
      },
      marker: "<!-- marker -->",
    });
    expect(content.body).toBe(
      [
        "## Intent UUID",
        "intent-1",
        "",
        "## Summary",
        "Mirror the lifecycle",
        "",
        "## Phase",
        "CONSTRUCTION",
        "",
        "## Stage",
        "code-generation",
        "",
        "## Status",
        "Running",
        "",
        "## Updated At",
        "2026-07-25T00:00:00Z",
        "",
        "## Mirror Marker",
        "<!-- marker -->",
      ].join("\n"),
    );
    expect(content.labels).toEqual(["amadeus-intent-mirror"]);
  });

  // A snapshot carrying a pending completionInstance always reports Status
  // Running, so the terminal Status has to be derived rather than echoed.
  test("renders Status Completed when a completion instance is pending", () => {
    const content = renderMirrorIssueContent({
      snapshot: {
        intentUuid: "intent-1",
        intentDir: "amadeus/spaces/default/intents/demo",
        projectSummary: "Mirror the lifecycle",
        lifecyclePhase: "CONSTRUCTION",
        currentStage: "code-generation",
        status: "Running",
        registryStatus: "in-flight",
        updatedAt: "2026-07-25T00:00:00Z",
        completionInstance: "completion-1",
      },
      marker: "<!-- marker -->",
    });
    expect(content.body).toContain("## Status\nCompleted\n");
    expect(content.body).not.toContain("## Status\nRunning\n");
    // Phase and Stage stay verbatim: only the Status line is derived.
    expect(content.body).toContain("## Phase\nCONSTRUCTION\n");
    expect(content.body).toContain("## Stage\ncode-generation\n");
  });

  test("redacts secrets and URL queries without executing metacharacters", () => {
    const secret = "TOP-SECRET-SENTINEL";
    const content = renderMirrorIssueContent({
      snapshot: {
        intentUuid: "intent-1",
        intentDir: "demo",
        projectSummary:
          `token=${secret}; $(touch nope) \`echo\`\nhttps://example.test/x?password=${secret}`,
        lifecyclePhase: "CONSTRUCTION",
        currentStage: "code-generation",
        status: "Running",
        registryStatus: "in-flight",
        updatedAt: "2026-07-25T00:00:00Z",
      },
      marker: "<!-- marker -->",
    });
    expect(content.title).not.toContain(secret);
    expect(content.body).not.toContain(secret);
    expect(content.body).toContain("token=[REDACTED]");
    expect(content.body).toContain("?[REDACTED]");
  });
});

// The Issue title is the one field GitHub bounds hard (256 characters) and the
// one field the mirror writes exactly once, at create. It carries no identity —
// ownership is matched on the body marker — so it is derived from the Intent
// directory name rather than from the free-form Project summary.
describe("t281 Issue title", () => {
  const snapshotWith = (
    over: Partial<Parameters<typeof renderMirrorIssueContent>[0]["snapshot"]>,
  ) => ({
    intentUuid: "intent-1",
    intentDir: "260801-open-bug-batch-5-ab12cd34",
    projectSummary: "Mirror the lifecycle",
    lifecyclePhase: "CONSTRUCTION",
    currentStage: "code-generation",
    status: "Running",
    registryStatus: "in-flight" as const,
    updatedAt: "2026-07-25T00:00:00Z",
    ...over,
  });

  test("names the Intent directory, never the Project summary", () => {
    const content = renderMirrorIssueContent({
      snapshot: snapshotWith({ projectSummary: "a very chatty Project field" }),
      marker: "<!-- marker -->",
    });
    expect(content.title).toBe("Intent Mirror: 260801-open-bug-batch-5-ab12cd34");
    expect(content.title).not.toContain("chatty");
    // The Project summary still reaches the body verbatim.
    expect(content.body).toContain("## Summary\na very chatty Project field\n");
  });

  test("falls back to the Intent UUID when the directory is unusable", () => {
    const content = renderMirrorIssueContent({
      snapshot: snapshotWith({ intentDir: "   " }),
      marker: "<!-- marker -->",
    });
    expect(content.title).toBe("Intent Mirror: intent-1");
  });

  // Regression: a 1440-byte Project field used to be pasted into the title
  // whole, producing a >943-byte title that GitHub rejects with a
  // non-retryable 422 — which strands the create receipt and blocks the
  // workflow's completion boundary permanently.
  test("keeps the title far below the GitHub bound for a huge Project field", () => {
    const content = renderMirrorIssueContent({
      snapshot: snapshotWith({ projectSummary: "x".repeat(1440) }),
      marker: "<!-- marker -->",
    });
    expect(Buffer.byteLength(content.title, "utf8")).toBeLessThan(943);
    expect(Buffer.byteLength(content.title, "utf8")).toBeLessThanOrEqual(
      MIRROR_ISSUE_TITLE_MAX_BYTES,
    );
  });

  // The directory name is a short slug, so this backstop should never fire in
  // practice — which is exactly why it is pinned here rather than trusted.
  test("clamps an over-long Intent directory in the byte domain", () => {
    const content = renderMirrorIssueContent({
      snapshot: snapshotWith({ intentDir: "z".repeat(600) }),
      marker: "<!-- marker -->",
    });
    expect(Buffer.byteLength(content.title, "utf8")).toBe(
      MIRROR_ISSUE_TITLE_MAX_BYTES,
    );
    expect(content.title.startsWith("Intent Mirror: zzz")).toBe(true);
  });

  // Clamping by byte count must not cut a character in half: a truncated UTF-8
  // sequence is a replacement character on GitHub's side, not a shorter title.
  test("never splits a multi-byte character when clamping", () => {
    const content = renderMirrorIssueContent({
      // 4 bytes per emoji, so no byte budget can land on a character boundary
      // by arithmetic luck.
      snapshot: snapshotWith({ intentDir: "🎼".repeat(200) }),
      marker: "<!-- marker -->",
    });
    const bytes = Buffer.byteLength(content.title, "utf8");
    expect(bytes).toBeLessThanOrEqual(MIRROR_ISSUE_TITLE_MAX_BYTES);
    expect(content.title).not.toContain("�");
    // 15-byte prefix + floor(185 / 4) = 46 whole emoji.
    expect(bytes).toBe(15 + 46 * 4);
  });
});

describe("t281 status and prompt", () => {
  test("derives both CLI help surfaces from the canonical command contract", () => {
    const lifecycle = renderMirrorLifecycleHelp();
    for (const command of [
      ...MIRROR_USER_CONTRACT.boundaryCommands,
      ...MIRROR_USER_CONTRACT.manualCommands,
      ...MIRROR_USER_CONTRACT.answerCommands,
      ...MIRROR_USER_CONTRACT.repairCommands,
    ]) expect(lifecycle).toContain(mirrorContractCommandUsage(command));
    const legacy = renderMirrorLegacyHelp();
    expect(legacy).toContain("<create|sync|close> --instance <id>");
    expect(legacy).toContain("status [--intent <dirName>]");
    expect(legacy).toContain("Lifecycle default mode: prompt");
  });

  test("renders mode, Issue, repository, provenance, warning, then action", () => {
    const status = renderMirrorStatus({
      mode: "prompt",
      configSources: ["/project/amadeus/config.json"],
      state: EMPTY_MIRROR_STATE,
      provenanceStatus: "unlinked",
    });
    const fields = [
      "Mode:",
      "Config Source:",
      "Issue:",
      "Repository:",
      "Provenance:",
      "Pending/Safety Blocked:",
      "Warning:",
      "Next Action:",
    ];
    let cursor = -1;
    for (const field of fields) {
      const next = status.indexOf(field);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(status).toContain("Provenance: unlinked");
  });

  test.each(["verified", "unverified"] as const)(
    "prints provenance value %s",
    (provenanceStatus) => {
      expect(
        renderMirrorStatus({
          mode: "auto",
          configSources: [],
          state: EMPTY_MIRROR_STATE,
          provenanceStatus,
        }),
      ).toContain(`Provenance: ${provenanceStatus}`);
    },
  );

  test("prompt names operation, target, and event-scoped skip effect", () => {
    const prompt = renderMirrorPrompt({
      operation: "create",
      event: EVENT,
      intentDir: "amadeus/spaces/default/intents/demo",
      repository: "acme/app",
      issueNumber: null,
    });
    expect(prompt).toContain("Mirror operation: create");
    expect(prompt).toContain("Repository: acme/app");
    expect(prompt).toContain("Skip to suppress only this event");
  });
});
