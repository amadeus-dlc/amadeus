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
      if (!ALLOWED_HOSTS.has(url.host)) {
        return Result.err(FetchError.payloadInvalid(`refusing to contact untrusted host: ${url.host}`));
      }
      try {
        const response = await fetchFollowingAllowedHosts(url, options.apiTimeoutMs);
        const meta: HttpMeta = { status: response.status, url: url.toString() };
        if (!response.ok) {
          return Result.err(FetchError.classify(new Error(`HTTP ${response.status}`), meta));
        }
        return Result.ok(await response.json());
      } catch (cause) {
        return Result.err(FetchError.classify(cause, { status: null, url: url.toString() }));
      }
    },

    async downloadArchive(url: URL): Promise<Result<ReadableStream<Uint8Array>, FetchError>> {
      if (!ALLOWED_HOSTS.has(url.host)) {
        return Result.err(FetchError.payloadInvalid(`refusing to contact untrusted host: ${url.host}`));
      }
      try {
        const response = await fetchFollowingAllowedHosts(url, options.archiveTimeoutMs);
        const meta: HttpMeta = { status: response.status, url: url.toString() };
        if (!response.ok) {
          return Result.err(FetchError.classify(new Error(`HTTP ${response.status}`), meta));
        }
        if (!response.body) {
          return Result.err(FetchError.classify(new Error("empty response body"), meta));
        }
        return Result.ok(response.body);
      } catch (cause) {
        return Result.err(FetchError.classify(cause, { status: null, url: url.toString() }));
      }
    },
  });
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
