// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// U2 (#1597) — the `install <path>` verb: stage a plugin source folder under the
// discovery dir the shipped INSTALL doc names, then delegate to the SAME compose
// path. The staging swap must leave `<staging>/<name>` observable only as absent,
// wholly-old, or wholly-new, so the assertions here are FILESYSTEM assertions on a
// real temp tree (integration tier) driven in-process through handlePluginCli.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
  planPluginDrop,
  recordPluginDrops,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  handlePluginCli,
  PLUGIN_SOURCE_DIR_NAME,
  type PluginCliDeps,
  renderPluginCliResult,
  runPluginCli,
  stagingEntryState,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "plugins", "formal-model-check");
const PLUGIN = "formal-model-check";

let host = "";
let source = "";
const out: string[] = [];
const err: string[] = [];
let copies = 0;

type Opts = { recompileOk?: boolean };

function deps(opts: Opts = {}): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t348-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => opts.recompileOk !== false,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    copyPluginSource: (src, dst) => {
      copies += 1;
      copyPluginSource(src, dst, (l) => err.push(l));
    },
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

const stagedAt = (): string => join(host, PLUGIN_SOURCE_DIR_NAME, PLUGIN);
const scratchDirs = (): readonly string[] =>
  existsSync(join(host, PLUGIN_SOURCE_DIR_NAME))
    ? readdirSync(join(host, PLUGIN_SOURCE_DIR_NAME)).filter((n) => n.startsWith(".amadeus-plugin-install-"))
    : [];

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t348-host-"));
  source = join(mkdtempSync(join(tmpdir(), "amadeus-t348-src-")), PLUGIN);
  cpSync(FIXTURE, source, { recursive: true });
  out.length = 0;
  err.length = 0;
  copies = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
  rmSync(dirname(source), { recursive: true, force: true });
});

describe("t348 plugin install verb (U2, #1597)", () => {
  test("a fresh install stages the source and composes through the shared path", () => {
    const result = runPluginCli(["install", source, "--project-root", host], deps());
    expect(result).toEqual({ kind: "installed", name: PLUGIN, composeOutcome: "composed" });
    expect(existsSync(join(stagedAt(), "plugin.json"))).toBe(true);
    // The composed area is populated by the delegated compose, not by install.
    expect(existsSync(join(host, "plugins", PLUGIN))).toBe(true);
    expect(createNodeBackend(host).readComposition().plugins.has(PLUGIN)).toBe(true);
    expect(scratchDirs()).toEqual([]);
    expect(copies).toBe(1);
  });

  test("re-installing an identical source skips the copy and reports a no-op compose", () => {
    expect(handlePluginCli(["install", source, "--project-root", host], deps())).toBe(0);
    copies = 0;
    out.length = 0;
    const result = runPluginCli(["install", source, "--project-root", host], deps());
    expect(result).toEqual({ kind: "installed", name: PLUGIN, composeOutcome: "noop" });
    expect(copies).toBe(0);
    expect(renderPluginCliResult(result, deps())).toBe(0);
    expect(out.join("\n")).toContain(`installed ${PLUGIN} into ${PLUGIN_SOURCE_DIR_NAME}/${PLUGIN}, compose: noop`);
  });

  test("a different plugin already staged under the same name is refused without --force", () => {
    expect(handlePluginCli(["install", source, "--project-root", host], deps())).toBe(0);
    writeFileSync(join(stagedAt(), "extra.md"), "diverged\n");
    err.length = 0;
    const code = handlePluginCli(["install", source, "--project-root", host], deps());
    expect(code).toBe(1);
    expect(err.join("\n")).toContain("--force");
    // Refusal is pre-mutation: the diverged staging content is left as it was.
    expect(existsSync(join(stagedAt(), "extra.md"))).toBe(true);
  });

  test("--force replaces the staged content through the swap, leaving no scratch residue", () => {
    expect(handlePluginCli(["install", source, "--project-root", host], deps())).toBe(0);
    writeFileSync(join(stagedAt(), "extra.md"), "diverged\n");
    const code = handlePluginCli(["install", source, "--force", "--project-root", host], deps());
    expect(code).toBe(0);
    expect(existsSync(join(stagedAt(), "extra.md"))).toBe(false);
    expect(existsSync(join(stagedAt(), "plugin.json"))).toBe(true);
    expect(scratchDirs()).toEqual([]);
  });

  test("a compose failure propagates unchanged instead of being reported as installed", () => {
    const result = runPluginCli(["install", source, "--project-root", host], deps({ recompileOk: false }));
    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.stage).toBe("apply");
    // The staging step still happened — the failure is the compose stage's.
    expect(existsSync(join(stagedAt(), "plugin.json"))).toBe(true);
  });

  test("scratch residue from an interrupted run converges on the next install", () => {
    const tmpResidue = join(host, PLUGIN_SOURCE_DIR_NAME, `.amadeus-plugin-install-tmp-${PLUGIN}`);
    const oldResidue = join(host, PLUGIN_SOURCE_DIR_NAME, `.amadeus-plugin-install-old-${PLUGIN}`);
    mkdirSync(tmpResidue, { recursive: true });
    mkdirSync(oldResidue, { recursive: true });
    writeFileSync(join(tmpResidue, "half-written.md"), "interrupted\n");
    writeFileSync(join(oldResidue, "stale.md"), "stale\n");
    expect(handlePluginCli(["install", source, "--project-root", host], deps())).toBe(0);
    expect(scratchDirs()).toEqual([]);
    expect(existsSync(join(stagedAt(), "half-written.md"))).toBe(false);
    expect(readFileSync(join(stagedAt(), "plugin.json"))).toEqual(readFileSync(join(source, "plugin.json")));
  });

  // An install must stage what the bundle CONTAINS, not whatever a link happens
  // to point at — so links are skipped loudly, and the skip must not make an
  // otherwise-unchanged source compare `different` on the next run.
  test("symlinks in the source are skipped with a warning and do not defeat idempotency", () => {
    symlinkSync(join(source, "plugin.json"), join(source, "linked.json"));
    expect(handlePluginCli(["install", source, "--project-root", host], deps())).toBe(0);
    expect(existsSync(join(stagedAt(), "linked.json"))).toBe(false);
    expect(err.join("\n")).toContain("skipped symlink linked.json");
    copies = 0;
    const again = runPluginCli(["install", source, "--project-root", host], deps());
    expect(again).toEqual({ kind: "installed", name: PLUGIN, composeOutcome: "noop" });
    expect(copies).toBe(0);
  });

  test("a source that is not a directory fails closed before any staging write", () => {
    const missing = join(dirname(source), "no-such-plugin");
    const code = handlePluginCli(["install", missing, "--project-root", host], deps());
    expect(code).toBe(1);
    expect(err.join("\n")).toContain("source is not a directory");
    expect(existsSync(join(host, PLUGIN_SOURCE_DIR_NAME))).toBe(false);
  });

  // The plugin name is derived from the source basename, so a path with no
  // ordinary trailing segment (the filesystem root) has no name to derive and is
  // refused rather than allowed to resolve to something outside the staging root.
  test("a source path with no derivable plugin name is refused", () => {
    const code = handlePluginCli(["install", "/", "--project-root", host], deps());
    expect(code).toBe(1);
    expect(err.join("\n")).toContain("cannot derive a plugin name");
    expect(existsSync(join(host, PLUGIN_SOURCE_DIR_NAME))).toBe(false);
  });

  test("unknown flags and surplus arguments are usage errors (exit 2), never a partial install", () => {
    expect(handlePluginCli(["install", source, "--nope", "--project-root", host], deps())).toBe(2);
    expect(handlePluginCli(["install", "--project-root", host], deps())).toBe(2);
    expect(handlePluginCli(["install", source, source, "--project-root", host], deps())).toBe(2);
    expect(existsSync(join(host, PLUGIN_SOURCE_DIR_NAME))).toBe(false);
  });
});
