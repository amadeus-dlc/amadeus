// covers: domain:setup-fetch-error
//
// FetchError.classify()/isTransient() — the full BR-F06~F08 classification
// matrix that decides whether fetcher's single automatic retry fires.

import { describe, expect, test } from "bun:test";
import { FetchError } from "../../packages/setup/src/domain/payload.ts";

describe("FetchError.classify", () => {
  test("BR-F08: 403 is classified as rate-limit and is not transient", () => {
    const e = FetchError.classify(new Error("HTTP 403"), { status: 403, url: "https://api.github.com/x" });
    expect(e.type).toBe("rate-limit");
    expect(e.isTransient()).toBe(false);
  });

  test("BR-F08: 429 is classified as rate-limit and is not transient", () => {
    const e = FetchError.classify(new Error("HTTP 429"), { status: 429, url: "https://api.github.com/x" });
    expect(e.type).toBe("rate-limit");
    expect(e.isTransient()).toBe(false);
  });

  test("BR-F06: a 5xx response is classified http and is transient", () => {
    const e = FetchError.classify(new Error("HTTP 503"), { status: 503, url: "https://api.github.com/x" });
    expect(e.type).toBe("http");
    expect(e.isTransient()).toBe(true);
  });

  test("BR-F07: a 404 response is classified http and is not transient", () => {
    const e = FetchError.classify(new Error("HTTP 404"), { status: 404, url: "https://api.github.com/x" });
    expect(e.type).toBe("http");
    expect(e.isTransient()).toBe(false);
  });

  test("BR-F06: a timeout (AbortError) is classified timeout and is transient", () => {
    const abortError = new DOMException("The operation timed out.", "TimeoutError");
    const e = FetchError.classify(abortError);
    expect(e.type).toBe("timeout");
    expect(e.isTransient()).toBe(true);
  });

  test("BR-F06: a DNS failure (ENOTFOUND) is classified dns and is transient", () => {
    const dnsError = Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
    const e = FetchError.classify(dnsError);
    expect(e.type).toBe("dns");
    expect(e.isTransient()).toBe(true);
  });

  test("edge case: an unrecognized cause with no meta falls back to conn and is transient", () => {
    const e = FetchError.classify(new Error("socket hang up"));
    expect(e.type).toBe("conn");
    expect(e.isTransient()).toBe(true);
  });

  test("edge case: guidance() is non-empty for every classification", () => {
    const causes: Array<[unknown, { status: number | null; url: string } | undefined]> = [
      [new Error("HTTP 403"), { status: 403, url: "https://api.github.com/x" }],
      [new Error("HTTP 503"), { status: 503, url: "https://api.github.com/x" }],
    ];
    for (const [cause, meta] of causes) {
      expect(FetchError.classify(cause, meta).guidance().length).toBeGreaterThan(0);
    }
  });
});

describe("FetchError.payloadInvalid", () => {
  test("is never transient", () => {
    expect(FetchError.payloadInvalid("missing dist/").isTransient()).toBe(false);
  });

  test("edge case: carries the given detail message", () => {
    expect(FetchError.payloadInvalid("missing dist/").detail).toBe("missing dist/");
  });
});
