// covers: file:amadeus-swarm-driver-foundation.ts, file:amadeus-swarm-driver-contract.ts, file:amadeus-swarm-driver-adapter-contract.ts, file:amadeus-swarm-driver-selector.ts
// size: small

import { describe, expect, test } from "bun:test";
import packageJson from "../../package.json" with { type: "json" };

const CONTRACT_PATH = "packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
const FOUNDATION_PATH = "packages/framework/core/tools/amadeus-swarm-driver-foundation.ts";
const ADAPTER_CONTRACT_PATH = "packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
const SELECTOR_PATH = "packages/framework/core/tools/amadeus-swarm-driver-selector.ts";

async function importSource(path: string): Promise<string> {
  const loaded = (await import(`../../${path}?architecture-source`, {
    with: { type: "text" },
  })) as unknown as { default: string };
  return loaded.default;
}

const contractSource = await importSource(CONTRACT_PATH);
const foundationSource = await importSource(FOUNDATION_PATH);
const adapterContractSource = await importSource(ADAPTER_CONTRACT_PATH);
const selectorSource = await importSource(SELECTOR_PATH);
const manifest = packageJson as {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
};

function importSpecifiers(contents: string): string[] {
  return [...contents.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]);
}

function containsAny(contents: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => contents.includes(fragment));
}

const FORBIDDEN_SOURCE_FRAGMENTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    "filesystem",
    [
      `node:${"f"}s`,
      `Bun.${"fi"}le`,
      `Deno${"."}`,
      `read${"File"}`,
      `write${"File"}`,
      `mk${"dir"}`,
      `read${"dir"}`,
    ],
  ],
  [
    "process execution",
    [
      `node:${"child_"}process`,
      `Bun.${"sp"}awn`,
      `spawn${"Sync"}`,
      `exec${"File"}`,
      `exec${"Sync"}`,
    ],
  ],
  ["ambient process state", [`process${"."}`]],
  [
    "network",
    [
      `node:${"ht"}tp`,
      `node:${"ne"}t`,
      `${"fet"}ch(`,
      `XMLHttp${"Request"}`,
      `Web${"Socket"}`,
    ],
  ],
  ["clock", [`Date${"."}now(`, `new Date(`, `performance${"."}now(`]],
  ["randomness", [`Math${"."}random(`, `crypto${"."}random`, `random${"UUID"}`]],
  ["dynamic import", [`im${"port"}(`]],
  ["worker", [`new ${"Worker"}(`]],
];

describe("U-01 policy source boundary", () => {
  test("the policy contracts depend on one no-side-effect foundation leaf", () => {
    expect([...new Set(importSpecifiers(contractSource))]).toEqual([
      "node:crypto",
      "./amadeus-swarm-driver-foundation.ts",
      "./amadeus-swarm-driver-adapter-contract.ts",
    ]);
    expect(importSpecifiers(adapterContractSource)).toEqual(["./amadeus-swarm-driver-foundation.ts"]);
    expect(contractSource).not.toContain("const NATIVE_DRIVER_PROVIDER");
    expect(adapterContractSource).not.toContain("const HARNESS_VALUES");
    expect(adapterContractSource).not.toContain("const NATIVE_DRIVER_VALUES");
    expect(adapterContractSource).not.toContain("function expectedSupport");
    expect(adapterContractSource).not.toContain("const REGISTRATION_CONTRACT");
    expect(foundationSource).toContain("NATIVE_DRIVER_REGISTRATION_CONTRACT");
    expect(foundationSource).toContain("nativeDriverSupportsHarness");
    expect(foundationSource).toContain("export const Result");
    expect(foundationSource).toContain("export const SelectorError");
  });

  test("the four canonical source files exist at the framework tools seam", () => {
    expect(foundationSource.length, FOUNDATION_PATH).toBeGreaterThan(0);
    expect(contractSource.length, CONTRACT_PATH).toBeGreaterThan(0);
    expect(adapterContractSource.length, ADAPTER_CONTRACT_PATH).toBeGreaterThan(0);
    expect(selectorSource.length, SELECTOR_PATH).toBeGreaterThan(0);
  });

  test("the source graph is closed to crypto plus local policy modules", () => {
    expect(importSpecifiers(selectorSource)).toEqual(["./amadeus-swarm-driver-contract.ts"]);
  });

  test("policy production source performs no filesystem, process, network, clock, random, or dynamic loading I/O", () => {
    const productionSource = `${foundationSource}\n${contractSource}\n${adapterContractSource}\n${selectorSource}`;
    for (const [name, fragments] of FORBIDDEN_SOURCE_FRAGMENTS) {
      expect(containsAny(productionSource, fragments), `${name} must stay outside the U-01 policy`).toBe(false);
    }
  });

  test("provider adapters and orchestration runtime remain contracts, not U-01 implementations", () => {
    const productionSource = `${foundationSource}\n${contractSource}\n${adapterContractSource}\n${selectorSource}`;
    expect(adapterContractSource).not.toMatch(
      /from\s+["'][^"']*(?:provider|runtime|audit|checkpoint|worktree|wave)[^"']*["']/i,
    );
    expect(productionSource).not.toMatch(/(?:register|load|discover|instantiate)(?:Driver|Provider|Adapter)/);
    expect(productionSource).not.toContain("amadeus-orchestrate");
    expect(productionSource).not.toContain("amadeus-swarm.ts");
  });

  test("the repository adds no runtime dependency for the pure policy", () => {
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(manifest.devDependencies?.["fast-check"]).toBeDefined();
  });
});
