// Generated Pi candidate -> installed shape -> doctor and public-event closure.

import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { probePiDoctor } from "../../packages/framework/core/tools/amadeus-pi-doctor.ts";
import { parsePi083Event } from "../../packages/framework/harness/pi/extensions/amadeus-pi-extension.ts";
import piManifest from "../../packages/framework/harness/pi/manifest.ts";
import { buildPiCandidateGraph } from "../../scripts/pi-package.ts";

const ROOT = join(import.meta.dir, "..", "..");
const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
});

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("Pi candidate cross-unit conformance", () => {
  test("keeps generated catalog, complete install diagnostics, event source boundary, and Windows negative coherent", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-pi-conformance-"));
    scratch.push(root);
    const projectDir = join(root, "project");
    const agentDir = join(root, "pi-agent");
    cpSync(join(ROOT, "dist", "pi"), projectDir, { recursive: true });
    const catalogPath = join(projectDir, ".pi", "tools", "data", "harness.json");
    const catalogMd5 = createHash("md5").update(readFileSync(catalogPath)).digest("hex");
    writeJson(join(projectDir, "amadeus", ".installer", "amadeus-setup-manifest.json"), {
      schemaVersion: 1,
      harness: "pi",
      files: [{ path: ".pi/tools/data/harness.json", class: "owned", required: true, md5: catalogMd5 }],
    });
    writeJson(join(agentDir, "trust.json"), { [resolve(projectDir)]: true });

    const graph = buildPiCandidateGraph(ROOT);
    expect(graph.resources.map((resource) => resource.destination)).toEqual(
      piManifest.resources?.map((resource) => resource.destination) ?? [],
    );
    expect(graph.resources.every((resource) =>
      createHash("sha256")
        .update(readFileSync(join(projectDir, ...resource.destination.split("/"))))
        .digest("hex") === resource.sha256)).toBe(true);

    for (const platform of ["darwin", "linux"] as const) {
      const checks = probePiDoctor({
        projectDir,
        platform,
        bunVersion: Bun.version,
        piExecutable: "pi",
        piVersionOutput: "pi 0.83.0",
        piAgentDir: agentDir,
      });
      expect(checks.every((check) => check.pass)).toBe(true);
    }
    const windows = probePiDoctor({
      projectDir,
      platform: "win32",
      bunVersion: Bun.version,
      piExecutable: "pi",
      piVersionOutput: "pi 0.83.0",
      piAgentDir: agentDir,
    });
    expect(windows.filter((check) => !check.pass).map((check) => check.id)).toEqual(["pi.os"]);

    const interactive = parsePi083Event("input", { type: "input", text: "human", source: "interactive" });
    const rpc = parsePi083Event("input", { type: "input", text: "automation", source: "rpc" });
    expect(interactive?.type === "input" ? interactive.source : null).toBe("interactive");
    expect(rpc?.type === "input" ? rpc.source : null).toBe("rpc");
    expect(parsePi083Event("input", { type: "input", text: "unknown", source: "tty" })).toBeNull();
  });
});
