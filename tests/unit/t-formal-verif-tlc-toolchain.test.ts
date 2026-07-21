import { describe, expect, test } from "bun:test";
import {
  createFrozenTlaModelReceipt,
  FIXED_TLC_174_GRAMMAR_DESCRIPTOR_IDENTITY,
  generateFrozenTlaModel,
} from "../../scripts/formal-verif/tla-arm.ts";
import * as toolchainModule from "../../scripts/formal-verif/tlc-toolchain.ts";
import {
  DARWIN_NETWORK_DENY_POLICY_IDENTITY,
  DARWIN_SANDBOX_PROVIDER_IDENTITY,
  FIXED_JDK_RUN_PROFILE,
  FIXED_JDK_RUN_PROFILE_IDENTITY,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  FIXED_TLC_PROFILE,
  FIXED_TLC_PROFILE_IDENTITY,
  createJdkDistributionManifest,
  createJdkSnapshotIdentity,
  createSandboxProbeReceipt,
  createTlcRunManifest,
  validateFixedJdkRunProfile,
  validateFixedTlcArtifactDescriptor,
  validateFixedTlcProfile,
  type TlcExecutionPort,
  type TlcToolchainFacade,
} from "../../scripts/formal-verif/tlc-toolchain.ts";

const hash = (token: string) => token.repeat(64);

describe("formal verification TLC toolchain domain", () => {
  test("accepts only the exact fixed TLC 1.7.4 descriptor", () => {
    const exact = structuredClone(FIXED_TLC_ARTIFACT_DESCRIPTOR);
    expect(validateFixedTlcArtifactDescriptor(exact)).toEqual({ ok: true, value: FIXED_TLC_ARTIFACT_DESCRIPTOR });
    expect(FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY).toMatch(/^[0-9a-f]{64}$/);
    expect(FIXED_TLC_174_GRAMMAR_DESCRIPTOR_IDENTITY).toBe(FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY);

    const drifts: unknown[] = [
      { ...exact, version: "1.7.5" },
      { ...exact, url: exact.url.replace("https://", "http://") },
      { ...exact, url: "https://example.com/tla2tools.jar" },
      { ...exact, fileName: "other.jar" },
      { ...exact, sha256: "0".repeat(64) },
      { ...exact, maxBytes: exact.maxBytes + 1 },
      { ...exact, integrity: "HASH_AND_LENGTH" },
      { ...exact, redirectOrigins: [...exact.redirectOrigins, "example.com"] },
      { ...exact, redirectOrigins: [...exact.redirectOrigins].reverse() },
      { ...exact, unexpected: true },
      Object.assign(Object.create(null), exact),
    ];
    for (const drift of drifts) expect(validateFixedTlcArtifactDescriptor(drift).ok).toBe(false);
  });

  test("accepts only the closed finite TLC election profile", () => {
    const exact = structuredClone(FIXED_TLC_PROFILE);
    expect(validateFixedTlcProfile(exact)).toEqual({ ok: true, value: FIXED_TLC_PROFILE });
    expect(FIXED_TLC_PROFILE_IDENTITY).toMatch(/^[0-9a-f]{64}$/);

    const nestedPrototype = structuredClone(exact);
    Object.setPrototypeOf(nestedPrototype.budgets, null);
    const drifts: unknown[] = [
      { ...exact, voters: ["V1", "V2"] },
      { ...exact, voters: ["V1", "V2", "V4"] },
      { ...exact, choices: ["C1", "C2", "C4"] },
      { ...exact, unknownChoice: "C4" },
      { ...exact, submittedAt: ["T0", "T1", "T2", "INVALID_FORMAT"] },
      { ...exact, receivedAt: ["T0", "T1", "T3"] },
      { ...exact, unknownReference: "REF0" },
      { ...exact, goa: [1, 2, 3, 4, 5, 6, 7] },
      { ...exact, budgets: { ...exact.budgets, initialPerVoter: 2 } },
      { ...exact, budgets: { ...exact.budgets, amendPerVoter: 2 } },
      { ...exact, budgets: { ...exact.budgets, globalHold: 2 } },
      { ...exact, workers: 2 },
      { ...exact, unexpected: true },
      Object.assign(Object.create(null), exact),
      nestedPrototype,
    ];
    for (const drift of drifts) expect(validateFixedTlcProfile(drift).ok).toBe(false);
  });

  test("accepts only the fixed OpenJDK execution profile", () => {
    const exact = structuredClone(FIXED_JDK_RUN_PROFILE);
    expect(validateFixedJdkRunProfile(exact)).toEqual({ ok: true, value: FIXED_JDK_RUN_PROFILE });
    expect(FIXED_JDK_RUN_PROFILE_IDENTITY).toMatch(/^[0-9a-f]{64}$/);

    const drifts: unknown[] = [
      { ...exact, vendor: "Oracle" },
      { ...exact, version: "26.0.2" },
      { ...exact, jvmArgs: exact.jvmArgs.filter((argument) => argument !== "-Xms256m") },
      { ...exact, jvmArgs: exact.jvmArgs.map((argument) => argument === "-Xmx1024m" ? "-Xmx2048m" : argument) },
      { ...exact, jvmArgs: exact.jvmArgs.filter((argument) => argument !== "-XX:+UseParallelGC") },
      { ...exact, locale: "C" },
      { ...exact, timezone: "Asia/Tokyo" },
      { ...exact, unexpected: true },
      Object.assign(Object.create(null), exact),
    ];
    for (const drift of drifts) expect(validateFixedJdkRunProfile(drift).ok).toBe(false);
  });

  test("binds a complete canonical OpenJDK distribution to one snapshot identity", () => {
    const entries = [
      { kind: "FILE" as const, path: "lib/libjava.dylib", target: null, byteLength: 30, sha256: hash("d") },
      { kind: "FILE" as const, path: "bin/java", target: null, byteLength: 10, sha256: hash("a") },
      { kind: "SYMLINK" as const, path: "Contents/Home", target: ".", byteLength: 0, sha256: hash("e") },
      { kind: "FILE" as const, path: "conf/security/java.security", target: null, byteLength: 20, sha256: hash("c") },
      { kind: "FILE" as const, path: "lib/modules", target: null, byteLength: 40, sha256: hash("b") },
    ];
    const created = createJdkDistributionManifest({
      vendor: "OpenJDK",
      version: "26.0.1",
      javaExecutablePath: "bin/java",
      javaExecutableSha256: hash("a"),
      entries,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);
    expect(created.value.entries.map(({ path }) => path)).toEqual([
      "Contents/Home",
      "bin/java",
      "conf/security/java.security",
      "lib/libjava.dylib",
      "lib/modules",
    ]);
    expect(created.value.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(createJdkSnapshotIdentity(created.value, hash("e"))).toBe(
      createJdkSnapshotIdentity(structuredClone(created.value), hash("e")),
    );
    expect(createJdkSnapshotIdentity(created.value, hash("e"))).not.toBe(
      createJdkSnapshotIdentity(created.value, hash("f")),
    );
    expect(createJdkDistributionManifest({ ...created.value, entries: entries.map((entry) => entry.kind === "SYMLINK" ? { ...entry, target: "/outside" } : entry) }).ok).toBe(false);

    const incomplete = createJdkDistributionManifest({
      vendor: "OpenJDK",
      version: "26.0.1",
      javaExecutablePath: "bin/java",
      javaExecutableSha256: hash("a"),
      entries: entries.filter(({ path }) => path !== "lib/modules"),
    });
    expect(incomplete.ok).toBe(false);
  });

  test("mints a sandbox receipt only when all three fixed network probes are denied", () => {
    const input = {
      providerIdentity: DARWIN_SANDBOX_PROVIDER_IDENTITY,
      policyIdentity: DARWIN_NETWORK_DENY_POLICY_IDENTITY,
      checkedAt: "2026-07-21T01:00:00Z",
      probes: [
        { kind: "DNS" as const, denied: true as const, exitCode: 1, signal: null, evidenceIdentity: hash("c") },
        { kind: "TCP_LOOPBACK" as const, denied: true as const, exitCode: 1, signal: null, evidenceIdentity: hash("a") },
        { kind: "UDP_LOOPBACK" as const, denied: true as const, exitCode: 1, signal: null, evidenceIdentity: hash("b") },
      ],
    };
    const receipt = createSandboxProbeReceipt(input);
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) throw new Error(receipt.error.message);
    expect(receipt.value.probes.map(({ kind }) => kind)).toEqual(["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"]);
    expect(receipt.value.receiptIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(createSandboxProbeReceipt(structuredClone(input))).toEqual(receipt);
    expect(createSandboxProbeReceipt({ ...input, probes: input.probes.slice(1) }).ok).toBe(false);
    expect(createSandboxProbeReceipt({
      ...input,
      probes: input.probes.map((probe) => probe.kind === "DNS" ? { ...probe, denied: false as const, exitCode: 0 } : probe),
    }).ok).toBe(false);
  });

  test("binds one explicit TLC invocation to a deterministic run manifest", () => {
    const manifest = createJdkDistributionManifest({
      vendor: "OpenJDK",
      version: "26.0.1",
      javaExecutablePath: "bin/java",
      javaExecutableSha256: hash("a"),
      entries: [
        { kind: "FILE", path: "bin/java", target: null, byteLength: 10, sha256: hash("a") },
        { kind: "FILE", path: "conf/security/java.security", target: null, byteLength: 20, sha256: hash("b") },
        { kind: "FILE", path: "lib/libjava.dylib", target: null, byteLength: 30, sha256: hash("c") },
        { kind: "FILE", path: "lib/modules", target: null, byteLength: 40, sha256: hash("d") },
      ],
    });
    if (!manifest.ok) throw new Error(manifest.error.message);
    const modelReceipt = createFrozenTlaModelReceipt(generateFrozenTlaModel({
      publicContractIdentity: hash("7"),
    }));
    const input = {
      artifact: { kind: "VerifiedTlcArtifact" as const, descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, actualSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256, byteLength: 2_274_532, cachePath: "/cache/tla2tools.jar", receiptIdentity: hash("e") },
      jdk: { kind: "VerifiedJdkSnapshot" as const, manifest: manifest.value, manifestIdentity: manifest.value.manifestIdentity, snapshotIdentity: createJdkSnapshotIdentity(manifest.value, hash("9")), javaVersionReceiptIdentity: hash("9"), snapshotRoot: "/cache/jdk", javaExecutablePath: "bin/java", verifiedAt: "2026-07-21T01:00:01Z" },
      sandbox: { kind: "VerifiedSandbox" as const, providerIdentity: DARWIN_SANDBOX_PROVIDER_IDENTITY, policyIdentity: DARWIN_NETWORK_DENY_POLICY_IDENTITY, receiptIdentity: hash("f"), checkedAt: "2026-07-21T01:00:00Z" },
      modelReceipt,
      modulePath: "FormalElection.tla",
      cfgPath: "FormalElection.cfg",
      subjectAlias: "opaque-subject",
      argv: [
        "/cache/jdk/bin/java",
        ...FIXED_JDK_RUN_PROFILE.jvmArgs,
        "-Djava.io.tmpdir=/cache/run/.tlc-stdlib",
        "-cp",
        "/cache/tla2tools.jar",
        "tlc2.TLC",
        "-workers",
        "1",
        "-tool",
        "-config",
        "FormalElection.cfg",
        "FormalElection.tla",
      ],
      cwd: "/cache/run",
      deadlineMs: 120_000,
    };
    const first = createTlcRunManifest(input);
    const replay = createTlcRunManifest({ ...input, argv: [...input.argv] });
    expect(first).toEqual(replay);
    expect(first.ok && first.value.javaVersionReceiptIdentity).toBe(hash("9"));
    expect(first.ok && first.value.modelIdentity).toBe(modelReceipt.modelIdentity);
    expect(first.ok && first.value.moduleIdentity).toBe(modelReceipt.moduleBytesIdentity);
    expect(first.ok && first.value.cfgIdentity).toBe(modelReceipt.cfgBytesIdentity);
    expect("modelIdentity" in input || "moduleIdentity" in input || "cfgIdentity" in input).toBe(false);
    expect(first.ok && first.value.runIdentity).toMatch(/^[0-9a-f]{64}$/);
    const shorter = createTlcRunManifest({ ...input, deadlineMs: 119_999 });
    expect(first.ok && shorter.ok && first.value.runIdentity).not.toBe(shorter.ok && shorter.value.runIdentity);
    expect(createTlcRunManifest({ ...input, artifact: { ...input.artifact, actualSha256: hash("0") } }).ok).toBe(false);
    expect(createTlcRunManifest({
      ...input,
      modelReceipt: { ...modelReceipt, modelIdentity: hash("1") },
    }).ok).toBe(false);
    expect(createTlcRunManifest({
      ...input,
      modelReceipt: { ...modelReceipt, unexpected: true } as never,
    }).ok).toBe(false);
    const missingVersionReceipt = structuredClone(input) as unknown as Omit<typeof input, "jdk"> & {
      jdk: Omit<typeof input.jdk, "javaVersionReceiptIdentity"> & {
        javaVersionReceiptIdentity?: string;
      };
    };
    delete missingVersionReceipt.jdk.javaVersionReceiptIdentity;
    expect(createTlcRunManifest(missingVersionReceipt as never).ok).toBe(false);
    expect(createTlcRunManifest({
      ...input,
      jdk: { ...input.jdk, javaVersionReceiptIdentity: hash("8") },
    }).ok).toBe(false);
    const alternateVersionReceipt = hash("8");
    const rebound = createTlcRunManifest({
      ...input,
      jdk: {
        ...input.jdk,
        javaVersionReceiptIdentity: alternateVersionReceipt,
        snapshotIdentity: createJdkSnapshotIdentity(manifest.value, alternateVersionReceipt),
      },
    });
    expect(rebound.ok).toBe(true);
    expect(first.ok && rebound.ok && first.value.runIdentity).not.toBe(
      rebound.ok && rebound.value.runIdentity,
    );
    expect(createTlcRunManifest({
      ...input,
      jdk: { ...input.jdk, javaVersionReceiptIdentity: hash("A") },
    }).ok).toBe(false);
  });

  test("keeps the five facade operations independent and the execution port run-only", async () => {
    const calls: string[] = [];
    const failure = { ok: false as const, error: { kind: "InvocationError" as const, code: "TEST_ADAPTER", message: "not implemented" } };
    const execution: TlcExecutionPort = { run: async () => { calls.push("run"); return failure; } };
    const facade: TlcToolchainFacade = {
      acquire: async () => { calls.push("acquire"); return failure; },
      verifyOffline: () => { calls.push("verifyOffline"); return failure; },
      prepare: async () => { calls.push("prepare"); return failure; },
      run: (prepared) => execution.run(prepared),
      normalize: () => { calls.push("normalize"); return failure; },
    };

    expect((await facade.acquire()).ok).toBe(false);
    expect(calls).toEqual(["acquire"]);
    expect(facade.verifyOffline().ok).toBe(false);
    expect(calls).toEqual(["acquire", "verifyOffline"]);
    expect((await facade.prepare(undefined as never)).ok).toBe(false);
    expect(calls).toEqual(["acquire", "verifyOffline", "prepare"]);
    expect((await facade.run(undefined as never)).ok).toBe(false);
    expect(calls).toEqual(["acquire", "verifyOffline", "prepare", "run"]);
    expect(facade.normalize(undefined as never).ok).toBe(false);
    expect(calls).toEqual(["acquire", "verifyOffline", "prepare", "run", "normalize"]);
  });

  test("does not expose a production capability issuer or network-bearing run constructor", () => {
    expect("TlcRuntimeCapabilityAuthority" in toolchainModule).toBe(false);
    expect("TlcToolchainFacade" in toolchainModule).toBe(false);
    expect(Object.keys(toolchainModule).filter((name) => /fetch|proxy|credential/i.test(name))).toEqual([]);
  });
});
