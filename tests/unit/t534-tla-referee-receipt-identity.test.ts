// The referee derives source identities from bytes it reads off disk; the
// loader and the toolchain's byte check derive them from the decoded string.
// Both forms feed the same canonical hash, so a split encoding makes a receipt
// the toolchain cannot re-verify (issue #2913, defect D2).

import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { RefereeToolchainInternals } from "../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";

const MODULE_IDENTITY_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const CFG_IDENTITY_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

const MODULE = [
  "---- MODULE Counter ----",
  "EXTENDS Naturals",
  "VARIABLE ticks",
  "TypeOK == ticks \\in 0..3",
  "====",
  "",
].join("\n");

const CONFIG = ["SPECIFICATION Spec", "INVARIANT TypeOK", ""].join("\n");

function loaderIdentity(source: string, domain: string): string {
  return canonicalIdentity(source, domain).sha256;
}

describe("referee source identities use the loader's encoding", () => {
  test("a module's referee identity equals its loader identity", () => {
    const bytes = new TextEncoder().encode(MODULE);
    expect(RefereeToolchainInternals.sourceIdentityOf(bytes, MODULE_IDENTITY_DOMAIN))
      .toBe(loaderIdentity(MODULE, MODULE_IDENTITY_DOMAIN));
  });

  test("a config's referee identity equals its loader identity", () => {
    const bytes = new TextEncoder().encode(CONFIG);
    expect(RefereeToolchainInternals.sourceIdentityOf(bytes, CFG_IDENTITY_DOMAIN))
      .toBe(loaderIdentity(CONFIG, CFG_IDENTITY_DOMAIN));
  });

  test("the domain still separates identical bytes", () => {
    const bytes = new TextEncoder().encode(MODULE);
    expect(RefereeToolchainInternals.sourceIdentityOf(bytes, MODULE_IDENTITY_DOMAIN))
      .not.toBe(RefereeToolchainInternals.sourceIdentityOf(bytes, CFG_IDENTITY_DOMAIN));
  });
});
