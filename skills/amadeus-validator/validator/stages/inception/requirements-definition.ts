import { type PhaseValidationContext } from "../../phases/types";

export function checkInceptionRequirementsDefinitionStage(
  context: PhaseValidationContext,
  input: { inceptionBase: string; state: Record<string, any> },
): void {
  context.checkRequirements(`${input.inceptionBase}/requirements.md`);
  context.checkAcceptance(`${input.inceptionBase}/acceptance.md`, `${input.inceptionBase}/requirements.md`);
  context.checkCodebaseAnalysis(input.inceptionBase, input.state);
}
