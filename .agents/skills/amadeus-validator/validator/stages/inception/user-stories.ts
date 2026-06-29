import { type PhaseValidationContext } from "../../phases/types";

export function checkInceptionUserStoriesStage(
  context: PhaseValidationContext,
  input: { inceptionBase: string },
): void {
  const spec = context.indexSpecs["user-stories.md"];
  const path = `${input.inceptionBase}/user-stories.md`;
  if (spec && context.isFile(path)) context.checkOptionalIndex(path, spec);
}
