import { executeSetupCommand, type SetupServiceDeps } from "../../../packages/setup/src/application/setup-service.ts";
import { renderSetupResult } from "../../../packages/setup/src/cli/setup-result-renderer.ts";
import type { EntrypointResult, SetupCommand } from "../../../packages/setup/src/domain/installer-contracts.ts";

export async function runRenderedSetupCommand(command: SetupCommand, deps: SetupServiceDeps = {}): Promise<EntrypointResult> {
  return renderSetupResult(await executeSetupCommand(command, deps));
}
