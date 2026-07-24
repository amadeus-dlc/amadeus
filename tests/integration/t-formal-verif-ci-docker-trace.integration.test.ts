import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installDockerTraceWrapper,
  parseDockerTrace,
} from "../../scripts/formal-verif/ci-docker-trace.ts";

const roots: string[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

function root(): string {
  const path = mkdtempSync(join(tmpdir(), "ci-docker-trace-"));
  roots.push(path);
  return path;
}

function writeTrace(prefix: string, args: readonly string[], timing: string): void {
  writeFileSync(`${prefix}.argv`, `${args.join("\0")}\0`);
  writeFileSync(`${prefix}.timing`, timing);
}

const validArgs = [
  "run", "--name", "amadeus-tlc-00000000-0000-4000-8000-000000000001",
  "--mount", "type=bind,src=/cache/tla2tools.jar,dst=/cache/tla2tools.jar,readonly",
  "--mount", "type=bind,src=/run/.scratch,dst=/run/.scratch",
];

describe("Docker trace boundary", () => {
  test("installs an executable shell-free forwarding wrapper", () => {
    const workspace = root();
    const directory = installDockerTraceWrapper(workspace);
    const wrapper = join(directory, "docker");
    expect(statSync(wrapper).mode & 0o700).toBe(0o700);
    expect(readFileSync(wrapper, "utf8")).toContain('exec "${AMADEUS_REAL_DOCKER}" "$@"');
  });

  test("fails closed for missing, incomplete, foreign, and invalid timing traces", () => {
    const workspace = root();
    expect(parseDockerTrace(join(workspace, "missing"), workspace)).toEqual({
      ok: false,
      error: { code: "DOCKER_TRACE", detail: "Docker run trace could not be read" },
    });

    const incomplete = join(workspace, "incomplete");
    writeTrace(incomplete, ["run"], "1\n2\n0\n");
    expect(parseDockerTrace(incomplete, workspace)).toEqual({
      ok: false,
      error: { code: "DOCKER_TRACE", detail: "Docker run trace is incomplete" },
    });

    const foreign = join(workspace, "foreign");
    writeTrace(foreign, validArgs.toSpliced(2, 1, "foreign-container"), "1\n2\n0\n");
    expect(parseDockerTrace(foreign, workspace)).toEqual({
      ok: false,
      error: { code: "DOCKER_TRACE", detail: "Docker trace identity is invalid" },
    });

    const timing = join(workspace, "timing");
    writeTrace(timing, validArgs, "2\n1\n0.5\n");
    expect(parseDockerTrace(timing, workspace)).toEqual({
      ok: false,
      error: { code: "DOCKER_TRACE", detail: "Docker trace timing is invalid" },
    });
  });
});
