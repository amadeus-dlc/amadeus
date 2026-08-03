import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("t223 release bot bypass boundary", () => {
  test("release phases run as separate sequential jobs", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/release.yml"), "utf8");
    const workflow = Bun.YAML.parse(yaml) as {
      permissions: Record<string, string>;
      jobs: Record<
        string,
        {
          needs?: string | string[];
          outputs?: Record<string, string>;
          permissions?: Record<string, string>;
          steps: Array<{
            name?: string;
            if?: string;
            uses?: string;
            with?: Record<string, unknown>;
            run?: string;
          }>;
        }
      >;
    };

    expect(Object.keys(workflow.jobs)).toEqual(["prepare", "build-dist", "github-release", "publish"]);
    expect(workflow.jobs.prepare?.outputs).toEqual({
      version: `\${{ steps.release.outputs.version }}`,
      sha: `\${{ steps.release.outputs.sha }}`,
    });
    expect(workflow.jobs["build-dist"]?.needs).toBe("prepare");
    expect(workflow.jobs["github-release"]?.needs).toEqual(["prepare", "build-dist"]);
    expect(workflow.jobs.publish?.needs).toEqual(["prepare", "github-release"]);
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.jobs.prepare?.permissions).toBeUndefined();
    expect(workflow.jobs["build-dist"]?.permissions).toBeUndefined();
    expect(workflow.jobs["github-release"]?.permissions).toBeUndefined();
    expect(workflow.jobs.publish?.permissions).toEqual({
      contents: "read",
      "id-token": "write",
    });

    const prepareSteps = workflow.jobs.prepare?.steps.map((step) => step.name);
    const buildDistSteps = workflow.jobs["build-dist"]?.steps.map((step) => step.name);
    const githubReleaseSteps = workflow.jobs["github-release"]?.steps.map((step) => step.name);
    const publishSteps = workflow.jobs.publish?.steps.map((step) => step.name);

    expect(prepareSteps).toContain("Bump, commit, tag, push (release-it)");
    expect(buildDistSteps).toEqual([
      "Skip dist asset build (dry run)",
      "Checkout released commit",
      "Set up bun",
      "Install dependencies",
      "Build dist",
      "Run full test suite",
      "Verify reproducible dist build",
      "Build release assets",
      "Upload release assets",
    ]);
    expect(githubReleaseSteps).toContain("Create GitHub Release with generated notes");
    expect(publishSteps).toContain("Publish to npm");

    const findStep = (job: string, name: string) => {
      const step = workflow.jobs[job]?.steps.find((candidate) => candidate.name === name);
      expect(step).toBeDefined();
      return step;
    };
    const dryRun = "github.event_name == 'workflow_dispatch' && inputs.dry-run";
    const skipRelease = findStep("github-release", "Skip GitHub Release (dry run)");
    const releaseToken = findStep("github-release", "Create GitHub App token");
    const downloadAssets = findStep("github-release", "Download release assets");
    const createRelease = findStep("github-release", "Create GitHub Release with generated notes");
    const checkout = findStep("publish", "Checkout released commit");
    const publish = findStep("publish", "Publish to npm");

    expect(skipRelease?.if).toBe(dryRun);
    expect(releaseToken?.if).toBe(`\${{ !(${dryRun}) }}`);
    expect(downloadAssets?.if).toBe(`\${{ !(${dryRun}) }}`);
    expect(downloadAssets?.with).toEqual({ name: "release-dist", path: "release-assets" });
    expect(createRelease?.if).toBe(`\${{ !(${dryRun}) }}`);
    expect(createRelease?.with?.tag_name).toBe(`v\${{ needs.prepare.outputs.version }}`);
    expect(createRelease?.with?.files).toBe(
      `release-assets/amadeus-dist-v\${{ needs.prepare.outputs.version }}.tar.gz\n` +
        `release-assets/amadeus-dist-v\${{ needs.prepare.outputs.version }}.manifest.json\n` +
        `release-assets/SHA256SUMS\n`,
    );
    expect(checkout?.with?.ref).toBe(`\${{ needs.prepare.outputs.sha }}`);
    expect(publish?.run).toContain(`\${{ ${dryRun} }}`);
    expect(publish?.run).toContain("args+=(--tag next)");
    expect(publish?.run).toContain("npm publish --dry-run");
    expect(publish?.run).toContain("npm publish --provenance");

    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.uses) expect(step.uses).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  test("release writes use the GitHub App token", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/release.yml"), "utf8");

    expect(yaml).toContain("contents: read # release writes use the narrowly scoped GitHub App token below");
    expect(yaml).toContain(
      "uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3",
    );
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
