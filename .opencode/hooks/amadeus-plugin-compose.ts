// SessionStart hook: auto-compose opted-in plugins into the host (C4 claude face,
// U2). A thin wrapper over the amadeus-plugin CLI — it re-implements NO
// composition logic (BR-U2-1). Registered via the canonical claude hook renderer
// (renderClaudeHookCommand) so it is a real .claude/hooks/*.ts file, on parity
// with the other framework hooks (t132/t231/doctor). Any failure is a single
// stderr warning and a zero exit so the session is never blocked
// (BR-U2-4 fail-loud/continue).
import { writeSync } from "node:fs";
import { readHookStdin, resolveProjectDirFromHook } from "../tools/amadeus-lib.ts";
import { initProcessObservability } from "../tools/amadeus-observability.ts";
import { handlePluginCli, pluginHostRootFromHook } from "../tools/amadeus-plugin.ts";

// Drain stdin first: this hook has no use for the payload, but its `cwd` is the
// top rung of project-dir resolution (#1482). The composed host root is the
// HARNESS dir under that project dir (#1591 ruling B) — the same root the
// engine reads plugin stages back from.
const hookStdin = await readHookStdin();
const hostRoot = pluginHostRootFromHook(import.meta.url, hookStdin.cwd);

// Telemetry process span (opt-in; no-op unless observability.enabled). The
// span keys off the PROJECT dir — hostRoot is the harness dir under it, which
// is not where the telemetry buffer lives.
initProcessObservability(
  "hook:plugin-compose",
  resolveProjectDirFromHook(import.meta.url, hookStdin.cwd),
);

try {
  const code = handlePluginCli(["compose", "--if-stale", "--project-root", hostRoot]);
  if (code !== 0) {
    writeSync(
      2,
      `amadeus-plugin: auto-compose failed for ${hostRoot} (non-blocking); run \`amadeus-plugin.ts compose --project-root ${hostRoot}\` to retry\n`,
    );
  }
} catch (err) {
  writeSync(2, `amadeus-plugin: auto-compose error for ${hostRoot} (non-blocking): ${String(err)}\n`);
  process.exit(0);
}
process.exit(0);
