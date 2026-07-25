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
    expect(executableLines).toHaveLength(6);
    for (const line of executableLines) {
      expect(line).toMatch(
        /^bun <harness-dir>\/tools\/amadeus-mirror-lifecycle\.ts (repair status|manual (create|sync|close) --instance <invocation-id>|repair relink --issue <n>|repair abandon --operation <id>)$/,
      );
    }
    expect(executableLines[0]).toEndWith(" repair status");
    expect(source).not.toContain("{{HARNESS_DIR}}");
    expect(source).toContain("Pass the validated basename as one argument");
    expect(source).not.toMatch(/(?:^|\s)gh\s+/m);
    expect(source).not.toContain("amadeus-state.ts");
  });

  test("distinguishes a validated exit 1 from launch and execution failures", () => {
    expect(source).toContain("Capture launch success, exit code, stdout, and stderr separately");
    expect(source).toContain("Exit 0 returns");
    expect(source).toContain("Exit 1 is a runtime or safety failure");
    expect(source).toContain("exit 2 is usage");
    expect(source).toContain("Never derive a command from output prose");
  });

  test("accepts only the closed lifecycle and repair verbs", () => {
    for (const verb of ["create", "sync", "close", "relink", "abandon"]) {
      expect(source).toContain(verb);
    }
    expect(source).toMatch(/run the matching\s+fixed lifecycle command/);
    expect(source).toMatch(/Run exactly one selected command as an argument array/);
  });

  test("keeps status prose non-authoritative", () => {
    expect(source).not.toContain('Status="Running"');
    expect(source).not.toContain('Status="Completed"');
    expect(source).toContain("Never infer an action from free-form diagnostic text");
    expect(source).toContain("Never derive a command from output prose");
  });

  test("validates optional intent as an existing basename passed as one argument", () => {
    expect(source).toContain("existing intent directory");
    expect(source).toContain("exact basename");
    expect(source).toContain("as one argument");
    expect(source).toContain("Never interpolate it into a shell command");
    expect(source).toContain("shell metacharacters");
  });

  test("keeps diagnostic prose display-only and non-executable", () => {
    expect(source).toContain("Never infer an action from free-form diagnostic text");
    expect(source).toContain("Never derive a command from output prose");
    expect(source).toContain("interpret output prose as another command");
  });
});

describe("t258 human action boundary", () => {
  test("maps validated findings to fixed offers", () => {
    expect(source).toContain("safe choices: create, sync, close, relink, or abandon");
    expect(source).toContain("when applicable");
    expect(source).toMatch(/Close\s+still requires verified provenance/);
  });

  test("requires the human to select the final verb with no default", () => {
    expect(source).toContain("explicitly select the final verb");
    expect(source).toContain("There is no default");
    expect(source).toContain("no automatic execution");
  });

  test("preserves the conductor convention without claiming enforcement", () => {
    expect(source).toContain("Use the lifecycle tool as the single source of truth");
    expect(source).toMatch(/Auto is\s+not background consent/);
    expect(source).toContain("Repair is always an elevated one-operation confirmation");
    expect(source).toMatch(/It is never implied\s+by `auto`/);
  });

  test("does not retry or switch verbs after an action failure", () => {
    expect(source).toContain("Never retry, switch verbs");
  });
});
