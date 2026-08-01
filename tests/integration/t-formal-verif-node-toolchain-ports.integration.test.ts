// The Node adapters behind the TLC toolchain ports — HTTPS artifact transport,
// file digest, physical space reservation, `java -version` inspection, and
// process-group spawn — plus the default toolchain factory that wires them.
// Everything here touches the real filesystem or real child processes, so it
// lives in the integration layer.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NodeArtifactNetworkPort,
  NodeFileDigestPort,
  NodeJavaVersionPort,
  NodePhysicalReservationPort,
  NodeTlcProcessPort,
} from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import { createDefaultModelCheckToolchain } from "../../plugins/formal-model-check/tools/run-model-check.ts";

let root: string;

function script(name: string, body: string): string {
  const path = join(root, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`, "utf8");
  chmodSync(path, 0o755);
  return path;
}

// Loopback port 1 is privileged, so no unprivileged listener can occupy it: the
// connection is refused immediately rather than hanging on an unrouted address.
const REFUSED_URL = "https://127.0.0.1:1/artifact";

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "amadeus-node-ports-"));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("NodeArtifactNetworkPort transport guard", () => {
  const port = new NodeArtifactNetworkPort();
  const request = (overrides: Partial<Parameters<typeof port.request>[0]>) => ({
    url: "https://example.invalid/artifact",
    startedAtMs: Date.now(),
    connectDeadlineMs: Date.now() + 5_000,
    headersDeadlineMs: Date.now() + 5_000,
    bodyDeadlineMs: Date.now() + 5_000,
    headers: { accept: "application/octet-stream" },
    ...overrides,
  });

  test.each([
    ["plain HTTP", { url: "http://example.invalid/artifact" }],
    ["embedded credentials", { url: "https://user:pass@example.invalid/artifact" }],
    ["a header beyond Accept", { headers: { authorization: "Bearer x" } }],
  ])("rejects %s before opening a socket", async (_label, overrides) => {
    await expect(port.request(request(overrides))).rejects.toThrow(
      /unauthenticated HTTPS with the fixed Accept header/,
    );
  });

  test("propagates a connection failure to the caller", async () => {
    await expect(port.request(request({ url: REFUSED_URL }))).rejects.toThrow();
  });
});

describe("NodeFileDigestPort", () => {
  const digest = new NodeFileDigestPort();

  test("streams a digest incrementally and matches the whole-file digest", () => {
    const path = join(root, "payload.bin");
    const payload = new TextEncoder().encode("formal verification payload");
    writeFileSync(path, payload);
    const streaming = digest.createStreamingDigest();
    streaming.update(payload.subarray(0, 10));
    streaming.update(payload.subarray(10));
    const whole = digest.digest(path, 1024);
    expect(whole.byteLength).toBe(payload.byteLength);
    expect(whole.sha256).toBe(streaming.digest());
  });

  test("refuses a target that is not a capped regular file", () => {
    const path = join(root, "payload.bin");
    expect(() => digest.digest(path, 4)).toThrow(/capped regular file/);
    expect(() => digest.digest(root, 1024)).toThrow(/capped regular file/);
  });
});

describe("NodePhysicalReservationPort", () => {
  const reservation = new NodePhysicalReservationPort();

  test("reports the available bytes of a real filesystem", () => {
    expect(reservation.availableBytes(root)).toBeGreaterThanOrEqual(0);
  });

  test("reserves physical blocks, refuses to overwrite, and releases", () => {
    const path = join(root, "reservation.bin");
    reservation.reserve(path, 4096);
    const stat = statSync(path);
    expect(stat.size).toBe(4096);
    expect(stat.blocks * 512).toBeGreaterThanOrEqual(4096);
    expect(() => reservation.reserve(path, 4096)).toThrow();
    reservation.release(path);
    expect(reservation.isReserved(path)).toBe(false);
  });
});

describe("NodeJavaVersionPort", () => {
  const java = new NodeJavaVersionPort();

  test("returns the realpath and the merged version output on success", async () => {
    const path = script("java-ok", 'echo "openjdk version \\"26.0.1\\"" 1>&2');
    const receipt = await java.inspect({
      javaExecutablePath: path,
      javaHome: root,
      deadlineMs: 5_000,
    });
    expect(receipt.executableRealpath.endsWith("java-ok")).toBe(true);
    expect(receipt.output).toContain("openjdk version");
  });

  test("fails loudly on a non-zero exit", async () => {
    const path = script("java-fail", "exit 3");
    await expect(
      java.inspect({ javaExecutablePath: path, javaHome: root, deadlineMs: 5_000 }),
    ).rejects.toThrow(/java -version failed/);
  });
});

describe("NodeTlcProcessPort", () => {
  const processes = new NodeTlcProcessPort();
  const environment = { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" } as const;

  test("requires an absolute argv[0]", () => {
    expect(() =>
      processes.spawn({ argv: ["java"], cwd: root, environment, shell: false, processGroup: true }),
    ).toThrow(/argv\[0\] must be absolute/);
    expect(() =>
      processes.spawn({ argv: [], cwd: root, environment, shell: false, processGroup: true }),
    ).toThrow(/argv\[0\] must be absolute/);
  });

  test("streams both pipes and reports the exit status", async () => {
    const path = script("emit", 'echo out; echo err 1>&2; exit 0');
    const child = processes.spawn({
      argv: [path],
      cwd: root,
      environment,
      shell: false,
      processGroup: true,
    });
    const read = async (stream: AsyncIterable<Uint8Array>) => {
      let text = "";
      for await (const chunk of stream) text += new TextDecoder().decode(chunk);
      return text;
    };
    const [stdout, stderr, status] = await Promise.all([
      read(child.stdout),
      read(child.stderr),
      child.wait(),
    ]);
    expect(stdout.trim()).toBe("out");
    expect(stderr.trim()).toBe("err");
    expect(status.exitCode).toBe(0);
  });

  test("kills the whole process group", async () => {
    const path = script("linger", "sleep 30");
    const child = processes.spawn({
      argv: [path],
      cwd: root,
      environment,
      shell: false,
      processGroup: true,
    });
    await child.signalGroup("SIGKILL");
    const status = await child.wait();
    expect(status.exitCode === null || status.exitCode !== 0).toBe(true);
  });
});

describe("default model-check toolchain factory", () => {
  test("wires the Node ports against a cache root without touching disk", () => {
    const toolchain = createDefaultModelCheckToolchain(join(root, "cache"), root);
    expect(toolchain).toBeDefined();
    expect(typeof toolchain.preparePlanned).toBe("function");
    expect(typeof toolchain.runPlanned).toBe("function");
  });
});
