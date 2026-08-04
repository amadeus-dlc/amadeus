// Pi doctor derives its closed diagnostic matrix from the packaged candidate catalog.
// covers: packages/framework/core/tools/amadeus-pi-doctor.ts
// size: medium

import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  PI_DOCTOR_CHECK_IDS,
  type PiDoctorCheck,
  piDoctorCheckLabel,
  probePiDoctor,
  redactPiDoctorText,
} from "../../packages/framework/core/tools/amadeus-pi-doctor.ts";

const ROOT = join(import.meta.dir, "..", "..");
const scratch: string[] = [];

interface Fixture {
  readonly projectDir: string;
  readonly agentDir: string;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function healthyFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-pi-doctor-"));
  scratch.push(root);
  const projectDir = join(root, "workspace");
  const agentDir = join(root, "private", "pi-agent");
  mkdirSync(projectDir, { recursive: true });
  cpSync(join(ROOT, "dist", "pi", ".pi"), join(projectDir, ".pi"), { recursive: true });
  const catalogPath = join(projectDir, ".pi", "tools", "data", "harness.json");
  const catalogMd5 = createHash("md5").update(readFileSync(catalogPath)).digest("hex");
  writeJson(join(projectDir, "amadeus", ".installer", "amadeus-setup-manifest.json"), {
    schemaVersion: 1,
    harness: "pi",
    files: [{ path: ".pi/tools/data/harness.json", class: "owned", required: true, md5: catalogMd5 }],
  });
  writeJson(join(agentDir, "trust.json"), { [resolve(projectDir)]: true });
  return { projectDir, agentDir };
}

function diagnose(
  fixture: Fixture,
  overrides: Partial<Parameters<typeof probePiDoctor>[0]> = {},
): readonly PiDoctorCheck[] {
  return probePiDoctor({
    projectDir: fixture.projectDir,
    platform: "darwin",
    bunVersion: "1.3.13",
    piExecutable: "pi",
    piVersionOutput: "pi 0.83.0",
    piAgentDir: fixture.agentDir,
    ...overrides,
  });
}

function failedIds(checks: readonly PiDoctorCheck[]): string[] {
  return checks.filter((row) => !row.pass).map((row) => row.id);
}

afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop() as string, { recursive: true, force: true });
});

describe("Pi doctor closed diagnostics", () => {
  test("healthy Pi-only fixture emits every closed check exactly once", () => {
    const checks = diagnose(healthyFixture());
    expect(checks.map((row) => row.id)).toEqual([...PI_DOCTOR_CHECK_IDS]);
    expect(new Set(checks.map((row) => row.id)).size).toBe(PI_DOCTOR_CHECK_IDS.length);
    expect(checks.every((row) => row.pass)).toBe(true);
    expect(checks.every((row) => row.observed && row.expected && row.remediation)).toBe(true);
    expect(Object.isFrozen(checks)).toBe(true);
  });

  test("OS, Bun, Pi 0.82.x, and trust faults fail only their owning check", () => {
    const fixture = healthyFixture();
    expect(failedIds(diagnose(fixture, { platform: "win32" }))).toEqual(["pi.os"]);
    expect(failedIds(diagnose(fixture, { bunVersion: undefined }))).toEqual(["pi.bun"]);
    expect(failedIds(diagnose(fixture, { piVersionOutput: "0.82.9" }))).toEqual(["pi.runtime-version"]);
    writeJson(join(fixture.agentDir, "trust.json"), { [resolve(fixture.projectDir)]: false });
    expect(failedIds(diagnose(fixture))).toEqual(["pi.project-trust"]);
  });

  test("each native resource family and the package receipt fail locally", () => {
    const cases = [
      [".pi/skills/amadeus/SKILL.md", "pi.skill-resources"],
      [".pi/extensions/amadeus.ts", "pi.extension-resources"],
      [".pi/drivers/amadeus-pi-driver.ts", "pi.driver-resources"],
    ] as const;
    for (const [relativePath, expectedId] of cases) {
      const fixture = healthyFixture();
      writeFileSync(join(fixture.projectDir, ...relativePath.split("/")), "changed bytes\n");
      expect(failedIds(diagnose(fixture))).toEqual([expectedId]);
    }

    const fixture = healthyFixture();
    const catalog = join(fixture.projectDir, ".pi", "tools", "data", "harness.json");
    writeFileSync(catalog, `${readFileSync(catalog, "utf8")}\n`);
    expect(failedIds(diagnose(fixture))).toEqual(["pi.package-resource"]);
  });

  test("rejects kind, loader, and destination-family combinations that are individually valid", () => {
    const fixture = healthyFixture();
    const catalogPath = join(fixture.projectDir, ".pi", "tools", "data", "harness.json");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    catalog.resources[0] = {
      ...catalog.resources[0],
      kind: "skill",
      load: "internal",
      destination: ".pi/drivers/skill.md",
    };
    writeJson(catalogPath, catalog);
    const packageCheck = diagnose(fixture).find((row) => row.id === "pi.package-resource");
    expect(packageCheck?.pass).toBe(false);
    expect(packageCheck?.observed).toContain("invalid resource descriptor");
  });

  test("keeps skill resources inside the closed amadeus skill directory", () => {
    const fixture = healthyFixture();
    const catalogPath = join(fixture.projectDir, ".pi", "tools", "data", "harness.json");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    catalog.resources[0] = {
      ...catalog.resources[0],
      kind: "skill",
      load: "native",
      destination: ".pi/skills/unowned.md",
    };
    writeJson(catalogPath, catalog);

    const packageCheck = diagnose(fixture).find((row) => row.id === "pi.package-resource");
    expect(packageCheck?.pass).toBe(false);
    expect(packageCheck?.observed).toContain("invalid resource descriptor");
  });

  test("structured snapshots and rendered labels redact paths, credentials, and secrets", () => {
    const fixture = healthyFixture();
    const checks = diagnose(fixture, {
      piVersionOutput: "pi 0.83.0 https://alice:hunter2@example.test api_key=top-secret",
    });
    const output = checks.map((row) => piDoctorCheckLabel(row, fixture.projectDir, fixture.agentDir)).join("\n");
    expect(output).not.toContain(fixture.projectDir);
    expect(output).not.toContain(fixture.agentDir);
    expect(output).not.toContain("alice");
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("top-secret");

    const raw = `${fixture.projectDir} ${fixture.agentDir} https://alice:hunter2@example.test token=abc123`;
    const injected: PiDoctorCheck = {
      id: "pi.project-trust",
      pass: false,
      observed: raw,
      expected: raw,
      remediation: raw,
    };
    const injectedLabel = piDoctorCheckLabel(injected, fixture.projectDir, fixture.agentDir);
    expect(injectedLabel).not.toContain(fixture.projectDir);
    expect(injectedLabel).not.toContain("hunter2");
    expect(injectedLabel).not.toContain("abc123");
    const redacted = redactPiDoctorText(raw, fixture.projectDir, fixture.agentDir);
    expect(redacted).not.toContain(fixture.projectDir);
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("abc123");
  });
});
