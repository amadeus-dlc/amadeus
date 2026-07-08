import { HarnessName } from "../domain/harness.ts";
import type { InstallInputs, ParsedCommand } from "../domain/command.ts";
import type { TtyIO } from "../ports/tty.ts";
import { Result } from "../shared/result.ts";

// US-A2/BR-I17/BR-I18: only asks for fields the caller has already determined
// are missing, then confirms the full selection before returning. Rejecting
// the confirmation is an explicit abort, not a state that InstallInputs ever
// represents (workflow 3: "確認拒否時は err を返す")．
export async function runWizard(
  parsed: ParsedCommand,
  missing: readonly ("harness" | "target")[],
  tty: TtyIO,
): Promise<Result<InstallInputs, "wizard-aborted">> {
  let harness = parsed.harness;
  if (missing.includes("harness")) {
    const selected = await tty.select("Select a harness to install", HarnessName.all);
    const parsedHarness = HarnessName.parse(selected);
    // tty.select can only return one of the offered HarnessName.all values,
    // so this branch is unreachable in practice; it avoids an unsafe cast.
    harness = parsedHarness.type === "ok" ? parsedHarness.value : parsed.harness;
  }

  // BR-I04: cwd is only ever the default in the interactive wizard path.
  let target = parsed.target;
  if (missing.includes("target")) {
    target = await tty.input("Install target directory", process.cwd());
  }

  if (harness === null || target === null) {
    return Result.err("wizard-aborted");
  }

  const confirmed = await tty.confirm(`Install ${harness} into ${target}?`);
  if (!confirmed) {
    return Result.err("wizard-aborted");
  }

  return Result.ok(Object.freeze({ harness, target }));
}
