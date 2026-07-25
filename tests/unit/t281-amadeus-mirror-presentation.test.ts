// t281 — C8 fixed-field, secret-safe Mirror presentation.
// covers: packages/framework/core/tools/amadeus-mirror-presentation.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
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

describe("t281 status and prompt", () => {
  test("derives both CLI help surfaces from the canonical command contract", () => {
    const lifecycle = renderMirrorLifecycleHelp();
    for (const command of [
      ...MIRROR_USER_CONTRACT.boundaryCommands,
      ...MIRROR_USER_CONTRACT.manualCommands,
      ...MIRROR_USER_CONTRACT.repairCommands,
    ]) expect(lifecycle).toContain(mirrorContractCommandUsage(command));
    const legacy = renderMirrorLegacyHelp();
    expect(legacy).toContain("<create|sync|close|status>");
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
