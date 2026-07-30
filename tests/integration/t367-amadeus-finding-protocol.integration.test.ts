// covers: protocol:auto-file-findings
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const PROTOCOL = join(
  REPO_ROOT,
  "packages/framework/core/amadeus-common/protocols/stage-protocol.md",
);

describe("automatic Amadeus finding protocol", () => {
  test("routes confirmed out-of-scope findings through the deterministic filer", () => {
    const protocol = readFileSync(PROTOCOL, "utf-8");

    expect(protocol).toContain('"auto-file-findings": "off" | "prompt" | "auto"');
    expect(protocol).toContain("bun {{HARNESS_DIR}}/tools/amadeus-finding.ts file");
    expect(protocol).toContain("amadeus-dlc/amadeus");
    expect(protocol).toContain("existing Issue");
    expect(protocol).toContain("secrets or private workspace information");
    expect(protocol).toContain("already in the active intent's scope");
  });
});
