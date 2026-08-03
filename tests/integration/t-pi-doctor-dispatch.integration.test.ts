// Pi doctor dispatch must stay read-only and must not inherit another harness's settings contract.
// covers: packages/framework/core/tools/amadeus-utility.ts
// size: medium

import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { probePiDoctor } from "../../packages/framework/core/tools/amadeus-pi-doctor.ts";
import {
  deepFreezeDoctorSnapshot,
  handleDoctor,
  resolveDoctorContext,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import type { DoctorContext } from "../../packages/framework/core/tools/amadeus-utility.ts";
import {
  cleanupTestProject,
  seededStateFile,
  setupIntegrationProject,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const projects: string[] = [];
const savedHarness = process.env.AMADEUS_HARNESS_DIR;
const savedGraph = process.env.AMADEUS_STAGE_GRAPH;
const savedRules = process.env.AMADEUS_RULES_DIR;

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function snapshot(root: string): string[] {
  const files: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const dir = pending.pop() as string;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) {
        files.push(`${relative(root, path)}:${createHash("sha256").update(readFileSync(path)).digest("hex")}`);
      }
    }
  }
  return files.sort();
}

function restore(name: keyof NodeJS.ProcessEnv, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  restore("AMADEUS_HARNESS_DIR", savedHarness);
  restore("AMADEUS_STAGE_GRAPH", savedGraph);
  restore("AMADEUS_RULES_DIR", savedRules);
});

describe("Pi doctor utility dispatch", () => {
  test("completes on a blocked workflow without writes or foreign harness settings", () => {
    process.env.AMADEUS_HARNESS_DIR = ".claude";
    process.env.AMADEUS_STAGE_GRAPH = join(ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
    process.env.AMADEUS_RULES_DIR = join(ROOT, "packages", "framework", "core", "memory");
    const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
    projects.push(projectDir);
    const statePath = seededStateFile(projectDir);
    writeFileSync(statePath, readFileSync(statePath, "utf8").replace("- **Status**: Running", "- **Status**: Blocked"));
    cpSync(join(ROOT, "dist", "pi", ".pi"), join(projectDir, ".pi"), { recursive: true });
    const agentDir = join(projectDir, ".test-private", "pi-agent");
    writeJson(join(agentDir, "trust.json"), { [resolve(projectDir)]: true });
    const catalog = join(projectDir, ".pi", "tools", "data", "harness.json");
    writeJson(join(projectDir, "amadeus", ".installer", "amadeus-setup-manifest.json"), {
      schemaVersion: 1,
      harness: "pi",
      files: [{
        path: ".pi/tools/data/harness.json",
        class: "owned",
        required: true,
        md5: createHash("md5").update(readFileSync(catalog)).digest("hex"),
      }],
    });
    const piChecks = probePiDoctor({
      projectDir,
      platform: "linux",
      bunVersion: "1.3.13",
      piExecutable: "pi",
      piVersionOutput: "0.83.0",
      piAgentDir: agentDir,
    });
    const base = resolveDoctorContext(projectDir);
    const context = deepFreezeDoctorSnapshot({
      ...base,
      harnessDir: ".pi",
      piAgentDir: agentDir,
      piDoctorChecks: piChecks,
    }) as DoctorContext;
    const before = snapshot(projectDir);

    const result = handleDoctor(context);

    expect(result.exitCode).toBe(0);
    for (const id of [
      "pi.os",
      "pi.bun",
      "pi.runtime-version",
      "pi.project-trust",
      "pi.skill-resources",
      "pi.extension-resources",
      "pi.package-resource",
      "pi.driver-resources",
    ]) expect(result.output).toContain(`[${id}]`);
    expect(result.output).not.toContain("settings.json present");
    expect(result.output).not.toContain("config.toml present");
    expect(result.output).not.toContain(projectDir);
    expect(result.output).not.toContain(agentDir);
    expect(snapshot(projectDir)).toEqual(before);
  });
});
