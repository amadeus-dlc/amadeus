import { createExtractedPayload } from "../internal/payload-factory.ts";
import { createFetchError } from "../internal/fetch-error-factory.ts";
import { HarnessName } from "./harness.ts";
import type { ResolvedVersion } from "./resolved-version.ts";
import type { Result } from "../shared/result.ts";

export type HttpMeta = {
  readonly status: number | null;
  readonly url: string;
};

export type FetchErrorType = "dns" | "conn" | "timeout" | "http" | "rate-limit" | "payload-invalid";

export type FetchError = {
  readonly type: FetchErrorType;
  readonly detail: string;
  readonly status: number | null; // extra data for the "http" variant (BR-F06~F08 transience)
  isTransient(): boolean;
  guidance(): string;
};

export namespace FetchError {
  export function classify(cause: unknown, meta?: HttpMeta): FetchError {
    const type = classifyType(cause, meta);
    return createFetchError(type, describeCause(cause, meta), meta?.status ?? null);
  }

  export function payloadInvalid(detail: string): FetchError {
    return createFetchError("payload-invalid", detail, null);
  }
}

Object.freeze(FetchError);

function classifyType(cause: unknown, meta?: HttpMeta): FetchErrorType {
  if (meta?.status === 403 || meta?.status === 429) return "rate-limit"; // BR-F08
  if (meta && meta.status !== null && meta.status >= 400) return "http";
  if (isTimeoutError(cause)) return "timeout";
  if (isDnsError(cause)) return "dns";
  return "conn";
}

function isTimeoutError(cause: unknown): boolean {
  return cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
}

function isDnsError(cause: unknown): boolean {
  return cause instanceof Error && "code" in cause && (cause as { code?: string }).code === "ENOTFOUND";
}

function describeCause(cause: unknown, meta?: HttpMeta): string {
  if (meta) return `${meta.url} responded with status ${meta.status ?? "unknown"}`;
  if (cause instanceof Error) return cause.message;
  return String(cause);
}

export type ExtractedPayload = {
  readonly version: ResolvedVersion;
  harnessRoot(harness: HarnessName): Result<string, FetchError>;
  availableHarnesses(): readonly HarnessName[];
};

export namespace ExtractedPayload {
  // BR-F10: codeload always wraps the archive in exactly one top-level directory;
  // locate() resolves it by position (not by name) then anchors on dist/<harness>.
  export function locate(extractedDir: string, version: ResolvedVersion): Result<ExtractedPayload, FetchError> {
    return createExtractedPayload(extractedDir, version, HarnessName.all);
  }
}

Object.freeze(ExtractedPayload);
