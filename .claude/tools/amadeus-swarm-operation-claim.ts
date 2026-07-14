// Shared claim guard for referee-owned merge primitives.

import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import {
  digestValue,
  hasExactKeys,
  isRecord,
  nonEmptyString,
} from "./amadeus-swarm-canonical.ts";
import { recordDir } from "./amadeus-lib.ts";

type OperationKind = "metadata-merge" | "code-merge";

type OperationClaim = Readonly<{
  schemaVersion: 1;
  finalizeInvocationId: string;
  finalizeRequestDigest: string;
  ownerPid: number;
  ownerStartTokenHash: string;
  fencingToken: number;
  expiresAt: string;
  status: "active" | "terminal";
  claimDigest: string;
}>;

const OPERATION_CLAIM_KEYS = Object.freeze([
  "schemaVersion",
  "finalizeInvocationId",
  "finalizeRequestDigest",
  "ownerPid",
  "ownerStartTokenHash",
  "fencingToken",
  "expiresAt",
  "status",
  "claimDigest",
]);

function operationClaimFieldsAreValid(value: Record<string, unknown>): boolean {
  return (
    value.schemaVersion === 1 &&
    nonEmptyString(value.finalizeInvocationId) &&
    nonEmptyString(value.finalizeRequestDigest) &&
    Number.isInteger(value.ownerPid) &&
    Number(value.ownerPid) > 0 &&
    nonEmptyString(value.ownerStartTokenHash) &&
    Number.isInteger(value.fencingToken) &&
    Number(value.fencingToken) > 0 &&
    nonEmptyString(value.expiresAt) &&
    (value.status === "active" || value.status === "terminal") &&
    nonEmptyString(value.claimDigest)
  );
}

function parseOperationClaim(value: unknown): OperationClaim | null {
  if (!isRecord(value) || !hasExactKeys(value, OPERATION_CLAIM_KEYS)) return null;
  if (!operationClaimFieldsAreValid(value)) return null;
  const { claimDigest, ...semantic } = value;
  if (digestValue(semantic) !== claimDigest) return null;
  return Object.freeze(value) as OperationClaim;
}

export function finalizeOperationId(
  finalizeInvocationId: string,
  unit: string,
  operation: OperationKind,
): string {
  return digestValue({ invocation: finalizeInvocationId, unit, operation });
}

export function validateFinalizeOperationClaim(input: Readonly<{
  projectDir: string;
  claimPath: string;
  operationId: string;
  finalizeRequestDigest?: string;
  fencingToken: number;
  unit: string;
  operation: OperationKind;
  intent?: string;
  space?: string;
  now?: Date;
}>): boolean {
  const record = recordDir(input.projectDir, input.intent, input.space);
  if (!record) return false;
  const allowedRoot = `${resolve(record, ".amadeus-swarm-referee")}${sep}`;
  const claimPath = resolve(input.claimPath);
  if (!claimPath.startsWith(allowedRoot)) return false;
  try {
    const claim = parseOperationClaim(JSON.parse(readFileSync(claimPath, "utf-8")));
    if (!claim) return false;
    return (
      claim.status === "active" &&
      (input.finalizeRequestDigest === undefined ||
        claim.finalizeRequestDigest === input.finalizeRequestDigest) &&
      claim.fencingToken === input.fencingToken &&
      Date.parse(claim.expiresAt) > (input.now ?? new Date()).getTime() &&
      input.operationId === finalizeOperationId(claim.finalizeInvocationId, input.unit, input.operation)
    );
  } catch {
    return false;
  }
}
