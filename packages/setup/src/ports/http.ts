import { FetchError, type HttpMeta } from "../domain/payload.ts";
import { Result } from "../shared/result.ts";

// SEC-F02: communication is limited to exactly these two hosts, HTTPS only.
const ALLOWED_HOSTS = new Set(["api.github.com", "codeload.github.com"]);
const API_BASE = "https://api.github.com";
const MAX_REDIRECTS = 5;

export type Http = {
  getJson(apiPath: string): Promise<Result<unknown, FetchError>>;
  downloadArchive(url: URL): Promise<Result<ReadableStream<Uint8Array>, FetchError>>;
};

export type HttpOptions = {
  readonly apiTimeoutMs: number;
  readonly archiveTimeoutMs: number;
};

// Timeout values are baked into this factory (performance-design): resolver and
// fetcher never see or choose a timeout, they just call the port.
export function createHttp(options: HttpOptions): Http {
  return Object.freeze({
    async getJson(apiPath: string): Promise<Result<unknown, FetchError>> {
      const url = new URL(apiPath, API_BASE);
      const checked = await fetchChecked(url, options.apiTimeoutMs);
      if (checked.type === "err") return checked;
      try {
        return Result.ok(await checked.value.json());
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        return Result.err(FetchError.payloadInvalid(`response body was not valid JSON: ${detail}`));
      }
    },

    async downloadArchive(url: URL): Promise<Result<ReadableStream<Uint8Array>, FetchError>> {
      const checked = await fetchChecked(url, options.archiveTimeoutMs);
      if (checked.type === "err") return checked;
      const response = checked.value;
      if (!response.body) {
        return Result.err(FetchError.classify(new Error("empty response body"), { status: response.status, url: url.toString() }));
      }
      return Result.ok(response.body);
    },
  });
}

// Shared by both Http methods: host allowlist check, the redirect-checked
// fetch itself, and error classification on a non-ok status or thrown cause.
// Each caller only adds what is specific to it (JSON parsing vs. the body
// stream / empty-body check).
async function fetchChecked(url: URL, timeoutMs: number): Promise<Result<Response, FetchError>> {
  if (!ALLOWED_HOSTS.has(url.host)) {
    return Result.err(FetchError.payloadInvalid(`refusing to contact untrusted host: ${url.host}`));
  }
  try {
    const response = await fetchFollowingAllowedHosts(url, timeoutMs);
    if (!response.ok) {
      const meta: HttpMeta = { status: response.status, url: url.toString() };
      return Result.err(FetchError.classify(new Error(`HTTP ${response.status}`), meta));
    }
    return Result.ok(response);
  } catch (cause) {
    return Result.err(FetchError.classify(cause, { status: null, url: url.toString() }));
  }
}

// SEC-F02: redirects are followed manually so each hop can be checked against
// the host allowlist before it is taken (fetch's built-in "follow" mode would
// contact the redirect target before we get a chance to inspect it).
async function fetchFollowingAllowedHosts(initialUrl: URL, timeoutMs: number): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, { signal, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`redirect response ${response.status} had no Location header`);
      const next = new URL(location, current);
      if (!ALLOWED_HOSTS.has(next.host)) {
        throw new Error(`refusing to follow redirect to untrusted host: ${next.host}`);
      }
      current = next;
      continue;
    }
    return response;
  }
  throw new Error("too many redirects");
}
