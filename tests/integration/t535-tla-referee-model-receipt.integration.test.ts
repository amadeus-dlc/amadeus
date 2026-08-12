// The referee proves models that are not in the model map yet — that is the
// point of authoring a new one. Its receipt therefore binds the bytes on disk
// instead of a registry entry, and both validator consumers have to accept it
// without the registered-model pin being loosened (issue #2913, defect D1).

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import {
  isRefereeTlaModelReceipt,
  REFEREE_RECEIPT_IDENTITY_DOMAIN,
  isVerifiedTlaModelReceipt,
  validateModelCheckReceipt,
  validateVerifiedTlaModelReceipt,
} from "../../plugins/formal-model-check/tools/tla-model-receipt.ts";
import {
  createRefereeToolchain,
  createRefereeTlaModelReceipt,
} from "../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";
import { RefereeToolchainInternals } from "../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";
import { parseTlcOutput174 } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const TOOLS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "plugins",
  "formal-model-check",
  "tools",
);

const MODULE = [
  "---- MODULE Counter ----",
  "EXTENDS Naturals",
  "VARIABLE ticks",
  "TypeOK == ticks \\in 0..3",
  "Init == ticks = 0",
  "Next == ticks' = IF ticks < 3 THEN ticks + 1 ELSE ticks",
  "Spec == Init /\\ [][Next]_ticks",
  "====",
  "",
].join("\n");

const CONFIG = ["SPECIFICATION Spec", "INVARIANT TypeOK", ""].join("\n");

// The module defines TypeOK but never Absent, so the source map cannot locate
// every invariant the config declares.
const MISSING_INVARIANT_CONFIG = ["SPECIFICATION Spec", "INVARIANT TypeOK, Absent", ""].join("\n");

const HELPER_MODULE = [
  "---- MODULE Helper ----",
  "EXTENDS Naturals",
  "Cap == 3",
  "====",
  "",
].join("\n");

const MODULE_WITH_AUXILIARY = MODULE
  .replace("EXTENDS Naturals", "EXTENDS Naturals, Helper")
  .replace("ticks \\in 0..3", "ticks \\in 0..Cap");

const roots: string[] = [];

function workspace(
  module = MODULE,
  config = CONFIG,
  auxiliaries: Readonly<Record<string, string>> = {},
): { modulePath: string; configPath: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t535-"));
  roots.push(root);
  const modulePath = join(root, "Counter.tla");
  const configPath = join(root, "Counter.cfg");
  writeFileSync(modulePath, module, "utf8");
  writeFileSync(configPath, config, "utf8");
  for (const [name, source] of Object.entries(auxiliaries)) {
    writeFileSync(join(root, `${name}.tla`), source, "utf8");
  }
  return { modulePath, configPath };
}

function refereeReceipt(
  module = MODULE,
  config = CONFIG,
  auxiliaries: Readonly<Record<string, string>> = {},
) {
  const { modulePath, configPath } = workspace(module, config, auxiliaries);
  const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
  if (!described.ok) throw new Error(JSON.stringify(described.error));
  const receipt = createRefereeTlaModelReceipt(described.value.source);
  if (!receipt.ok) throw new Error(receipt.error.message);
  return receipt.value;
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe("the referee receipt is a self-contained receipt kind", () => {
  test("it is not a verified-source receipt", () => {
    const receipt = refereeReceipt();
    expect(isRefereeTlaModelReceipt(receipt)).toBe(true);
    expect(isVerifiedTlaModelReceipt(receipt)).toBe(false);
  });

  test("the preparation-stage validator accepts an unregistered model", () => {
    const receipt = refereeReceipt();
    const validated = validateModelCheckReceipt(receipt);
    expect(validated.ok).toBe(true);
    if (validated.ok && isRefereeTlaModelReceipt(validated.value)) {
      expect(validated.value.modelName).toBe("Counter");
    } else {
      throw new Error("the validated receipt is not a referee receipt");
    }
  });

  test("the registered-model validator still refuses it", () => {
    const validated = validateVerifiedTlaModelReceipt(refereeReceipt());
    expect(validated.ok).toBe(false);
  });

  test("its identity binds the module bytes", () => {
    const baseline = refereeReceipt();
    const mutated = refereeReceipt(MODULE.replace("ticks \\in 0..3", "ticks \\in 0..2"));
    expect(mutated.moduleBytesIdentity).not.toBe(baseline.moduleBytesIdentity);
    expect(mutated.modelIdentity).not.toBe(baseline.modelIdentity);
  });

  test("its identity binds the config bytes", () => {
    const baseline = refereeReceipt();
    const mutated = refereeReceipt(MODULE, `${CONFIG}CHECK_DEADLOCK FALSE\n`);
    expect(mutated.cfgBytesIdentity).not.toBe(baseline.cfgBytesIdentity);
    expect(mutated.modelIdentity).not.toBe(baseline.modelIdentity);
  });

  test("a receipt whose identity was rewritten is refused", () => {
    const tampered = { ...refereeReceipt(), modelIdentity: "0".repeat(64) };
    const validated = validateModelCheckReceipt(tampered);
    expect(validated.ok).toBe(false);
  });

  test("a receipt whose byte identity was rewritten is refused", () => {
    const tampered = { ...refereeReceipt(), moduleBytesIdentity: "0".repeat(64) };
    expect(validateModelCheckReceipt(tampered).ok).toBe(false);
  });

  test("a receipt whose model name disagrees with its vocabulary is refused", () => {
    // Recompute the carried identity after the rename so the rejection can only
    // come from the modelName <-> vocabulary binding, not from a stale identity.
    const { modelIdentity: _stale, ...renamed } = { ...refereeReceipt(), modelName: "Other" };
    const tampered = {
      ...renamed,
      modelIdentity: canonicalIdentity(renamed, REFEREE_RECEIPT_IDENTITY_DOMAIN).sha256,
    };
    expect(validateModelCheckReceipt(tampered).ok).toBe(false);
  });

  test("a receipt carrying an extra key is refused", () => {
    const tampered = { ...refereeReceipt(), extra: 1 };
    expect(validateModelCheckReceipt(tampered).ok).toBe(false);
  });

  test("a receipt missing a key is refused", () => {
    const { vocabulary, ...tampered } = refereeReceipt();
    expect(validateModelCheckReceipt(tampered).ok).toBe(false);
  });

  // "0".repeat(64) is well-formed hex, so the tampering tests above reach the
  // identity comparison instead of the byte-identity shape check.
  test("a receipt whose byte identity is not hex is refused", () => {
    const tampered = { ...refereeReceipt(), moduleBytesIdentity: "z".repeat(64) };
    const validated = validateModelCheckReceipt(tampered);
    expect(validated.ok).toBe(false);
    if (validated.ok) throw new Error("the receipt was accepted");
    expect(validated.error.message).toBe("receipt byte identities are invalid");
  });

  test("a receipt whose auxiliary modules are malformed is refused", () => {
    const tampered = { ...refereeReceipt(), auxiliaryModules: [{ name: "Helper" }] };
    const validated = validateModelCheckReceipt(tampered);
    expect(validated.ok).toBe(false);
    if (validated.ok) throw new Error("the receipt was accepted");
    expect(validated.error.message).toBe("receipt auxiliary modules are invalid");
  });

  test("a receipt whose source map misses a declared invariant is refused", () => {
    const tampered = { ...refereeReceipt(), invariantSourceMap: {} };
    const validated = validateModelCheckReceipt(tampered);
    expect(validated.ok).toBe(false);
    if (validated.ok) throw new Error("the receipt was accepted");
    expect(validated.error.message)
      .toBe("receipt invariant source map does not cover the declared invariants");
  });
});

describe("the referee receipt records the modules the mutant extends", () => {
  test("an extended local module appears as an auxiliary module", () => {
    const receipt = refereeReceipt(MODULE_WITH_AUXILIARY, CONFIG, { Helper: HELPER_MODULE });
    expect(receipt.auxiliaryModules.map(({ name }) => name)).toEqual(["Helper"]);
    expect(receipt.auxiliaryModules[0]?.moduleBytesIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(validateModelCheckReceipt(receipt).ok).toBe(true);
  });

  test("the auxiliary module bytes bind the identity", () => {
    const baseline = refereeReceipt(MODULE_WITH_AUXILIARY, CONFIG, { Helper: HELPER_MODULE });
    const mutated = refereeReceipt(MODULE_WITH_AUXILIARY, CONFIG, {
      Helper: HELPER_MODULE.replace("Cap == 3", "Cap == 2"),
    });
    expect(mutated.auxiliaryModules[0]?.moduleBytesIdentity)
      .not.toBe(baseline.auxiliaryModules[0]?.moduleBytesIdentity);
    expect(mutated.modelIdentity).not.toBe(baseline.modelIdentity);
  });
});

describe("the referee receipt constructor refuses an underivable model", () => {
  test("a source without a declared vocabulary is refused", () => {
    const { modulePath, configPath } = workspace();
    const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
    if (!described.ok) throw new Error(JSON.stringify(described.error));
    const receipt = createRefereeTlaModelReceipt({
      ...described.value.source,
      model: { ...described.value.source.model, vocabulary: undefined },
    });
    expect(receipt.ok).toBe(false);
    if (receipt.ok) throw new Error("the receipt was minted");
    expect(receipt.error.message).toBe("model Counter has no declared vocabulary");
  });

  test("a config naming an undefined invariant is refused", () => {
    const { modulePath, configPath } = workspace(MODULE, MISSING_INVARIANT_CONFIG);
    const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
    if (!described.ok) throw new Error(JSON.stringify(described.error));
    const receipt = createRefereeTlaModelReceipt(described.value.source);
    expect(receipt.ok).toBe(false);
    if (receipt.ok) throw new Error("the receipt was minted");
    expect(receipt.error.message).toBe("model Counter is missing invariant formula Absent");
  });
});

describe("the referee toolchain refuses to run a model it cannot mint a receipt for", () => {
  test("the run fails before the toolchain is acquired", async () => {
    const { modulePath, configPath } = workspace(MODULE, MISSING_INVARIANT_CONFIG);
    const toolchain = createRefereeToolchain({});
    await expect(toolchain.run({ kind: "baseline", modulePath, configPath } as never))
      .rejects.toThrow("referee toolchain: model Counter is missing invariant formula Absent");
  });
});

describe("the output-parse consumer accepts the referee receipt", () => {
  function parse(receipt: unknown, expectedModuleName: string) {
    return parseTlcOutput174({
      chunks: [new TextEncoder().encode("")],
      exitCode: 0,
      signal: null,
      timedOut: false,
      expectedModuleName,
      expectedModulePath: `/workspace/${expectedModuleName}.tla`,
      expectedStandardModuleDirectory: "/workspace/.tlc-stdlib",
      verifiedArtifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      modelReceipt: receipt as never,
      vocabulary: { moduleName: "Counter", namedInvariants: ["TypeOK"], traceStateVariables: ["ticks"] },
    });
  }

  test("the receipt itself is not what the parse rejects", () => {
    const exploration = parse(refereeReceipt(), "Counter");
    expect(exploration.kind).toBe("HARNESS_ERROR");
    if (exploration.kind === "HARNESS_ERROR") {
      expect(exploration.detail).not.toContain("model receipt is invalid");
      expect(exploration.detail).not.toContain("not bound to the model receipt");
    }
  });

  test("output for a different module is still unbound", () => {
    const exploration = parse(refereeReceipt(), "Other");
    expect(exploration.kind).toBe("HARNESS_ERROR");
    if (exploration.kind === "HARNESS_ERROR") {
      expect(exploration.detail).toContain("not bound to the model receipt");
    }
  });
});

describe("the referee receipt constructor stays off the production surfaces", () => {
  test("only the referee toolchain names it", () => {
    const naming = readdirSync(TOOLS_DIR)
      .filter((entry) => entry.endsWith(".ts"))
      .filter((entry) => readFileSync(join(TOOLS_DIR, entry), "utf8").includes("createRefereeTlaModelReceipt"));
    expect(naming).toEqual(["tla-referee-toolchain.ts"]);
  });
});
