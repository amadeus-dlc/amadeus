import { type PhaseValidationContext } from "../../phases/types";

export function checkInceptionUseCasesStage(
  context: PhaseValidationContext,
  input: { inceptionBase: string },
): void {
  const spec = context.indexSpecs["use-cases.md"];
  const path = `${input.inceptionBase}/use-cases.md`;
  if (spec && context.isFile(path)) context.checkOptionalIndex(path, spec);
}
