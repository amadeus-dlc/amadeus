import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import type { ApplyDecision } from "../domain/apply-types.ts";
import type { FileOperationPlan } from "../domain/plan-types.ts";
import type { PromptPort } from "../ports/target-state.ts";

function parseYesNo(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === "y" || normalized === "yes";
}

export function createInteractivePromptPort(stdinIsTTY: boolean): PromptPort | undefined {
  if (!stdinIsTTY) {
    return undefined;
  }

  const rl = readline.createInterface({ input, output });

  return {
    async chooseHarness(request) {
      const options = request.candidates.map((candidate, index) => `${index + 1}. ${candidate}`).join("\n");
      const answer = await rl.question(
        `Target ${request.targetPath} matches multiple harness layouts:\n${options}\nChoose harness [1-${request.candidates.length}]: `,
      );
      const selected = Number.parseInt(answer.trim(), 10);
      if (!Number.isFinite(selected) || selected < 1 || selected > request.candidates.length) {
        return undefined;
      }
      return request.candidates[selected - 1];
    },

    async confirmApply(plan: FileOperationPlan): Promise<ApplyDecision> {
      const answer = await rl.question(
        `Apply ${plan.operations.length} planned operations to ${plan.target}? [y/N] `,
      );
      return parseYesNo(answer) ? { apply: true } : { apply: false, reason: "declined" };
    },
  };
}
