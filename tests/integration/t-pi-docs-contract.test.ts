// Pi user and maintainer docs are a closed projection of the authored runtime
// catalog. Resource and event additions therefore require docs in both
// languages without pinning a numeric resource count.
// covers: docs/guide/harnesses/pi.md
// covers: docs/guide/harnesses/pi.ja.md
// covers: docs/harness-engineering/09-porting-to-a-new-harness.md
// covers: docs/harness-engineering/09-porting-to-a-new-harness.ja.md
// size: medium

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { PI_083_EVENT_NAMES } from "../../packages/framework/harness/pi/extensions/amadeus-pi-extension.ts";
import piManifest from "../../packages/framework/harness/pi/manifest.ts";
import { expectedPiPackageMetadata } from "../../scripts/pi-package.ts";

const ROOT = join(import.meta.dir, "..", "..");
const USER_EN = "docs/guide/harnesses/pi.md";
const USER_JA = "docs/guide/harnesses/pi.ja.md";
const MAINTAINER_EN = "docs/harness-engineering/09-porting-to-a-new-harness.md";
const MAINTAINER_JA = "docs/harness-engineering/09-porting-to-a-new-harness.ja.md";

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function localMarkdownLinks(relative: string): string[] {
  const links = [...read(relative).matchAll(/\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)]
    .map((match) => match[1].split("#")[0])
    .filter((target) => target.length > 0 && !/^(?:[a-z][a-z0-9+.-]*:|#|mailto:)/iu.test(target));
  return links.map((target) => normalize(join(dirname(relative), target)));
}

describe("Pi user and maintainer documentation contract", () => {
  test("publishes synchronized user guides with the complete supported lifecycle", () => {
    const english = read(USER_EN);
    const japanese = read(USER_JA);

    expect(english).toContain("> Languages: **English** | [日本語](pi.ja.md)");
    expect(japanese).toContain("> 言語: [English](pi.md) | **日本語**");
    for (const heading of ["Prerequisites", "Complete project installation", "Native Pi package activation", "Start and resume", "Update", "Uninstall", "Unsupported"]) {
      expect(english).toContain(`## ${heading}`);
    }
    for (const heading of ["前提条件", "setup CLI による完全な project install", "Native Pi Package activation", "workflow の開始と再開", "update", "uninstall", "unsupported"]) {
      expect(japanese).toContain(`## ${heading}`);
    }
    for (const text of [
      "@earendil-works/pi-coding-agent",
      "0.83.0",
      "macOS",
      "Linux",
      "Windows",
      "--harness pi",
      "pi install -l /absolute/path/to/amadeus",
      "https://github.com/amadeus-dlc/amadeus.git@<full-commit-sha>",
      "/skill:amadeus --doctor",
      "source",
      "interactive",
      "provider credential",
      "sandbox",
      "trust",
    ]) {
      expect(english).toContain(text);
      expect(japanese).toContain(text);
    }
    expect(english).toContain("currently has no uninstall subcommand");
    expect(japanese).toContain("現在 uninstall subcommand がありません");
  });

  test("projects every manifest resource and public lifecycle event into both maintainer inventories", () => {
    const docs = [read(MAINTAINER_EN), read(MAINTAINER_JA)];
    for (const body of docs) {
      expect(body).toContain("## Pi maintenance inventory");
      expect(body).toContain("dist/pi/.pi/tools/data/harness.json");
      expect(body).toContain("scripts/package.ts pi --check");
      expect(body).toContain("pi --mode rpc --no-session");
      for (const resource of piManifest.resources ?? []) {
        expect(body).toContain(`\`${resource.source}\``);
        expect(body).toContain(`\`${resource.destination}\``);
        expect(body).toContain(`\`${resource.load}\``);
      }
      for (const eventName of PI_083_EVENT_NAMES) expect(body).toContain(`\`${eventName}\``);
      const metadata = expectedPiPackageMetadata();
      for (const path of [...metadata.extensions, ...metadata.skills]) expect(body).toContain(`"${path}"`);
    }
  });

  test("links both user guides from the harness index and keeps local links resolvable", () => {
    expect(read("docs/guide/harnesses/README.md")).toContain("[AI-DLC on Pi Coding Agent](pi.md)");
    expect(read("docs/guide/harnesses/README.ja.md")).toContain("[Pi Coding Agent 上の AI-DLC](pi.ja.md)");
    expect(read("README.md")).toContain("[Running on Pi Coding Agent](docs/guide/harnesses/pi.md)");
    expect(read("README.ja.md")).toContain("[Pi Coding Agent で動かす](docs/guide/harnesses/pi.ja.md)");

    for (const doc of [USER_EN, USER_JA, MAINTAINER_EN, MAINTAINER_JA]) {
      for (const target of localMarkdownLinks(doc)) expect(existsSync(join(ROOT, target))).toBe(true);
    }
  });

  test("names the maintained test and generated-surface inventory without claiming live success", () => {
    for (const body of [read(MAINTAINER_EN), read(MAINTAINER_JA)]) {
      for (const path of [
        "tests/unit/t-pi-harness-manifest.test.ts",
        "tests/smoke/t-pi-dist-structure.test.ts",
        "tests/integration/t-pi-package-candidate.test.ts",
        "tests/integration/t-pi-lifecycle-gate-adapter.test.ts",
        "tests/integration/t-pi-lifecycle-gate-adapter.integration.test.ts",
        "tests/unit/t-pi-driver-contract.test.ts",
        "tests/integration/t-pi-child-driver.integration.test.ts",
        "tests/integration/t-pi-doctor-diagnostics.test.ts",
        "tests/integration/t-pi-doctor-dispatch.integration.test.ts",
        "tests/integration/t-pi-docs-contract.test.ts",
      ]) expect(body).toContain(`\`${path}\``);
      expect(body).not.toMatch(/live (?:provider )?(?:test|journey) (?:is |was )?(?:green|passed)/iu);
    }
  });
});
