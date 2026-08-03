import type { FetchError, FetchErrorType } from "../domain/payload.ts";

const GUIDANCE: Record<FetchErrorType, string> = {
  dns: "Check your network connection and try again.",
  conn: "Check your network connection and try again.",
  timeout: "The request timed out; try again on a more stable connection.",
  http: "The GitHub archive could not be retrieved; verify the requested version exists.",
  "rate-limit": "GitHub API rate limit reached; wait a while before retrying.",
  "payload-invalid": "The downloaded archive is not a valid Amadeus distribution.",
  "asset-missing": "The required release asset is missing; verify the release is complete.",
  "checksum-unavailable": "The release checksum is missing; the archive cannot be verified.",
  "checksum-mismatch": "The release archive failed checksum verification and will not be installed.",
};

export function createFetchError(type: FetchErrorType, detail: string, status: number | null = null): FetchError {
  return Object.freeze({
    type,
    detail,
    status,
    isTransient(): boolean {
      // BR-F06/F07/F08: DNS/connection/timeout/5xx retry once; 4xx, rate-limit,
      // and payload-invalid never auto-retry within a single execution.
      switch (type) {
        case "dns":
        case "conn":
        case "timeout":
          return true;
        case "http":
          return status !== null && status >= 500;
        case "rate-limit":
        case "payload-invalid":
        case "asset-missing":
        case "checksum-unavailable":
        case "checksum-mismatch":
          return false;
        default: {
          const exhaustive: never = type;
          throw new Error(`unreachable FetchErrorType: ${exhaustive}`);
        }
      }
    },
    guidance(): string {
      return GUIDANCE[type];
    },
  });
}
