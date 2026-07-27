// SessionStart hook: auto-compose opted-in plugins into the host (C4 claude face,
// U2). A thin wrapper over the amadeus-plugin CLI — it re-implements NO
// composition logic (BR-U2-1). Registered via the canonical claude hook renderer
// (renderClaudeHookCommand) so it is a real .claude/hooks/*.ts file, on parity
// with the other framework hooks (t132/t231/doctor). Any failure is a single
// stderr warning and a zero exit so the session is never blocked
// (BR-U2-4 fail-loud/continue).
import { readHookStdin, resolveProjectDirFromHook } from "../tools/amadeus-lib.ts";
import { handlePluginCli } from "../tools/amadeus-plugin.ts";

// Drain stdin first: this hook has no use for the payload, but its `cwd` is the
// top rung of project-dir resolution (#1482).
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);
try {
  const code = handlePluginCli(["compose", "--if-stale", "--project-root", projectDir]);
  if (code !== 0) {
    console.error("amadeus-plugin: auto-compose failed (non-blocking); run `amadeus-plugin.ts compose` to retry");
  }
} catch (err) {
  console.error(`amadeus-plugin: auto-compose error (non-blocking): ${String(err)}`);
}
process.exit(0);
