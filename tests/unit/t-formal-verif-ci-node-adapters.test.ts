import { describe, expect, test } from "bun:test";
import {
  digestCiArtifact,
  downloadCiArtifact,
  resolveDockerExecutable,
  runCiCommand,
} from "../../scripts/formal-verif/node-ci-model-check-port.ts";

describe("CI Node adapters", () => {
  test("runs shell-free commands and hashes exact bytes", () => {
    const result = runCiCommand("/usr/bin/printf", ["%s", "ok"], {
      cwd: process.cwd(),
      env: { PATH: "/usr/bin:/bin" },
      timeoutMs: 1_000,
    });
    expect(result).toEqual({ status: 0, stdout: "ok", stderr: "" });
    expect(digestCiArtifact(new TextEncoder().encode("ok"))).toBe(
      "2689367b205c16ce32ed4200942b8b8b1e262dfc70d9bc9fbc77c49699a4f1df",
    );
  });

  test("resolves Docker and rejects an unavailable executable", () => {
    const success = (() => ({
      status: 0,
      stdout: "/opt/docker\n",
      stderr: "",
    })) as never;
    expect(resolveDockerExecutable(success, (path) => `/real${path}`)).toBe("/real/opt/docker");
    const failure = (() => ({ status: 1, stdout: "", stderr: "missing" })) as never;
    expect(() => resolveDockerExecutable(failure, (path) => path)).toThrow(
      "docker executable is unavailable",
    );
  });

  test("downloads bounded bytes and rejects HTTP, length, empty, and body overflows", async () => {
    expect(await downloadCiArtifact(
      "https://example.invalid/artifact",
      3,
      async () => new Response(new Uint8Array([1, 2, 3])),
    )).toEqual(new Uint8Array([1, 2, 3]));
    await expect(downloadCiArtifact(
      "https://example.invalid/artifact",
      3,
      async () => new Response("no", { status: 500 }),
    )).rejects.toThrow("download returned HTTP 500");
    await expect(downloadCiArtifact(
      "https://example.invalid/artifact",
      3,
      async () => new Response("four", { headers: { "content-length": "4" } }),
    )).rejects.toThrow("download exceeds the fixed byte limit");
    await expect(downloadCiArtifact(
      "https://example.invalid/artifact",
      3,
      async () => new Response(new Uint8Array()),
    )).rejects.toThrow("download size is outside the fixed byte limit");
    await expect(downloadCiArtifact(
      "https://example.invalid/artifact",
      3,
      async () => new Response(new Uint8Array([1, 2, 3, 4])),
    )).rejects.toThrow("download size is outside the fixed byte limit");
  });
});
