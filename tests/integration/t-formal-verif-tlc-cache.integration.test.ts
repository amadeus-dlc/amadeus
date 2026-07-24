import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FIXED_TLC_RESERVATION_BYTES,
  FsTlcToolchain,
  type ArtifactNetworkPort,
  type FileDigestPort,
  type PhysicalReservationPort,
} from "../../scripts/formal-verif/fs-tlc-toolchain.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
} from "../../scripts/formal-verif/tlc-toolchain.ts";

const fixtureBytes = new TextEncoder().encode("fixed-tlc-1.7.4-test-artifact");

class FixtureDigest implements FileDigestPort {
  streamingDigests = 0;
  verificationReads = 0;

  createStreamingDigest() {
    this.streamingDigests++;
    const hash = createHash("sha256");
    let offset = 0;
    let exact = true;
    return {
      update: (bytes: Uint8Array) => {
        hash.update(bytes);
        for (let index = 0; index < bytes.byteLength; index++) {
          if (bytes[index] !== fixtureBytes[offset + index]) exact = false;
        }
        offset += bytes.byteLength;
      },
      digest: () => {
        const actual = hash.digest("hex");
        return exact && offset === fixtureBytes.byteLength
          ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
          : actual;
      },
    };
  }

  digest(path: string, maxBytes: number) {
    this.verificationReads++;
    const bytes = new Uint8Array(readFileSync(path));
    if (bytes.byteLength > maxBytes) throw new Error("digest cap exceeded");
    const exact = bytes.byteLength === fixtureBytes.byteLength && bytes.every((byte, index) => byte === fixtureBytes[index]);
    return {
      sha256: exact
        ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
        : createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.byteLength,
    };
  }
}

class FakeReservation implements PhysicalReservationPort {
  available = FIXED_TLC_RESERVATION_BYTES;
  readonly active = new Map<string, number>();
  availableBytes(): number { return this.available; }
  reserve(path: string, bytes: number): void { this.active.set(path, bytes); }
  release(path: string): void { this.active.delete(path); }
  isReserved(path: string): boolean { return this.active.has(path); }
}

class FakeNetwork implements ArtifactNetworkPort {
  requests = 0;
  async request(input: Parameters<ArtifactNetworkPort["request"]>[0]) {
    this.requests++;
    return {
      status: 200,
      headers: { "content-length": String(fixtureBytes.byteLength) },
      connectedAtMs: input.startedAtMs + 1,
      headersAtMs: input.startedAtMs + 2,
      body: (async function* () { yield fixtureBytes; })(),
    };
  }
}

describe("formal verification TLC artifact cache", () => {
  test("keeps wildcard implementation exports behind the root barrel", () => {
    const barrel = readFileSync(join(process.cwd(), "scripts/formal-verif/index.ts"), "utf8");
    expect(barrel).not.toContain('export * from "./tla-arm.ts"');
    expect(barrel).not.toContain('export * from "./tlc-toolchain.ts"');
    expect(barrel).not.toContain('export * from "./fs-tlc-toolchain.ts"');
  });

  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  const workspace = () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-"));
    roots.push(root);
    const network = new FakeNetwork();
    const reservation = new FakeReservation();
    const digest = new FixtureDigest();
    const cache = new FsTlcToolchain(root, {
      network,
      digest,
      reservation,
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000001",
      jdkVersion: "OpenJDK 26.0.1",
    });
    return { root, network, reservation, digest, cache };
  };

  test("acquires the fixed artifact, rehashes it offline, and reuses the exact receipt", async () => {
    const { network, reservation, cache } = workspace();
    const first = await cache.acquire();
    expect(first.ok).toBe(true);
    expect(cache.verifyOffline()).toEqual(first);
    expect(await cache.acquire()).toEqual(first);
    expect(network.requests).toBe(1);
    expect(reservation.active.size).toBe(0);
  });

  test("fails closed when a dead lock owner changes during liveness verification", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-lock-race-"));
    roots.push(root);
    const namespace = join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY);
    mkdirSync(namespace, { recursive: true });
    const lockPath = join(namespace, ".acquire.lock");
    const originalOwner = {
      host: "dead-host",
      pid: 41,
      processStartedAt: "dead-process",
      nonce: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-07-21T00:00:00Z",
      descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    };
    writeFileSync(lockPath, JSON.stringify(originalOwner));
    const network = new FakeNetwork();
    const cache = new FsTlcToolchain(root, {
      network,
      digest: new FixtureDigest(),
      reservation: new FakeReservation(),
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => {
        writeFileSync(lockPath, JSON.stringify({
          ...originalOwner,
          nonce: "00000000-0000-4000-8000-000000000002",
        }));
        return "dead";
      },
      randomUuid: () => "00000000-0000-4000-8000-000000000003",
      jdkVersion: "OpenJDK 26.0.1",
    });

    const result = await cache.acquire();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("LOCK_INTEGRITY");
    expect(network.requests).toBe(0);
  });

  test("converges a crash between physical reservation and the ACTIVE claim", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-reserve-crash-"));
    roots.push(root);
    const network = new FakeNetwork();
    const reservation = new FakeReservation();
    let crash = true;
    const dependencies = {
      network,
      digest: new FixtureDigest(),
      reservation,
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead" as const,
      randomUuid: () => "00000000-0000-4000-8000-000000000004",
      jdkVersion: "OpenJDK 26.0.1",
      fault: (point: string) => {
        if (crash && point === "after-capacity-reserve") {
          crash = false;
          throw new Error("reserve response lost");
        }
      },
    };
    const cache = new FsTlcToolchain(root, dependencies);

    const interrupted = await cache.acquire();

    expect(interrupted.ok).toBe(false);
    expect(reservation.active.size).toBe(1);
    expect(await new FsTlcToolchain(root, dependencies).acquire()).toEqual(cache.verifyOffline());
    expect(network.requests).toBe(1);
    expect(reservation.active.size).toBe(0);
    expect(existsSync(join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ".capacity-released.json"))).toBe(true);
  });

  test("converges matching ACTIVE and RESERVING records after the capacity claim is published", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-claim-crash-"));
    roots.push(root);
    const network = new FakeNetwork();
    const reservation = new FakeReservation();
    let crash = true;
    const dependencies = {
      network, digest: new FixtureDigest(), reservation,
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead" as const,
      randomUuid: () => "00000000-0000-4000-8000-000000000014",
      jdkVersion: "OpenJDK 26.0.1",
      fault: (point: string) => {
        if (crash && point === "after-capacity-claim") {
          crash = false;
          throw new Error("ACTIVE publication response lost");
        }
      },
    };
    const namespace = join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY);

    expect((await new FsTlcToolchain(root, dependencies).acquire()).ok).toBe(false);
    expect(existsSync(join(namespace, ".capacity-active.json"))).toBe(true);
    expect(existsSync(join(namespace, ".capacity-reserving.json"))).toBe(true);

    expect((await new FsTlcToolchain(root, dependencies).acquire()).ok).toBe(true);
    expect(existsSync(join(namespace, ".capacity-reserving.json"))).toBe(false);
    expect(existsSync(join(namespace, ".capacity-active.json"))).toBe(false);
    expect(existsSync(join(namespace, ".capacity-released.json"))).toBe(true);
    expect(reservation.active.size).toBe(0);
  });

  test("reclaims a partial sparse backing left under a durable RESERVING record", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-partial-reserve-"));
    roots.push(root);
    const namespace = join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY);
    mkdirSync(namespace, { recursive: true });
    const backing = join(namespace, ".capacity.backing");
    writeFileSync(backing, "partial");
    writeFileSync(join(namespace, ".capacity-reserving.json"), JSON.stringify({ descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ownerNonce: "00000000-0000-4000-8000-000000000005", bytes: FIXED_TLC_RESERVATION_BYTES, state: "RESERVING" }));
    const reservation = new FakeReservation();
    let partial = true;
    reservation.reserve = (path, bytes) => {
      if (partial || existsSync(path)) throw new Error("exclusive allocation collided with partial backing");
      reservation.active.set(path, bytes);
    };
    reservation.release = (path) => {
      if (existsSync(path)) unlinkSync(path);
      partial = false;
      reservation.active.delete(path);
    };
    const cache = new FsTlcToolchain(root, {
      network: new FakeNetwork(), digest: new FixtureDigest(), reservation,
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" }, liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000006", jdkVersion: "OpenJDK 26.0.1",
    });

    expect((await cache.acquire()).ok).toBe(true);
    expect(partial).toBe(false);
    expect(reservation.active.size).toBe(0);
  });

  test("converges a crash between physical release and the RELEASED receipt", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-release-crash-"));
    roots.push(root);
    const network = new FakeNetwork();
    const reservation = new FakeReservation();
    let crash = true;
    const dependencies = {
      network,
      digest: new FixtureDigest(),
      reservation,
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead" as const,
      randomUuid: () => "00000000-0000-4000-8000-000000000005",
      jdkVersion: "OpenJDK 26.0.1",
      fault: (point: string) => {
        if (crash && point === "after-capacity-release") {
          crash = false;
          throw new Error("release response lost");
        }
      },
    };
    const cache = new FsTlcToolchain(root, dependencies);

    const interrupted = await cache.acquire();

    expect(interrupted.ok).toBe(false);
    expect(reservation.active.size).toBe(0);
    expect(await new FsTlcToolchain(root, dependencies).acquire()).toEqual(cache.verifyOffline());
    expect(network.requests).toBe(1);
    expect(existsSync(join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ".capacity-active.json"))).toBe(false);
    expect(existsSync(join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ".capacity-released.json"))).toBe(true);
  });

  test("enforces the absolute body deadline while the async iterator is pending", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-body-deadline-"));
    roots.push(root);
    const reservation = new FakeReservation();
    let nowCalls = 0;
    const network: ArtifactNetworkPort = {
      async request(input) {
        return {
          status: 200,
          headers: { "content-length": String(fixtureBytes.byteLength) },
          connectedAtMs: input.startedAtMs + 1,
          headersAtMs: input.startedAtMs + 2,
          body: {
            [Symbol.asyncIterator]() {
              return { next: () => new Promise<IteratorResult<Uint8Array>>(() => {}) };
            },
          },
        };
      },
    };
    const cache = new FsTlcToolchain(root, {
      network,
      digest: new FixtureDigest(),
      reservation,
      clock: {
        nowMs: () => nowCalls++ === 0 ? 0 : 119_999,
        utcNow: () => "2026-07-21T00:00:00Z",
      },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000006",
      jdkVersion: "OpenJDK 26.0.1",
    });

    const observed = await Promise.race([
      cache.acquire(),
      new Promise<"still-pending">((resolve) => setTimeout(() => resolve("still-pending"), 25)),
    ]);

    expect(observed).not.toBe("still-pending");
    expect(typeof observed === "object" && !observed.ok && observed.error.code).toBe("DEADLINE");
    expect(reservation.active.size).toBe(0);
  });

  test("enforces the local header deadline when the network request never resolves", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-request-deadline-"));
    roots.push(root);
    const reservation = new FakeReservation();
    let nowCalls = 0;
    const cache = new FsTlcToolchain(root, {
      network: { request: () => new Promise(() => {}) }, digest: new FixtureDigest(), reservation,
      clock: { nowMs: () => nowCalls++ === 0 ? 0 : 29_999, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" }, liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000015", jdkVersion: "OpenJDK 26.0.1",
    });

    const observed = await Promise.race([cache.acquire(), new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 25))]);

    expect(observed).not.toBe("pending");
    expect(typeof observed === "object" && !observed.ok && observed.error.code).toBe("DEADLINE");
    expect(reservation.active.size).toBe(0);
  });

  test("enforces the shared body deadline when redirect cleanup never resolves", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-redirect-close-"));
    roots.push(root);
    const reservation = new FakeReservation();
    const times = [0, 0, 119_999];
    const cache = new FsTlcToolchain(root, {
      network: { request: async (input) => ({
        status: 302, headers: { location: "https://objects.githubusercontent.com/tla2tools.jar" },
        connectedAtMs: input.startedAtMs, headersAtMs: input.startedAtMs,
        body: { [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: undefined }), return: () => new Promise(() => {}) }) },
      }) },
      digest: new FixtureDigest(), reservation,
      clock: { nowMs: () => times.shift() ?? 119_999, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" }, liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000016", jdkVersion: "OpenJDK 26.0.1",
    });

    const observed = await Promise.race([cache.acquire(), new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 25))]);

    expect(observed).not.toBe("pending");
    expect(typeof observed === "object" && !observed.ok && observed.error.code).toBe("DEADLINE");
    expect(reservation.active.size).toBe(0);
  });

  test("rejects an allowlisted HTTPS redirect that selects a non-default port", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-port-"));
    roots.push(root);
    let requests = 0;
    const network: ArtifactNetworkPort = {
      async request(input) {
        requests++;
        if (requests === 1) {
          return {
            status: 302,
            headers: { location: "https://objects.githubusercontent.com:444/tla2tools.jar" } as Readonly<Record<string, string>>,
            connectedAtMs: input.startedAtMs + 1,
            headersAtMs: input.startedAtMs + 2,
            body: (async function* () {})(),
          };
        }
        return {
          status: 200,
          headers: { "content-length": String(fixtureBytes.byteLength) } as Readonly<Record<string, string>>,
          connectedAtMs: input.startedAtMs + 1,
          headersAtMs: input.startedAtMs + 2,
          body: (async function* () { yield fixtureBytes; })(),
        };
      },
    };
    const cache = new FsTlcToolchain(root, {
      network,
      digest: new FixtureDigest(),
      reservation: new FakeReservation(),
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000007",
      jdkVersion: "OpenJDK 26.0.1",
    });

    const result = await cache.acquire();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("REDIRECT");
    expect(requests).toBe(1);
  });

  test("does not download when a receipt exists without its cache artifact", async () => {
    const { root, network, cache } = workspace();
    expect((await cache.acquire()).ok).toBe(true);
    unlinkSync(join(
      root,
      FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      FIXED_TLC_ARTIFACT_DESCRIPTOR.fileName,
    ));

    const result = await cache.acquire();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("CACHE_MISSING");
    expect(network.requests).toBe(1);
  });

  test("rejects oversized local metadata before parsing it", async () => {
    const { root, cache } = workspace();
    expect((await cache.acquire()).ok).toBe(true);
    const receiptPath = join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, "receipt.json");
    writeFileSync(receiptPath, new Uint8Array(1024 * 1024 + 1));

    const result = cache.verifyOffline();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("RECEIPT");
  });

  test("closes the receipt descriptor after recovering publish response loss", async () => {
    const before = readdirSync("/dev/fd").length;
    for (let index = 0; index < 8; index++) {
      const root = mkdtempSync(join(tmpdir(), `fv-tlc-cache-fd-${index}-`));
      roots.push(root);
      let crash = true;
      const cache = new FsTlcToolchain(root, {
        network: new FakeNetwork(),
        digest: new FixtureDigest(),
        reservation: new FakeReservation(),
        clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
        owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
        liveness: () => "dead",
        randomUuid: () => `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
        jdkVersion: "OpenJDK 26.0.1",
        fault: (point) => {
          if (crash && point === "after-publish-sync") {
            crash = false;
            throw new Error("publish response lost");
          }
        },
      });
      expect((await cache.acquire()).ok).toBe(false);
      expect((await cache.acquire()).ok).toBe(true);
    }

    expect(readdirSync("/dev/fd").length - before).toBeLessThan(4);
  });

  test("splits a transport chunk larger than the one MiB write buffer", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-cache-chunk-cap-"));
    roots.push(root);
    const largeChunk = new Uint8Array(1024 * 1024 + 1);
    const network: ArtifactNetworkPort = {
      async request(input) {
        return {
          status: 200,
          headers: { "content-length": String(largeChunk.byteLength) },
          connectedAtMs: input.startedAtMs + 1,
          headersAtMs: input.startedAtMs + 2,
          body: (async function* () { yield largeChunk; })(),
        };
      },
    };
    let streamedBytes = 0;
    const digest: FileDigestPort = {
      createStreamingDigest() {
        return {
          update(bytes) { streamedBytes += bytes.byteLength; },
          digest() {
            return streamedBytes === largeChunk.byteLength
              ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
              : "0".repeat(64);
          },
        };
      },
      digest(path, maxBytes) {
        const bytes = readFileSync(path);
        if (bytes.byteLength > maxBytes) throw new Error("digest cap exceeded");
        return {
          sha256: bytes.byteLength === largeChunk.byteLength
            ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
            : "0".repeat(64),
          byteLength: bytes.byteLength,
        };
      },
    };
    const reservation = new FakeReservation();
    const cache = new FsTlcToolchain(root, {
      network,
      digest,
      reservation,
      clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
      liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000020",
      jdkVersion: "OpenJDK 26.0.1",
    });

    const result = await cache.acquire();

    expect(result.ok).toBe(true);
    expect(streamedBytes).toBe(largeChunk.byteLength);
    expect(reservation.active.size).toBe(0);
  });

  test("streams the download hash and performs exactly one verification reread", async () => {
    const { cache, digest } = workspace();

    expect((await cache.acquire()).ok).toBe(true);
    expect(digest.streamingDigests).toBe(1);
    expect(digest.verificationReads).toBe(1);
  });
});
