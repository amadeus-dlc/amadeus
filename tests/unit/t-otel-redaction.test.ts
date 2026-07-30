// covers: otel:redaction
// size: small
//
// U4 (local-exporters) — the production two-layer redaction policy
// (FR-DST-3/4/5): default-deny key admission, mandatory value scrubbing on
// opt-in keys (BR-12), the `Command` safe-key revisit (BR-11), and the
// credential scanner that shares the policy's pattern vocabulary (BR-16).
// Pure functions only — no fs, no spawn.

import { describe, expect, test } from "bun:test";
import { REGISTERED_EVENTS } from "../../dist/claude/.claude/otel/event-registry.ts";
import {
  CREDENTIAL_SCRUB_PATTERNS,
  DEFAULT_REDACTION_POLICY,
  redactAttributes,
  scanForCredentials,
  scrubCredentials,
} from "../../dist/claude/.claude/otel/redaction.ts";

const GH_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz012345";
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
const SK_TOKEN = "sk-abcdefghijklmnopqrstuvwxyz012345";

describe("key admission (default-deny, FR-DST-3)", () => {
  test("safe keys pass, unknown keys are dropped, input is never mutated", () => {
    const attrs = { Stage: "code-generation", Prompt: "secret prompt text", argv: "--token x" };
    const out = redactAttributes(attrs);
    expect(out.Stage).toBe("code-generation");
    expect("Prompt" in out).toBe(false);
    expect("argv" in out).toBe(false);
    expect(attrs.Prompt).toBe("secret prompt text");
  });

  test("every registry canonical required attribute is admitted by the default policy", () => {
    const admitted = new Set([...DEFAULT_REDACTION_POLICY.safeKeys, ...DEFAULT_REDACTION_POLICY.optIn]);
    for (const def of REGISTERED_EVENTS) {
      for (const key of def.requiredAttributes) {
        expect(admitted.has(key)).toBe(true);
      }
    }
  });

  test("Command is NOT a raw safe key — it is admitted only via the scrubbed opt-in tier (FR-DST-4)", () => {
    expect(DEFAULT_REDACTION_POLICY.safeKeys).not.toContain("Command");
    expect(DEFAULT_REDACTION_POLICY.optIn).toContain("Command");
  });
});

describe("value scrubbing (FR-DST-5)", () => {
  test("an opt-in value is scrubbed — opt-in never means raw pass-through (BR-12)", () => {
    const out = redactAttributes({ Tool: "git", Command: `git clone https://x:${GH_TOKEN}@github.com/r` });
    const command = out.Command as string;
    expect(command).not.toContain(GH_TOKEN);
    expect(command).toContain("[REDACTED]");
  });

  test("a safe-key value carrying a credential is scrubbed too (defense in depth)", () => {
    const out = redactAttributes({ Details: `aws key ${AWS_KEY} leaked` });
    expect(out.Details as string).not.toContain(AWS_KEY);
  });

  test("scrubbing recurses into nested objects and arrays", () => {
    const out = scrubCredentials({ a: [`bearer sk: ${SK_TOKEN}`, { deep: AWS_KEY }] }) as { a: [string, { deep: string }] };
    expect(JSON.stringify(out)).not.toContain(SK_TOKEN);
    expect(JSON.stringify(out)).not.toContain(AWS_KEY);
  });

  test("clean values pass through untouched", () => {
    const out = redactAttributes({ Stage: "s", ExitCode: 0, Decision: "approve" });
    expect(out).toEqual({ Stage: "s", ExitCode: 0, Decision: "approve" });
  });
});

describe("credential scanner (VER-2 vocabulary source, BR-16)", () => {
  test("detects every credential pattern class and reports labels, not secrets", () => {
    const haystack = [
      `aws ${AWS_KEY}`,
      `gh ${GH_TOKEN}`,
      `openai ${SK_TOKEN}`,
      "Authorization: Bearer abcdef0123456789abcd",
      "-----BEGIN PRIVATE KEY-----",
      "password=hunter2hunter2",
    ].join("\n");
    const labels = scanForCredentials(haystack);
    expect(labels).toContain("aws-access-key");
    expect(labels).toContain("github-token");
    expect(labels).toContain("api-token");
    expect(labels).toContain("bearer-token");
    expect(labels).toContain("private-key-block");
    expect(labels).toContain("credential-assignment");
    expect(labels.join(" ")).not.toContain(GH_TOKEN);
  });

  test("clean text scans empty", () => {
    expect(scanForCredentials("Stage: code-generation, Decision: approve")).toEqual([]);
  });

  test("the scanner and the scrubber share ONE pattern vocabulary (BR-16)", () => {
    expect(DEFAULT_REDACTION_POLICY.scrubPatterns).toBe(CREDENTIAL_SCRUB_PATTERNS);
  });
});
