import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateFrozenTlaModel } from "../../../scripts/formal-verif/tla-arm.ts";

type Mutation = "unknown-choice" | "invalid-timestamp" | "amend-budget" | "resolution";

function replaceOnce(source: string, before: string, after: string): string {
  const pieces = source.split(before);
  if (pieces.length !== 2) throw new Error("mutation anchor must occur exactly once");
  return `${pieces[0]}${after}${pieces[1]}`;
}

function mutate(source: string, mutation: Mutation): string {
  if (mutation === "unknown-choice") {
    return replaceOnce(
      source,
      'SubmitOriginal(v, c, s, g) ==\n  /\\ initialBudget[v] = 1\n  /\\ IF c = "UNKNOWN_CHOICE"\n     THEN Reject\n     ELSE IF s \\notin SubmittedAt',
      'SubmitOriginal(v, c, s, g) ==\n  /\\ initialBudget[v] = 1\n  /\\ IF c = "UNKNOWN_CHOICE"\n     THEN /\\ initialBudget\' = [initialBudget EXCEPT ![v] = 0]\n          /\\ UNCHANGED <<accepted, reexamRequired, amendBudget, holdBudget, holdMarkers, tally>>\n     ELSE IF s \\notin SubmittedAt',
    );
  }
  if (mutation === "invalid-timestamp") {
    return replaceOnce(
      source,
      '     ELSE IF s \\notin SubmittedAt\n     THEN Reject\n     ELSE /\\ initialBudget\' = [initialBudget EXCEPT ![v] = 0]',
      '     ELSE IF s \\notin SubmittedAt\n     THEN /\\ initialBudget\' = [initialBudget EXCEPT ![v] = 0]\n          /\\ UNCHANGED <<accepted, reexamRequired, amendBudget, holdBudget, holdMarkers, tally>>\n     ELSE /\\ initialBudget\' = [initialBudget EXCEPT ![v] = 0]',
    );
  }
  if (mutation === "amend-budget") {
    return replaceOnce(
      source,
      "     ELSE /\\ amendBudget' = [amendBudget EXCEPT ![v] = 0]",
      "     ELSE /\\ UNCHANGED amendBudget",
    );
  }
  return replaceOnce(
    source,
    "Resolve(prior, ballot) == IF prior = NoBallot \\/ Later(ballot, prior) THEN ballot ELSE prior",
    "Resolve(prior, ballot) == prior",
  );
}

const mutation = process.argv[2] as Mutation | undefined;
const outputDirectory = process.argv[3];
if (!mutation || !["unknown-choice", "invalid-timestamp", "amend-budget", "resolution"].includes(mutation) || !outputDirectory) {
  throw new Error("usage: tla-mutation-probe.ts <mutation> <output-directory>");
}
const model = generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) });
const moduleSource = mutate(model.moduleSource, mutation);
mkdirSync(outputDirectory, { recursive: true });
const modulePath = join(outputDirectory, "FormalElection.tla");
const cfgPath = join(outputDirectory, "FormalElection.cfg");
writeFileSync(modulePath, moduleSource);
writeFileSync(cfgPath, model.cfgSource);
console.log(JSON.stringify({
  mutation,
  modulePath,
  cfgPath,
  moduleSha256: createHash("sha256").update(moduleSource).digest("hex"),
}));
