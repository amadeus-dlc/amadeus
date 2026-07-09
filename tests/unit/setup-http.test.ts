// covers: modules:setup-http
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
