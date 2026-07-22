import type { BlindState } from "./provenance.ts";

export interface CommandProof {
  ledgerHead?: string | null;
  actualInputManifestIdentity?: string;
  publicInputHash?: string;
  forbiddenMatchCount?: number;
  frozenEventId?: string;
  skeletonEvidenceIdentity?: string;
  promotionLedgerHead?: string;
}

export interface ProofError { kind: "ProofError"; message: string }
export type PolicyCommandKind = "start" | "freeze" | "reveal" | "record-skeleton" | "request-promotion";

export function validateCommandProof(kind: PolicyCommandKind, state: BlindState, proof: CommandProof, arm?: "tla" | "ts", ledgerHead?: string | null): { ok: true } | { ok: false; error: ProofError } {
  const fail = (message: string) => ({ ok: false as const, error: { kind: "ProofError" as const, message } });
  if (!("ledgerHead" in proof) || proof.ledgerHead !== ledgerHead) return fail("proof must bind the current ledger head");
  if (kind === "start" || kind === "freeze") {
    const allowedState = kind === "start" ? state === "READY_FOR_T_AUTHORING" || state === "SKELETON_PASSED" : state === "T_AUTHORING" || state === "S_AUTHORING";
    if (!allowedState) return fail(`${kind} is not allowed from ${state}`);
    const expectedArm = state === "READY_FOR_T_AUTHORING" || state === "T_AUTHORING" ? "tla" : "ts";
    if (arm !== expectedArm) return fail(`${kind} must target Arm ${expectedArm.toUpperCase()} from ${state}`);
    if (!proof.publicInputHash || !/^[0-9a-f]{64}$/.test(proof.publicInputHash) || proof.actualInputManifestIdentity !== proof.publicInputHash || proof.forbiddenMatchCount !== 0) return fail("validated actual-input manifest and zero forbidden matches required");
  }
  if (kind === "reveal" && (state !== "T_FROZEN" || !proof.frozenEventId)) return fail("T freeze receipt required");
  if (kind === "record-skeleton" && (state !== "SKELETON_REVEALED" || !proof.skeletonEvidenceIdentity || !/^[0-9a-f]{64}$/.test(proof.skeletonEvidenceIdentity))) return fail("skeleton evidence required");
  if (kind === "request-promotion" && (state !== "S_FROZEN" || !proof.promotionLedgerHead)) return fail("derived promotion permission required");
  return { ok: true };
}

export class ProofPolicyRegistry {
  readonly kinds = ["start", "freeze", "reveal", "record-skeleton", "request-promotion"] as const;
  constructor(kinds: readonly PolicyCommandKind[] = ["start", "freeze", "reveal", "record-skeleton", "request-promotion"]) {
    if (kinds.length !== this.kinds.length || new Set(kinds).size !== this.kinds.length || this.kinds.some((kind) => !kinds.includes(kind))) throw new Error("proof policy registry must contain the exact command-specific set");
  }
}
