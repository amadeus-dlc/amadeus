// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  handleDoctor,
  resolveDoctorContext,
  TEAM_PREREQUISITE_GUIDANCE,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "packages/framework/core/tools/team-up.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  delete process.env.AMADEUS_HARNESS_DIR;
  delete process.env.AMADEUS_RULES_DIR;
  delete process.env.AMADEUS_SCOPE_GRID;
  delete process.env.AMADEUS_STAGE_GRAPH;
});

function executable(path: string, body = "exit 0\n"): string {
  writeFileSync(path, `#!/usr/bin/env bash\n${body}`);
  chmodSync(path, 0o755);
  return path;
}

function prerequisiteFixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-team-prereq-"));
  tempDirs.push(root);
  return {
    root,
    herdr: executable(join(root, "herdr")),
    agmsgJoin: executable(join(root, "join.sh")),
  };
}

function runPrerequisites(
  env: Record<string, string>,
  command = 'require_prerequisites',
) {
  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; ${command}`,
      "_",
      TEAM_UP,
    ],
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
}

function doctorContext(project: string) {
  process.env.AMADEUS_HARNESS_DIR = ".claude";
  process.env.AMADEUS_RULES_DIR = join(ROOT, "packages/framework/core/memory");
  process.env.AMADEUS_SCOPE_GRID = join(
    ROOT,
    "dist/claude/.claude/tools/data/scope-grid.json",
  );
  process.env.AMADEUS_STAGE_GRAPH = join(
    ROOT,
    "dist/claude/.claude/tools/data/stage-graph.json",
  );
  return resolveDoctorContext(project);
}

describe("t266 team-up prerequisite boundary", () => {
  test("accepts supported OS with both prerequisites", () => {
    const fixture = prerequisiteFixture();
    const result = runPrerequisites({
      HERDR: fixture.herdr,
      AGMSG_JOIN: fixture.agmsgJoin,
      MSG_BACKEND: "agmsg",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
  });

  test("rejects an unsupported OS before probing either tool", () => {
    const fixture = prerequisiteFixture();
    const uname = executable(join(fixture.root, "uname"), "printf 'Plan9\\n'\n");
    const result = runPrerequisites({
      PATH: `${fixture.root}:/usr/bin:/bin`,
      HERDR: join(fixture.root, "must-not-exist"),
      AGMSG_JOIN: join(fixture.root, "must-not-exist-agmsg"),
      MSG_BACKEND: "agmsg",
    });
    const stderr = result.stderr.toString();
    expect(uname).toEndWith("/uname");
    expect(result.exitCode).toBe(1);
    expect(stderr).toContain("unsupported on Plan9");
    expect(stderr).not.toContain("herdr is required");
    expect(stderr).not.toContain("agmsg is required");
  });

  test("rejects missing herdr with source and guide guidance", () => {
    const fixture = prerequisiteFixture();
    const result = runPrerequisites({
      HERDR: join(fixture.root, "missing-herdr"),
      AGMSG_JOIN: fixture.agmsgJoin,
      MSG_BACKEND: "agmsg",
    });
    const stderr = result.stderr.toString();
    expect(result.exitCode).toBe(1);
    expect(stderr).toContain("herdr is required");
    expect(stderr).toContain("https://herdr.dev");
    expect(stderr).toContain("docs/guide/20-team-mode.md");
  });

  test("rejects missing agmsg before launcher side effects", () => {
    const fixture = prerequisiteFixture();
    const result = runPrerequisites({
      HERDR: fixture.herdr,
      AGMSG_JOIN: join(fixture.root, "missing-join.sh"),
      MSG_BACKEND: "agmsg",
    });
    const stderr = result.stderr.toString();
    expect(result.exitCode).toBe(1);
    expect(stderr).toContain("agmsg is required");
    expect(stderr).toContain("https://github.com/j5ik2o/agmsg");
    expect(stderr).toContain("docs/guide/20-team-mode.md");
  });

  test("requires agmsg even when the selected messaging backend is herdr", () => {
    const fixture = prerequisiteFixture();
    const result = runPrerequisites(
      {
        HERDR: fixture.herdr,
        AGMSG_JOIN: join(fixture.root, "missing-join.sh"),
      },
      "MSG_BACKEND=herdr require_prerequisites",
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("agmsg is required");
  });

  test("keeps shell and doctor prerequisite names and guidance aligned", () => {
    const result = runPrerequisites(
      {},
      "printf '%s\\n%s\\n%s\\n' \"$TEAM_PREREQUISITE_TOOLS\" \"$HERDR_INSTALL_URL\" \"$AGMSG_INSTALL_URL\"",
    );
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim().split("\n")).toEqual([
      "herdr agmsg",
      "https://herdr.dev",
      "https://github.com/j5ik2o/agmsg",
    ]);
    expect(TEAM_PREREQUISITE_GUIDANCE.herdr).toContain("https://herdr.dev");
    expect(TEAM_PREREQUISITE_GUIDANCE.agmsg).toContain(
      "https://github.com/j5ik2o/agmsg",
    );
  });
});

describe("t266 doctor Team Mode advisory", () => {
  test("renders found paths without changing doctor exit semantics", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-doctor-prereq-"));
    tempDirs.push(project);
    const context = doctorContext(project);
    const baseline = handleDoctor(context);
    const result = handleDoctor({
      ...context,
      teamPrerequisites: [
        { tool: "herdr", found: true, path: "/opt/bin/herdr" },
        { tool: "agmsg", found: true, path: "/opt/agmsg/send.sh" },
      ],
    });

    expect(result.exitCode).toBe(baseline.exitCode);
    expect(result.output).toContain("Team Mode prerequisites:");
    expect(result.output).toContain("herdr: /opt/bin/herdr");
    expect(result.output).toContain("agmsg: /opt/agmsg/send.sh");
    expect(result.output.match(/\d+ passed, \d+ failed/)?.[0]).toBe(
      baseline.output.match(/\d+ passed, \d+ failed/)?.[0],
    );
  });

  test("renders missing guidance without making the advisory blocking", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-doctor-prereq-"));
    tempDirs.push(project);
    const context = doctorContext(project);
    const result = handleDoctor({
      ...context,
      teamPrerequisites: [
        {
          tool: "herdr",
          found: false,
          guidance: TEAM_PREREQUISITE_GUIDANCE.herdr,
        },
        {
          tool: "agmsg",
          found: false,
          guidance: TEAM_PREREQUISITE_GUIDANCE.agmsg,
        },
      ],
    });

    expect(result.exitCode).toBe(handleDoctor(context).exitCode);
    expect(result.output).toContain("herdr: not found");
    expect(result.output).toContain("agmsg: not found");
  });
});
