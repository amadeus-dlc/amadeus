// covers: modules:setup-http
// size: small
//
// createHttp — getJson()'s JSON parse boundary (#677). The fetch/HTTP-status
// classification lives inside fetchChecked()'s try/catch, but Response.json()
// is awaited outside that boundary in getJson(). A 200 OK response with a
// non-JSON body must not throw a raw SyntaxError past the typed Result
// boundary; it must classify as a payload-invalid FetchError instead.

import { describe, expect, test } from "bun:test";
import { createHttp } from "../../packages/setup/src/ports/http.ts";

async function withFakeFetch<T>(response: Response, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => response) as unknown as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

describe("createHttp — getJson()", () => {
  test("200 OK with a non-JSON body returns Result.err(payload-invalid), never throws", async () => {
    const response = new Response("not-json", { status: 200 });
    await withFakeFetch(response, async () => {
      const http = createHttp({ apiTimeoutMs: 1000, archiveTimeoutMs: 1000 });
      const result = await http.getJson("/repos/amadeus-dlc/amadeus/releases");
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });

  test("200 OK with a valid JSON body still resolves successfully", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    await withFakeFetch(response, async () => {
      const http = createHttp({ apiTimeoutMs: 1000, archiveTimeoutMs: 1000 });
      const result = await http.getJson("/repos/amadeus-dlc/amadeus/releases");
      expect(result.type).toBe("ok");
      if (result.type === "ok") expect(result.value).toEqual({ ok: true });
    });
  });

  test("edge case: a non-2xx status is still classified by fetchChecked, unaffected by the parse fix", async () => {
    const response = new Response("not-json", { status: 404 });
    await withFakeFetch(response, async () => {
      const http = createHttp({ apiTimeoutMs: 1000, archiveTimeoutMs: 1000 });
      const result = await http.getJson("/repos/amadeus-dlc/amadeus/releases");
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.status).toBe(404);
    });
  });
});

describe("createHttp — release asset redirects", () => {
  test("refuses an untrusted initial URL before calling fetch", async () => {
    const original = globalThis.fetch;
    const contacted: string[] = [];
    globalThis.fetch = (async (input) => {
      contacted.push(String(input));
      return new Response("archive", { status: 200 });
    }) as typeof fetch;
    try {
      const http = createHttp({ apiTimeoutMs: 1000, archiveTimeoutMs: 1000 });
      const result = await http.downloadArchive(new URL("https://example.com/untrusted.tar.gz"));

      expect(result.type).toBe("err");
      expect(contacted).toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("allows the exact GitHub release hosts and follows the redirect manually", async () => {
    const original = globalThis.fetch;
    const contacted: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = String(input);
      contacted.push(url);
      if (url.startsWith("https://github.com/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://release-assets.githubusercontent.com/github-production-release-asset/file.tar.gz" },
        });
      }
      return new Response("archive", { status: 200 });
    }) as typeof fetch;
    try {
      const http = createHttp({ apiTimeoutMs: 1000, archiveTimeoutMs: 1000 });
      const result = await http.downloadArchive(
        new URL("https://github.com/amadeus-dlc/amadeus/releases/download/v0.1.8/amadeus-dist-v0.1.8.tar.gz"),
      );

      expect(result.type).toBe("ok");
      expect(contacted).toEqual([
        "https://github.com/amadeus-dlc/amadeus/releases/download/v0.1.8/amadeus-dist-v0.1.8.tar.gz",
        "https://release-assets.githubusercontent.com/github-production-release-asset/file.tar.gz",
      ]);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("refuses an insecure redirect before contacting its target", async () => {
    const original = globalThis.fetch;
    const contacted: string[] = [];
    globalThis.fetch = (async (input) => {
      contacted.push(String(input));
      return new Response(null, {
        status: 302,
        headers: { location: "http://release-assets.githubusercontent.com/insecure.tar.gz" },
      });
    }) as typeof fetch;
    try {
      const http = createHttp({ apiTimeoutMs: 1000, archiveTimeoutMs: 1000 });
      const result = await http.downloadArchive(
        new URL("https://github.com/amadeus-dlc/amadeus/releases/download/v0.1.8/amadeus-dist-v0.1.8.tar.gz"),
      );

      expect(result.type).toBe("err");
      expect(contacted).toEqual([
        "https://github.com/amadeus-dlc/amadeus/releases/download/v0.1.8/amadeus-dist-v0.1.8.tar.gz",
      ]);
    } finally {
      globalThis.fetch = original;
    }
  });
});
