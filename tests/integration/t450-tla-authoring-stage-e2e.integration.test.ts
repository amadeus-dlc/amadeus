// covers: file:plugins/formal-model-check/stages/tla-authoring.md, file:plugins/formal-model-check/tools/tla-authoring.ts
//
// U5 authoring-stage-e2e (intent 260804-tla-authoring). Two things live here:
//
//   (a) the C7 stage document contract — the shipped stage file carries the six
//       procedure sections of functional-design/domain-entities.md § AuthoringStageDoc
//       and lands in a composed host (BR-U5-07, BR-U5-13)
//   (b) the FR-012 end-to-end path on an unknown subject (the swarm unit-pool
//       lifecycle): requirements -> applicability -> authoring -> referees ->
//       independent review -> human gate -> bundle -> registration -> the
//       existing formal-model-check over the model just registered -> the
//       correlated hold release, plus the two fail-closed arms of BR-U5-14
//
// The composed host is made repository-like (.git + package.json + the
// canonical amadeus/spaces/default/specs/tla tree)
// because the model loader resolves its workspace by walking up from its own
// module URL: the map the authoring path registers into is therefore the same
// map the checker reads.
//
// Every path runs against the COMPOSED runtime — the plugin is composed into a
// throwaway host from the shipped neutral bundle and driven from there, so a
// module the manifest fails to declare surfaces as a real import failure rather
// than passing on the canonical tree (BR-U5-09). Real FS + a real compose, so
// this is an integration test (cid:code-generation:fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import {
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  discoverPlugins,
  type HostSnapshot,
  inspectPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { parseStageFrontmatter } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
// Only the shared fixture is imported in-process: the driver itself is
// spawn-only, and importing it here would load a module this process never
// executes, so its whole body would enter the coverage report at zero hits
// (cid:code-generation:seam-placement-measured-module).
import {
  entryFor,
  mapText,
  repoLikeHost,
  SEED_VOCABULARY,
  SUBJECTS,
} from "../formal-verif/support/tla-authoring-e2e-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const BUNDLE_ROOT = join(REPO_ROOT, "dist", "plugins");
const PLUGIN = "formal-model-check";
const STAGE_SLUG = "tla-authoring";
const STAGE_LANDING = `plugins/${PLUGIN}/stages/${STAGE_SLUG}.md`;

const tempDirs: string[] = [];

function freshDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// The composed-area read model the compose engine inspects. Mirrors the helper
// in t-formal-verif-plugin-lifecycle: the plugin owns its whole subtree, so the
// snapshot walks it rather than probing one known path.
function hostSnapshot(root: string, backend: WorkspaceBackend): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else {
        const rel = relative(root, abs).split(sep).join("/");
        paths.add(rel);
        files.set(rel, readFileSync(abs));
      }
    }
  };
  const composed = join(root, "plugins");
  if (existsSync(composed)) walk(composed);
  // Plugins may own host `sensors/` paths (plugin.json sensorCopies), so the
  // snapshot must cover that dir too or an owned sensor reads as drift.
  const sensors = join(root, "sensors");
  if (existsSync(sensors)) walk(sensors);
  return { stages: new Map(), paths, files, composition: backend.readComposition() };
}

function transaction(root: string, backend: WorkspaceBackend): WorkspaceTransaction {
  let counter = 0;
  return {
    backend,
    verify: () => ({ ok: true }),
    lock: createNodeLock(root),
    newTxnId: () => `txn-${++counter}`,
  };
}

/** Compose the shipped neutral bundle into a throwaway host and return its root. */
function composedHost(): string {
  const host = freshDir("tla-authoring-host-");
  const backend = createNodeBackend(host);
  const descriptor = discoverPlugins(BUNDLE_ROOT).find((plugin) => plugin.name === PLUGIN);
  expect(descriptor, `${PLUGIN} must be discoverable in dist/plugins`).toBeDefined();
  const inspected = inspectPlugin(descriptor as NonNullable<typeof descriptor>, hostSnapshot(host, backend));
  expect(inspected.kind, JSON.stringify(inspected)).toBe("ready");
  if (inspected.kind !== "ready") throw new Error("plugin is not ready to compose");
  expect(applyPluginPlan(inspected.plan, transaction(host, backend)).kind).toBe("committed");
  return host;
}

describe("the authoring stage document (BR-U5-07, BR-U5-13)", () => {
  let stageText = "";

  beforeEach(() => {
    stageText = readFileSync(join(REPO_ROOT, STAGE_LANDING), "utf8");
  });

  test("the plugin manifest declares the stage at the path the compose walk reads", () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "plugins", PLUGIN, "plugin.json"), "utf8")) as {
      stages: ReadonlyArray<{ slug: string; path: string }>;
    };
    expect(manifest.stages).toContainEqual({ slug: STAGE_SLUG, path: `stages/${STAGE_SLUG}.md` });
  });

  test("the frontmatter joins every self scope after build-and-test", () => {
    const frontmatter = parseStageFrontmatter(stageText) as Record<string, unknown>;
    expect(frontmatter.slug).toBe(STAGE_SLUG);
    expect(frontmatter.phase).toBe("construction");
    expect(frontmatter.number).toBe("3.8");
    expect(frontmatter.scopes ?? []).toEqual([]);
    expect(frontmatter.requires_stage).toEqual(["build-and-test"]);
    expect(frontmatter.consumes).toEqual([{ artifact: "requirements", required: false }]);
    expect(frontmatter.execution).toBe("CONDITIONAL");
    expect(frontmatter.mode).toBe("inline");
  });

  test("the six procedure sections start by assessing applicability", () => {
    const headings = stageText
      .split("\n")
      .filter((line) => line.startsWith("### "))
      .map((line) => line.replace(/^###\s+/, ""));
    expect(headings).toEqual([
      "1. Assess applicability and receive the route",
      "2. Author or revise the model",
      "3. Run the referees",
      "4. Independent review",
      "5. Human gate",
      "6. Register",
    ]);
  });

  test("the registration section spells out build -> verify -> commit", () => {
    const registration = stageText.slice(stageText.indexOf("### 6. Register"));
    const invocations = ["bundle build", "bundle verify", "commit"].map((verb) => `tla-authoring.ts ${verb}`);
    const order = invocations.map((verb) => registration.indexOf(verb));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(registration).toContain("VerifiedBundle");
  });

  test("the self-scope entry assesses missing models and closes terminal routes", () => {
    const receiving = stageText.slice(stageText.indexOf("### 1. Assess applicability and receive the route"));
    expect(receiving).toContain("applicability receipt");
    expect(receiving).toContain("author-new");
    expect(receiving).toContain("revise-model");
    expect(receiving).toContain("impl-only");
    expect(receiving).toContain("non-target");
    expect(receiving).toContain("stop successfully");
  });

  test("each step states how it fails closed", () => {
    expect(stageText).toContain("halt");
    expect(stageText).toContain("NOT-READY");
    expect(stageText).toContain("read-only");
    expect(stageText).toContain("modelAuthor");
    expect(stageText).toContain("vacuity witness");
    expect(stageText).toContain("declaredIdentity");
  });

  test("the composed host lands the stage where the compile's plugin walk looks", () => {
    const host = composedHost();
    expect(existsSync(join(host, STAGE_LANDING))).toBe(true);
    expect(readFileSync(join(host, STAGE_LANDING), "utf8")).toEqual(stageText);
  });
});

// ---------------------------------------------------------------------------
// FR-012: the whole authoring path on an unknown subject, composed runtime only
// ---------------------------------------------------------------------------
//
// The composed modules are loaded by a CHILD PROCESS (the driver below), never
// in this process: `bun --coverage` does not instrument a child, so the composed
// copies under the OS temp directory stay out of the LCOV source universe. Doing
// it in-process put ~100 temp SF records into the report and diluted the project
// coverage percentage (E-TLA-U5COV, ruling A). The driver only reports what it
// observed; every assertion — including the byte-for-byte model map comparison,
// which this file reads for itself before and after — stays here.

const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "tla-authoring-unit-pool", "requirements.md");
const DRIVER = join(REPO_ROOT, "tests", "formal-verif", "support", "tla-authoring-e2e-driver.ts");

describe("the authoring path end to end on an unknown subject (FR-012, BR-U5-08/09)", () => {
  let host = "";
  let work = "";
  let store = "";
  let mapPath = "";

  function spawnDriver(scenario: string): { status: number | null; stdout: string; stderr: string } {
    const spawned = spawnSync(
      process.execPath,
      [
        DRIVER,
        "--scenario", scenario,
        "--host", host,
        "--work", work,
        "--store", store,
        "--map", mapPath,
        "--fixture", FIXTURE,
      ],
      // env is passed explicitly: bun does not fold a runtime-mutated
      // process.env into a child on its own (cid:code-generation:bun-spawn-env-snapshot).
      { encoding: "utf8", env: process.env },
    );
    return { status: spawned.status, stdout: spawned.stdout, stderr: spawned.stderr };
  }

  function parsedJson(text: string): { ok: boolean; value: Record<string, unknown> } {
    try {
      return { ok: true, value: JSON.parse(text.trim()) as Record<string, unknown> };
    } catch {
      return { ok: false, value: {} };
    }
  }

  // Success is exit 0 AND parseable JSON on stdout. Both are asserted, so a
  // driver that dies, prints a stack trace, or prints anything but its one JSON
  // line fails the test loudly instead of being read as an empty observation.
  function drive(scenario: string): Record<string, unknown> {
    const spawned = spawnDriver(scenario);
    expect(spawned.stderr).not.toContain("Cannot find module");
    expect(spawned.status, `${spawned.stdout}\n${spawned.stderr}`).toBe(0);
    const parsed = parsedJson(spawned.stdout);
    expect(parsed.ok, `driver stdout was not JSON: ${spawned.stdout}`).toBe(true);
    return parsed.value;
  }

  beforeEach(() => {
    host = composedHost();
    repoLikeHost(host);
    work = freshDir("tla-authoring-work-");
    store = join(work, "evidence");
    mapPath = join(host, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    writeFileSync(mapPath, mapText([entryFor(host, "Seed", SEED_VOCABULARY)]), "utf8");
  });

  test("requirements -> registration -> formal-model-check -> hold release, on the composed runtime", () => {
    const observed = drive("main");

    // 1-2. The heading-driven grammar read the unknown subject, and an
    //      unregistered subject routed to author-new.
    expect(observed.subjects).toEqual([...SUBJECTS]);
    expect(observed.route).toBe("author-new");

    // 3-4. The referees produced real evidence bound to that subject identity.
    expect(observed.coverageBrand).toBe("CoverageProof");
    expect(observed.boundIdentityMatchesSubject).toBe(true);
    expect(observed.freshnessKind).toBe("current");

    // 5-6. The registration landed, and the map this file reads carries it
    //      alongside the model that was already registered.
    expect(observed.receiptEntryName).toBe("UnitPool");
    const registered = JSON.parse(readFileSync(mapPath, "utf8")) as { models: ReadonlyArray<{ name: string }> };
    expect(registered.models.map((model) => model.name)).toEqual(["Seed", "UnitPool"]);

    // 7. The existing formal-model-check ran the model that was just
    //    registered, reading it through the same map the commit wrote.
    expect(observed.modelCheck).toMatchObject({ outcome: { kind: "NOT_DETECTED" }, exitCode: 0 });

    // 8. The correlated verdict: the hold evaluator releases the subject.
    expect(observed.holdKind).toBe("no-hold");
  });

  test("the composed CLI resolves its whole import closure as a real process", () => {
    const cli = join(host, "plugins", PLUGIN, "tools", "tla-authoring.ts");
    const spawned = spawnSync(
      process.execPath,
      [cli, "identity", "extract", "--doc", FIXTURE, "--doc-kind", "requirements"],
      { encoding: "utf8", env: process.env },
    );
    expect(spawned.stderr).not.toContain("Cannot find module");
    expect(spawned.status).toBe(0);
    const body = JSON.parse(spawned.stdout.trim()) as { sections: ReadonlyArray<{ id: string }> };
    expect(body.sections.map((section) => section.id)).toEqual([...SUBJECTS]);
  });

  test("a manifest with no vacuity witness halts at the referee, before any registration", () => {
    const before = readFileSync(mapPath, "utf8");
    const observed = drive("referee-halt");

    const proof = observed.proof as { exitCode: number; ok: boolean; failure: unknown };
    expect(proof.exitCode).toBe(1);
    expect(proof.ok).toBe(false);
    // The halt names the missing witness, not just "something failed".
    expect(JSON.stringify(proof.failure)).toContain("no witness declared");

    // Pushing past the halt is refused rather than ignored: with no proof
    // evidence to carry, the registration gate itself rejects the run. This is
    // the active check — "the map is unchanged" alone holds trivially for a
    // path that never calls commit.
    const commit = observed.commit as { exitCode: number; failure: { kind: string; failures: ReadonlyArray<Record<string, string>> } };
    expect(commit.exitCode).toBe(1);
    expect(commit.failure.kind).toBe("preconditions-failed");
    expect(commit.failure.failures).toContainEqual({ kind: "precondition-missing", precondition: "proof" });
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });

  test("the driver fails loudly when it is asked for a scenario it does not have", () => {
    const spawned = spawnDriver("no-such-scenario");

    expect(spawned.status).not.toBe(0);
    expect(spawned.stderr).toContain("no-such-scenario");
    expect(parsedJson(spawned.stdout).ok).toBe(false);
  });

  test("a composed module the manifest fails to declare is a loud import failure, not a silent skip", () => {
    // The claim "the composed runtime resolves every import" is only worth
    // something if a missing module would actually be seen. Take one away and
    // watch the run die (BR-U5-09).
    rmSync(join(host, "plugins", PLUGIN, "tools", "tla-registration.ts"));
    const spawned = spawnDriver("main");

    expect(spawned.status).not.toBe(0);
    expect(spawned.stderr).toContain("Cannot find module");
    expect(parsedJson(spawned.stdout).ok).toBe(false);
  });

  test("a run with no human approval is refused at registration and leaves the map intact", () => {
    const before = readFileSync(mapPath, "utf8");
    const observed = drive("approval-missing");

    const commit = observed.commit as { exitCode: number; failure: { kind: string; failures: ReadonlyArray<{ kind: string }> } };
    expect(commit.exitCode).toBe(1);
    expect(commit.failure.kind).toBe("preconditions-failed");
    expect(commit.failure.failures.map((failure) => failure.kind)).toContain("approval-provenance-invalid");
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });
});
