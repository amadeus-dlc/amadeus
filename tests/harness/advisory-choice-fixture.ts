// Shared test fixture for recording a run-now advisory choice against the
// first pending advisory in a project's choice store. The audit plumbing
// (DECISION_RECORDED, a fresh HUMAN_TURN, the event-identity hash) mirrors what
// the engine requires from a real human turn, so tests exercising declared
// advisories do not each re-implement the provenance dance.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  advisoryChoicePresentationFields,
  choiceFromExactPrompt,
  recordAdvisoryChoice,
  type AdvisoryChoiceStore,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import { auditFilePath, auditShardName, docsRoot, findAllEvents } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { plantV1AuditRow } from "./v1-audit-fixture.ts";

export const ADVISORY_CHOICE_STORE_FILE = ".amadeus-advisory-choice.json";

/** Record a run-now choice for the first pending advisory of `projectDir`. */
export function chooseRunNow(projectDir: string): void {
  const store = JSON.parse(
    readFileSync(join(docsRoot(projectDir), ADVISORY_CHOICE_STORE_FILE), "utf-8"),
  ) as AdvisoryChoiceStore;
  const pending = store.pending[0];
  if (pending === undefined) throw new Error("no pending advisory to choose for");
  const fields = advisoryChoicePresentationFields(projectDir, pending.identity.checkpoint, [
    pending.identity.advisoryInstance,
  ]);
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
  const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1);
  if (event === undefined) throw new Error("no HUMAN_TURN was planted");
  const choice = choiceFromExactPrompt("run-now");
  if (choice === null) throw new Error("run-now did not classify");
  const outcome = recordAdvisoryChoice(projectDir, choice, {
    kind: "human-turn",
    shard: auditShardName(projectDir),
    timestamp: planted.timestamp,
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  });
  if (outcome.kind === "refused") throw new Error(`the advisory choice was not recorded: ${outcome.reason}`);
}
