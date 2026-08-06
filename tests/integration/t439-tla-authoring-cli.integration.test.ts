import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";

// U1 CLI pin (business-logic-model.md §6, component-methods.md § common rules:
// one JSON line on stdout, exit 0 success / 1 typed failure / 2 usage error).
// Driven in-process so the handler lines stay measurable
// (cid:code-generation:seam-export-handler-amend).

let workspace = "";
let storeRoot = "";

async function run(argv: readonly string[]): Promise<{ exitCode: number; body: Record<string, unknown> }> {
  const lines: string[] = [];
  const exitCode = await runTlaAuthoring(argv, (line) => lines.push(line));
  expect(lines).toHaveLength(1);
  return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
}

function writeDoc(name: string, content: string): string {
  const path = join(workspace, name);
  writeFileSync(path, content, "utf8");
  return path;
}

const authoringParts = {
  kind: "authoring-bundle",
  parts: {
    applicability: { route: "author" },
    trace: { covered: true },
    proof: { invariants: ["I1"] },
    review: { verdict: "READY" },
    approval: { approvedAt: "2026-08-04T00:00:00Z" },
  },
};

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "tla-authoring-"));
  storeRoot = join(workspace, "tla-evidence");
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("usage errors exit 2", () => {
  test.each([[[]], [["identity"]], [["bundle"]], [["surprise"]], [["identity", "surprise"]]])(
    "rejects %p",
    async (argv) => {
      const { exitCode, body } = await run(argv as readonly string[]);
      expect(exitCode).toBe(2);
      expect(body.ok).toBe(false);
      expect(typeof body.usage).toBe("string");
    },
  );

  test("rejects a missing required flag", async () => {
    const { exitCode, body } = await run(["identity", "extract", "--doc-kind", "requirements"]);
    expect(exitCode).toBe(2);
    expect(body.error).toContain("--doc");
  });

  test("rejects an unknown doc kind", async () => {
    const doc = writeDoc("requirements.md", "### FR-006\nbody\n");
    const { exitCode } = await run(["identity", "extract", "--doc", doc, "--doc-kind", "poems"]);
    expect(exitCode).toBe(2);
  });
});

describe("identity extract", () => {
  test("prints section digests and the aggregate digest", async () => {
    const doc = writeDoc("requirements.md", "### FR-006\nbody A\n\n### FR-007\nbody B\n");
    const { exitCode, body } = await run(["identity", "extract", "--doc", doc, "--doc-kind", "requirements"]);
    expect(exitCode).toBe(0);
    expect(body.ok).toBe(true);
    expect((body.sections as ReadonlyArray<{ id: string }>).map((section) => section.id)).toEqual([
      "FR-006",
      "FR-007",
    ]);
    expect(body.aggregateDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("reports an identity failure as exit 1 with the typed kind", async () => {
    const doc = writeDoc("requirements.md", "### FR-006\na\n### FR-006\nb\n");
    const { exitCode, body } = await run(["identity", "extract", "--doc", doc, "--doc-kind", "requirements"]);
    expect(exitCode).toBe(1);
    expect(body.failure).toEqual({ kind: "duplicate-id", ids: ["FR-006"] });
  });

  test("reports an unreadable document as exit 1", async () => {
    const { exitCode, body } = await run([
      "identity",
      "extract",
      "--doc",
      join(workspace, "absent.md"),
      "--doc-kind",
      "requirements",
    ]);
    expect(exitCode).toBe(1);
    expect(body.ok).toBe(false);
    expect((body.failure as { kind: string }).kind).toBe("io-failure");
  });

  test("rejects an odd flag list as a usage error", async () => {
    const { exitCode, body } = await run(["identity", "extract", "--doc"]);
    expect(exitCode).toBe(2);
    expect(body.error).toContain("pairs");
  });

  test("rejects prototype-chain argv tokens as unknown commands", async () => {
    for (const argv of [
      ["__proto__", "extract"],
      ["constructor", "extract"],
      ["identity", "constructor"],
      ["identity", "toString"],
    ]) {
      const { exitCode, body } = await run(argv);
      expect(exitCode).toBe(2);
      expect(body.ok).toBe(false);
    }
  });

  test("rejects an empty --store as a usage error", async () => {
    const { exitCode, body } = await run(["bundle", "list", "--store", ""]);
    expect(exitCode).toBe(2);
    expect(body.error).toContain("--store");
  });
});

describe("identity compare", () => {
  const recorded = `sha256:${"1".repeat(64)}`;
  const current = `sha256:${"2".repeat(64)}`;

  test("reports current for equal digests", async () => {
    const { exitCode, body } = await run(["identity", "compare", "--recorded", recorded, "--current", recorded]);
    expect(exitCode).toBe(0);
    expect(body.comparison).toEqual({ kind: "current" });
  });

  test("reports stale for differing digests and still exits 0", async () => {
    const { exitCode, body } = await run(["identity", "compare", "--recorded", recorded, "--current", current]);
    expect(exitCode).toBe(0);
    expect(body.comparison).toEqual({ kind: "stale", recorded, current });
  });

  test("rejects a malformed digest as a usage error", async () => {
    const { exitCode } = await run(["identity", "compare", "--recorded", "nope", "--current", current]);
    expect(exitCode).toBe(2);
  });

  test("rejects a compare invocation missing --current as a usage error", async () => {
    const { exitCode, body } = await run(["identity", "compare", "--recorded", recorded]);
    expect(exitCode).toBe(2);
    expect(body.ok).toBe(false);
  });
});

describe("bundle build / verify / read", () => {
  const identity = `sha256:${"3".repeat(64)}`;

  async function buildOnce(): Promise<string> {
    const partsPath = join(workspace, "parts.json");
    writeFileSync(partsPath, JSON.stringify(authoringParts), "utf8");
    const { exitCode, body } = await run([
      "bundle",
      "build",
      "--parts",
      partsPath,
      "--predecessor",
      "root",
      "--identity",
      identity,
      "--store",
      storeRoot,
      "--generated-at",
      "2026-08-04T12:00:00Z",
      "--generated-by",
      "t439",
    ]);
    expect(exitCode).toBe(0);
    return body.digest as string;
  }

  test("builds an envelope and verifies it against the recorded identity", async () => {
    const digest = await buildOnce();
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    const verified = await run(["bundle", "verify", "--ref", digest, "--identity", identity, "--store", storeRoot]);
    expect(verified.exitCode).toBe(0);
    expect(verified.body.verified).toBe(true);
  });

  test("verify against a different identity exits 1 with identity-mismatch", async () => {
    const digest = await buildOnce();
    const other = `sha256:${"4".repeat(64)}`;
    const { exitCode, body } = await run(["bundle", "verify", "--ref", digest, "--identity", other, "--store", storeRoot]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("identity-mismatch");
  });

  test("verify after tampering exits 1 with digest-mismatch", async () => {
    const digest = await buildOnce();
    const name = readdirSync(storeRoot).find((entry) => entry.endsWith(".json")) as string;
    writeFileSync(join(storeRoot, name), readFileSync(join(storeRoot, name), "utf8").replace("t439", "attacker"), "utf8");
    const { exitCode, body } = await run(["bundle", "verify", "--ref", digest, "--identity", identity, "--store", storeRoot]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("digest-mismatch");
  });

  test("read returns the stored parts", async () => {
    const digest = await buildOnce();
    const { exitCode, body } = await run(["bundle", "read", "--ref", digest, "--store", storeRoot]);
    expect(exitCode).toBe(0);
    expect(body.evidence).toEqual(authoringParts);
  });

  test("rejects a build invocation missing required flags as a usage error", async () => {
    const partsPath = join(workspace, "parts.json");
    writeFileSync(partsPath, JSON.stringify(authoringParts), "utf8");
    const { exitCode, body } = await run(["bundle", "build", "--parts", partsPath]);
    expect(exitCode).toBe(2);
    expect(body.ok).toBe(false);
  });

  test("reports an unparseable parts file as exit 1", async () => {
    const partsPath = join(workspace, "broken-parts.json");
    writeFileSync(partsPath, "{ not json", "utf8");
    const { exitCode, body } = await run([
      "bundle",
      "build",
      "--parts",
      partsPath,
      "--predecessor",
      "root",
      "--identity",
      identity,
      "--store",
      storeRoot,
    ]);
    expect(exitCode).toBe(1);
    expect(body.ok).toBe(false);
  });

  test("build rejects a parts file that is missing receipts", async () => {
    const partsPath = join(workspace, "short.json");
    writeFileSync(partsPath, JSON.stringify({ kind: "authoring-bundle", parts: { applicability: {} } }), "utf8");
    const { exitCode, body } = await run([
      "bundle",
      "build",
      "--parts",
      partsPath,
      "--predecessor",
      "root",
      "--identity",
      identity,
      "--store",
      storeRoot,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string; parts: readonly string[] }).parts).toEqual([
      "parts.trace",
      "parts.proof",
      "parts.review",
      "parts.approval",
    ]);
  });

  test("build refuses an absent predecessor", async () => {
    const partsPath = join(workspace, "parts.json");
    writeFileSync(partsPath, JSON.stringify(authoringParts), "utf8");
    const { exitCode, body } = await run([
      "bundle",
      "build",
      "--parts",
      partsPath,
      "--predecessor",
      `sha256:${"9".repeat(64)}`,
      "--identity",
      identity,
      "--store",
      storeRoot,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("predecessor-broken");
  });
});

describe("bundle list / head", () => {
  const identity = `sha256:${"5".repeat(64)}`;

  test("lists nothing for an empty store", async () => {
    const { exitCode, body } = await run(["bundle", "list", "--store", storeRoot]);
    expect(exitCode).toBe(0);
    expect(body.refs).toEqual([]);
    expect(body.corrupted).toEqual([]);
  });

  test("lists a built envelope and reports it as the head", async () => {
    const partsPath = join(workspace, "parts.json");
    writeFileSync(partsPath, JSON.stringify(authoringParts), "utf8");
    const built = await run([
      "bundle",
      "build",
      "--parts",
      partsPath,
      "--predecessor",
      "root",
      "--identity",
      identity,
      "--store",
      storeRoot,
    ]);
    expect(built.exitCode).toBe(0);
    const listed = await run(["bundle", "list", "--store", storeRoot]);
    expect(listed.body.refs).toEqual([built.body.digest]);
    const head = await run(["bundle", "head", "--store", storeRoot]);
    expect(head.exitCode).toBe(0);
    expect(head.body.refs).toEqual([built.body.digest]);
  });
});
