import { isPlainObject, UUID_V4_RE, UUID_V7_RE } from "./amadeus-lib.ts";

export type ApprovalAuthorityInput = {
  readonly operatingMode: string;
  readonly userInput?: string;
  readonly targetIntentId?: string;
  readonly presenceReservationId?: string;
};

export type ApprovalAuthority =
  | { readonly kind: "normal"; readonly userInput?: string }
  | {
      readonly kind: "targeted-human";
      readonly userInput: string;
      readonly targetIntentId: string;
      readonly reservationId: string;
    }
  | { readonly kind: "invalid"; readonly reason: string };

export function classifyApprovalAuthority(
  input: ApprovalAuthorityInput,
): ApprovalAuthority {
  const hasTarget = input.targetIntentId !== undefined;
  const hasReservation = input.presenceReservationId !== undefined;
  const hasUser = input.userInput !== undefined;
  if (hasTarget !== hasReservation) {
    return { kind: "invalid", reason: "partial authorization carrier" };
  }
  if (hasTarget) {
    if (
      !hasUser ||
      input.operatingMode !== "solo" ||
      !UUID_V7_RE.test(input.targetIntentId!) ||
      !UUID_V4_RE.test(input.presenceReservationId!)
    ) {
      return { kind: "invalid", reason: "malformed targeted human authority" };
    }
    return {
      kind: "targeted-human",
      userInput: input.userInput!,
      targetIntentId: input.targetIntentId!,
      reservationId: input.presenceReservationId!,
    };
  }
  return input.userInput === undefined
    ? { kind: "normal" }
    : { kind: "normal", userInput: input.userInput };
}

export type ApprovalProcessResult =
  | { readonly kind: "approved" }
  | { readonly kind: "protocol-error"; readonly detail: string }
  | { readonly kind: "fatal-error"; readonly detail: string };

export function parseApprovalProcessResult(
  result: { readonly exitCode: number; readonly stdout: string; readonly stderr: string },
): ApprovalProcessResult {
  if (result.exitCode !== 0) {
    return { kind: "fatal-error", detail: (result.stderr || result.stdout).trim() };
  }
  if (result.stderr.length !== 0) {
    return { kind: "protocol-error", detail: "approval process wrote stderr" };
  }
  if (!/^[^\r\n]+\n?$/.test(result.stdout)) {
    return { kind: "protocol-error", detail: "approval stdout must be one JSON line" };
  }
  let value: unknown;
  try {
    value = JSON.parse(result.stdout.trimEnd());
  } catch {
    return { kind: "protocol-error", detail: "approval stdout is not JSON" };
  }
  if (!isPlainObject(value) || value.kind !== "approved") {
    return { kind: "protocol-error", detail: "unknown approval JSON shape" };
  }
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "kind"
    ? { kind: "approved" }
    : { kind: "protocol-error", detail: "unknown approval JSON shape" };
}
