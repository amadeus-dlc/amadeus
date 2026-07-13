import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("t223 release bot bypass boundary", () => {
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
