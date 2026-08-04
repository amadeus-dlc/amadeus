// covers: file:packages/framework/core/tools/amadeus-intent-completion.ts, file:packages/framework/core/tools/amadeus-harness-registry.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { HARNESS_REGISTRY } from "../../packages/framework/core/tools/amadeus-harness-registry.ts";

const LIVE_HARNESSES = HARNESS_REGISTRY.filter((descriptor) => descriptor.autonomyLive);

const LIVE_ENABLED = process.env.AMADEUS_INTENT_COMPLETION_LIVE === "1";

function commandFor(environmentName: string): string[] {
  const raw = process.env[environmentName];
  if (raw === undefined) throw new Error(`missing live command: ${environmentName}`);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((part) => typeof part !== "string" || part.length === 0)) {
    throw new Error(`${environmentName} must be a non-empty JSON string array`);
  }
  return parsed;
}

describe("opt-in five-harness credential seam", () => {
  test.skipIf(!LIVE_ENABLED)("executes every native harness command and validates Judge/election observations", async () => {
    expect(LIVE_HARNESSES.map((descriptor) => descriptor.id)).toEqual([
      "claude", "codex", "cursor", "opencode", "kimi",
    ]);
    const receipts = await Promise.all(LIVE_HARNESSES.map(async (descriptor) => {
      const environmentName = descriptor.native.liveCommandEnv;
      if (environmentName === null) throw new Error(`live harness ${descriptor.id} has no command adapter`);
      const [executable, ...args] = commandFor(environmentName);
      const child = Bun.spawn([executable, ...args], {
        stdin: new Blob([JSON.stringify({
          schema_version: 1,
          harness_id: descriptor.id,
          scenario: "intent-autonomy-judge-election",
          required_observations: ["judge-invoked", "solo-election-or-loud-degradation"],
        })]),
        stdout: "pipe",
        stderr: "pipe",
        timeout: 25_000,
      });
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      if (exitCode !== 0) throw new Error(`${descriptor.id} live command failed (${exitCode}): ${stderr}`);
      const output = stdout.trim();
      if (output.length === 0) throw new Error(`${descriptor.id} live command produced no receipt`);
      const receipt = JSON.parse(output.split("\n").at(-1)!) as Record<string, unknown>;
      return { descriptor, receipt };
    }));
    for (const { descriptor, receipt } of receipts) {
      expect(receipt.harness_id).toBe(descriptor.id);
      expect(receipt.success).toBe(true);
      expect(receipt.judge_invoked).toBe(true);
      expect(["solo-election", "loud-degradation"]).toContain(String(receipt.decision_path));
      expect(typeof receipt.implementation_revision).toBe("string");
      expect(typeof receipt.package_digest).toBe("string");
    }
  });
});
