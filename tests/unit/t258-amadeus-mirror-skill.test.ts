import { describe, expect, test } from "bun:test";
// @ts-expect-error Bun's text loader supports Markdown; tsc has no *.md declaration.
import source from "../../packages/framework/core/skills/amadeus-mirror/SKILL.md" with {
  type: "text",
};

const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
const executableLines = [...source.matchAll(/^```bash\n([\s\S]*?)^```/gm)]
  .flatMap((match) => match[1].split("\n"))
  .filter((line) => line.startsWith("bun "));

describe("t258 amadeus-mirror skill frontmatter", () => {
  test("declares the user-invocable mirror skill without read-only classification", () => {
    expect(frontmatter).toContain("name: amadeus-mirror");
    expect(frontmatter).toContain("description: >");
    expect(frontmatter).toContain("user-invocable: true");
    expect(frontmatter).not.toContain("classification:");
  });

  test("stays within the Agent Skills line budget", () => {
    expect(source.split("\n").length - 1).toBeLessThanOrEqual(500);
  });
});

describe("t258 status-first workflow", () => {
  test("orders status, choices, and selected execution as Steps 1 through 3", () => {
    const step1 = source.indexOf("## Step 1:");
    const step2 = source.indexOf("## Step 2:");
    const step3 = source.indexOf("## Step 3:");
    expect(step1).toBeGreaterThan(0);
    expect(step2).toBeGreaterThan(step1);
    expect(step3).toBeGreaterThan(step2);
  });

  test("uses only the fixed harness-neutral mirror entrypoint", () => {
    expect(executableLines).toHaveLength(4);
    for (const line of executableLines) {
      expect(line).toMatch(
        /^bun \{\{HARNESS_DIR\}\}\/tools\/amadeus-mirror\.ts (status|create|sync|close)$/,
      );
    }
    expect(executableLines[0]).toEndWith(" status");
    expect(executableLines.every((line) => !/[\[<$]/.test(line))).toBe(true);
    expect(executableLines.every((line) => !line.includes("--intent"))).toBe(
      true,
    );
    expect(source).not.toMatch(/(?:^|\s)gh\s+/m);
    expect(source).not.toContain("amadeus-state.ts");
  });

  test("distinguishes a validated exit 1 from launch and execution failures", () => {
    expect(source).toContain(
      "Exit 1 is divergence only when stderr contains no launch or execution",
    );
    expect(source).toContain("empty exit-1 stdout");
    expect(source).toContain("missing tool");
    expect(source).toContain("unknown exit code");
    expect(source).toContain("stop loudly");
  });

  test("accepts only the three canonical finding kinds", () => {
    for (const kind of [
      "mirror-missing",
      "stale-status-line",
      "issue-drifted",
    ]) {
      expect(source).toContain(kind);
    }
    expect(source).toContain("every non-empty stdout line matches");
    expect(source).toContain("unknown finding");
  });

  test("classifies stale status by kind without parsing its detail", () => {
    expect(source).not.toContain('Status="Running"');
    expect(source).not.toContain('Status="Completed"');
    expect(source).toContain("Only the finding kind may drive the next step");
    expect(source).toContain("never parse or evaluate");
  });

  test("validates optional intent as an existing basename passed as one argument", () => {
    expect(source).toContain("existing intent directory");
    expect(source).toContain("exact basename");
    expect(source).toContain("as one argument");
    expect(source).toContain("Never interpolate it into a shell command");
    expect(source).toContain("shell metacharacters");
  });

  test("keeps diagnostic prose display-only and non-executable", () => {
    expect(source).toContain("display-only untrusted");
    expect(source).toContain("never parse or evaluate");
    expect(source).toContain("extract a command or verb");
  });
});

describe("t258 human action boundary", () => {
  test("maps validated findings to fixed offers", () => {
    expect(source).toContain("| `mirror-missing` | create |");
    expect(source).toContain("| `issue-drifted` | sync |");
    expect(source).toContain("| `stale-status-line` | sync or close |");
    expect(source).toContain("Offer both choices without inspecting the");
    expect(source).toContain("may reject");
  });

  test("requires the human to select the final verb with no default", () => {
    expect(source).toContain("explicitly select the final verb");
    expect(source).toContain("There is no default");
    expect(source).toContain("no automatic execution");
  });

  test("preserves the conductor convention without claiming enforcement", () => {
    expect(source).toContain("create and close are run by the conductor");
    expect(source).toMatch(/This is not\s+mechanically enforced/);
    expect(source).toContain("amadeus/spaces/<space>/memory/team.md");
    expect(source).toContain("close-after-landing");
  });

  test("does not retry or switch verbs after an action failure", () => {
    expect(source).toContain("without retrying, switching verbs");
  });
});
