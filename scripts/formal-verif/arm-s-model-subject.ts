// arm-s-model-subject.ts — U6 ts-arm (B2): the healthy-baseline SubjectPort. The
// healthy election contract is a permitted blind freeze input (reuse inventory);
// this adapter wraps that module so the self-test can demonstrate NOT_DETECTED.
// At B3 the Coordinator injects a different subject module against the same port.
// Only the healthy `main` election model is referenced — never an injection
// branch, never Arm T / skeleton / fixture code.

import {
  Ballot,
  type Ballot as ModelBallot,
  type Election,
  resolveBallots,
  tally,
} from "../../packages/framework/core/tools/amadeus-election-model.ts";
import { classifyLate as modelClassifyLate } from "../../packages/framework/core/tools/amadeus-election-model.ts";
import { err, ok, type Result } from "./arm-s-result.ts";
import {
  type ArmBallot,
  parseSubmittedAt,
  type RawBallot,
  type SubjectElection,
  type SubjectPort,
  type SubjectTally,
} from "./arm-s-oracle.ts";

function toElection(subject: SubjectElection): Election {
  return {
    electionId: subject.electionId,
    kind: "vote",
    question: "q",
    choices: subject.choices.map((internalNo) => ({ internalNo, label: `c${internalNo}` })),
    voters: subject.voters,
  };
}

function toModel(ballot: ArmBallot, electionId: string): ModelBallot {
  const base = {
    electionId,
    voter: ballot.voter,
    voterKind: "member" as const,
    choiceInternalNo: ballot.choiceInternalNo,
    goa: ballot.goa as ModelBallot["goa"],
    reservation: null,
    rationale: null,
    submittedAt: ballot.submittedAt,
  };
  if (ballot.kind === "amend" && ballot.ref) {
    return { kind: "amend", ref: { electionId, voter: ballot.ref.voter, submittedAt: ballot.ref.submittedAt }, ...base };
  }
  return { kind: "original", ...base };
}

// Duplicate + unknown-ref decision, mirroring the healthy store's in-memory
// semantics (public contract fact): a second non-amend from a voter is a
// duplicate; an amend must reference an accepted ballot (voter + submittedAt).
function decideAppend(
  ledger: ArmBallot[],
  ballot: ArmBallot,
): Result<ArmBallot[], "duplicate" | "unknown-ref"> {
  const dup = ledger.some((b) => b.voter === ballot.voter && b.kind !== "amend" && ballot.kind !== "amend");
  if (dup) return err("duplicate");
  if (ballot.kind === "amend") {
    const found = ledger.some(
      (b) => b.ref === null && b.voter === ballot.ref?.voter && b.submittedAt === ballot.ref?.submittedAt,
    );
    if (!found) return err("unknown-ref");
  }
  return ok([...ledger, ballot]);
}

export function healthyBaselineSubject(electionId = "arm-s-election"): SubjectPort {
  return {
    validate(raw: RawBallot, subject: SubjectElection) {
      const ballotElectionId = raw.electionId ?? subject.electionId;
      const parsed = Ballot.parse(
        {
          electionId: ballotElectionId,
          voter: raw.voter,
          voterKind: "member",
          choiceInternalNo: raw.choiceInternalNo,
          goa: raw.goa,
          reservation: raw.reservation,
          rationale: null,
          submittedAt: raw.submittedAt,
          kind: raw.kind,
          ref: raw.ref ? { electionId: ballotElectionId, voter: raw.ref.voter, submittedAt: raw.ref.submittedAt } : undefined,
        },
        toElection(subject),
      );
      if (!parsed.ok) return { ok: false, error: parsed.error };
      const brand = parseSubmittedAt(parsed.value.submittedAt);
      if (!brand.ok) return { ok: false, error: "invalid-timestamp" };
      const ballot: ArmBallot = {
        voter: parsed.value.voter,
        choiceInternalNo: parsed.value.choiceInternalNo,
        goa: parsed.value.goa,
        kind: parsed.value.kind,
        ref: parsed.value.kind === "amend" ? { voter: parsed.value.ref.voter, submittedAt: parsed.value.ref.submittedAt } : null,
        submittedAt: brand.value,
      };
      return { ok: true, ballot };
    },
    append: decideAppend,
    resolve(ballots: ArmBallot[]) {
      const models = ballots.map((b) => toModel(b, electionId));
      const source = new Map<ModelBallot, ArmBallot>(models.map((m, i) => [m, ballots[i]!]));
      return resolveBallots(models).map((m) => source.get(m)!);
    },
    tally(choiceNos: number[], ballots: ArmBallot[]): SubjectTally {
      const election = toElection({ electionId, voters: [], choices: choiceNos });
      const result = tally(election, ballots.map((b) => toModel(b, electionId)));
      if (result.kind === "hold") return { kind: "hold", reason: result.reason };
      return { kind: "established", winner: result.winner.internalNo };
    },
    classifyLate(tallyAt: string, receivedAt: string, ballot: ArmBallot) {
      return modelClassifyLate(tallyAt, receivedAt, toModel(ballot, electionId)) !== null;
    },
  };
}
