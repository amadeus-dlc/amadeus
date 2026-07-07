import { join } from "node:path";
import { ACTIVE_SPACE_MEMORY_SHELL, harnessEngineDir, harnessToolsDir } from "./harness-paths.ts";
import type { VerificationCheck, VerificationResult } from "./apply-types.ts";
import type { VerifyInstallationInput } from "./manifest-builder.ts";

function check(name: string, passed: boolean, reason?: string): VerificationCheck {
  return passed ? { name, status: "passed" } : { name, status: "failed", reason };
}

export async function verifyInstallation(input: VerifyInstallationInput): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];

  for (const file of input.manifest.files) {
    if (!file.required) {
      continue;
    }
    const absolutePath = join(input.target, file.path);
    const exists = await input.files.exists(absolutePath);
    checks.push(check(`manifest file present: ${file.path}`, exists, exists ? undefined : "missing"));
  }

  const engineDir = join(input.target, harnessEngineDir(input.harness));
  const toolsDir = join(input.target, harnessToolsDir(input.harness));
  const memoryShell = join(input.target, ACTIVE_SPACE_MEMORY_SHELL);

  checks.push(check("harness directory present", await input.files.exists(engineDir), "missing"));
  checks.push(check("tools directory present", await input.files.exists(toolsDir), "missing"));
  checks.push(check("active-space memory shell present", await input.files.exists(memoryShell), "missing"));

  // Fresh install tolerates absent runtime state/intent; no failing checks are added for those paths.
  const failed = checks.filter((entry) => entry.status === "failed");
  if (failed.length > 0) {
    return { ok: false, checks };
  }
  return { ok: true, checks };
}
