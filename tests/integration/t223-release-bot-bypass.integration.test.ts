import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("t223 release bot bypass boundary", () => {
  test("release phases run as separate sequential jobs", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/release.yml"), "utf8");
    const workflow = Bun.YAML.parse(yaml) as {
      jobs: Record<
        string,
        {
          needs?: string | string[];
          outputs?: Record<string, string>;
          permissions?: Record<string, string>;
          steps: Array<{ name?: string }>;
        }
      >;
    };

    expect(Object.keys(workflow.jobs)).toEqual(["prepare", "github-release", "publish"]);
    expect(workflow.jobs.prepare?.outputs).toEqual({
      version: `\${{ steps.release.outputs.version }}`,
      sha: `\${{ steps.release.outputs.sha }}`,
    });
    expect(workflow.jobs["github-release"]?.needs).toBe("prepare");
    expect(workflow.jobs.publish?.needs).toEqual(["prepare", "github-release"]);
    expect(workflow.jobs.publish?.permissions).toEqual({
      contents: "read",
      "id-token": "write",
    });

    const prepareSteps = workflow.jobs.prepare?.steps.map((step) => step.name);
    const githubReleaseSteps = workflow.jobs["github-release"]?.steps.map((step) => step.name);
    const publishSteps = workflow.jobs.publish?.steps.map((step) => step.name);

    expect(prepareSteps).toContain("Bump, commit, tag, push (release-it)");
    expect(githubReleaseSteps).toContain("Create GitHub Release with generated notes");
    expect(publishSteps).toContain("Publish to npm");
  });

  test("release writes use the GitHub App token", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/release.yml"), "utf8");

    expect(yaml).toContain("contents: read # release writes use the narrowly scoped GitHub App token below");
    expect(yaml).toContain("uses: actions/create-github-app-token@v3");
    expect(yaml).toContain(`client-id: \${{ vars.METRICS_BOT_CLIENT_ID }}`);
    expect(yaml).toContain(`private-key: \${{ secrets.METRICS_BOT_PRIVATE_KEY }}`);
    expect(yaml).toContain("permission-contents: write");
    expect(yaml).toContain(`token: \${{ steps.app-token.outputs.token }}`);
    expect(yaml).toContain(`GH_TOKEN: \${{ steps.app-token.outputs.token }}`);
    expect(yaml).toContain(`\${{ steps.app-token.outputs.app-slug }}[bot]`);
    expect(yaml).toContain(
      `if: \${{ !(github.event_name == 'push' && github.actor == 'amadeus-dlc-bot[bot]') }}`,
    );
    expect(yaml).not.toContain('git config user.name "github-actions[bot]"');
    expect(yaml).not.toContain("tags/commits pushed with GITHUB_TOKEN never trigger other workflows");
  });
});
