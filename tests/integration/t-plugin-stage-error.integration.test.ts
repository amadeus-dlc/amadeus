// covers: function:discoverPluginStageFiles, function:PluginStageError
// size: medium
//
// The typed plugin-stage compile failure. Plugin stage discovery is the one
// place the compile reads files a plugin author wrote, so every read or schema
// failure there must surface as the discriminated `amadeus.plugin-stage-error.v1`
// payload rather than a bare Error — that payload is what the CLI boundary
// prints as its single stderr line, and what a host reads to tell a bad plugin
// from a broken compile.
//
// Real filesystem (temp host trees seeded from the synthetic conformance
// fixture), so this lives in the integration layer (cid:fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discoverPluginStageFiles,
  PluginStageError,
  __resetGraphCache,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { FIXTURE_PLUGIN, FIXTURE_SOURCE } from "../harness/conformance-fixture.ts";

const tempDirs: string[] = [];

function freshHost(): string {
  const dir = mkdtempSync(join(tmpdir(), "plugin-stage-error-host-"));
  tempDirs.push(dir);
  return dir;
}

/** A host carrying the fixture plugin exactly as compose would leave it. */
function hostWithFixture(): string {
  const host = freshHost();
  cpSync(FIXTURE_SOURCE, join(host, "plugins", FIXTURE_PLUGIN), { recursive: true });
  return host;
}

function stagePath(host: string, file = `${FIXTURE_PLUGIN}.md`): string {
  return join(host, "plugins", FIXTURE_PLUGIN, "stages", file);
}

function caughtPluginStageError(host: string): PluginStageError {
  try {
    discoverPluginStageFiles(host);
  } catch (err) {
    expect(err).toBeInstanceOf(PluginStageError);
    return err as PluginStageError;
  }
  throw new Error("expected discoverPluginStageFiles to throw a PluginStageError");
}

beforeEach(() => {
  __resetGraphCache();
});

afterEach(() => {
  __resetGraphCache();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("plugin stage discovery reports typed failures", () => {
  // The control: the same fixture, untouched, discovers cleanly. Without this a
  // green error case would prove only that the fixture is broken to begin with.
  test("an intact plugin discovers its stage with a host-relative POSIX path", () => {
    expect(discoverPluginStageFiles(hostWithFixture())).toEqual([
      {
        path: `plugins/${FIXTURE_PLUGIN}/stages/${FIXTURE_PLUGIN}.md`,
        slug: FIXTURE_PLUGIN,
      },
    ]);
  });

  test("frontmatter that fails the stage schema is SCHEMA_INVALID and names the field", () => {
    const host = hostWithFixture();
    // Keep the slug, drop everything else the schema requires.
    writeFileSync(stagePath(host), `---\nslug: ${FIXTURE_PLUGIN}\n---\nbody\n`);
    const error = caughtPluginStageError(host);
    expect(error.payload.code).toBe("SCHEMA_INVALID");
    expect(error.payload.plugin).toBe(FIXTURE_PLUGIN);
    expect(error.payload.slug).toBe(FIXTURE_PLUGIN);
    expect(error.payload.pluginPath).toBe(`plugins/${FIXTURE_PLUGIN}/stages/${FIXTURE_PLUGIN}.md`);
    expect(error.payload.reason.length).toBeGreaterThan(0);
  });

  test("a symlinked stage file is refused as READ_FAILED, never followed", () => {
    const host = hostWithFixture();
    const outside = join(host, "outside.md");
    writeFileSync(outside, "---\nslug: outside\n---\n");
    const linked = stagePath(host, "linked.md");
    symlinkSync(outside, linked);
    const error = caughtPluginStageError(host);
    expect(error.payload.code).toBe("READ_FAILED");
    expect(error.payload.pluginPath).toBe(`plugins/${FIXTURE_PLUGIN}/stages/linked.md`);
  });

  // The payload is a wire contract, not a debug string: it is schema-tagged,
  // it is exactly one line, and it never leaks an absolute path.
  test("the error renders as one schema-tagged JSON line with no absolute path", () => {
    const host = hostWithFixture();
    writeFileSync(stagePath(host), `---\nslug: ${FIXTURE_PLUGIN}\n---\nbody\n`);
    const line = caughtPluginStageError(host).jsonLine();
    expect(line.split("\n")).toHaveLength(1);
    const payload = JSON.parse(line) as Record<string, string>;
    expect(payload.schema).toBe("amadeus.plugin-stage-error.v1");
    expect(payload.code).toBe("SCHEMA_INVALID");
    expect(line).not.toContain(host);
    expect(line).not.toContain(tmpdir());
  });

  // A plugin directory with no stages/ dir at all is silence, not a failure:
  // the typed error must stay reserved for files that exist and are wrong.
  test("a plugin with no stages directory contributes nothing and raises nothing", () => {
    const host = freshHost();
    mkdirSync(join(host, "plugins", "stageless"), { recursive: true });
    expect(discoverPluginStageFiles(host)).toEqual([]);
  });
});
