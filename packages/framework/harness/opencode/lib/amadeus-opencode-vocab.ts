// amadeus-opencode-vocab.ts — the measured OpenCode plugin payload vocabulary.
//
// Measured 2026-07-26 against the installed opencode 1.18.3 runtime and the
// installed @opencode-ai/plugin / @opencode-ai/sdk type definitions:
//   - the runtime dispatches the prompt hook as
//     `trigger("chat.message",{sessionID:t.sessionID,agent:…,model:…,
//     messageID:…,variant:…},{message:O,parts:fe})` — so a STABLE host session
//     identity (`sessionID`) IS handed to the plugin;
//   - `PluginInput` carries `directory` and `worktree` (absolute paths), so the
//     project dir needs no path heuristics;
//   - `TextPart` is `{type:"text";text:string;synthetic?:boolean}` — the
//     runtime stamps `synthetic:!0` on the text parts it injects itself.
//
// Extracted as an importable module outside `.opencode/plugin/` so OpenCode
// does not execute these helper exports as plugins, and the mapping logic stays
// drivable in-process by bun --coverage — a plugin module loaded by the
// OpenCode host is invisible to it
// (cid:code-generation:bun-coverage-spawn-blindspot).

/** The absolute project dir OpenCode hands the plugin, or null when neither
 *  field is a usable path. `worktree` wins: it is the repo root the session
 *  operates on, while `directory` may be a nested cwd. */
export function opencodeProjectDir(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return null;
  const source = input as Record<string, unknown>;
  for (const field of ["worktree", "directory"] as const) {
    const value = source[field];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

/**
 * The human-authored prompt text of a `chat.message` payload, or null when the
 * message carries no human text. Synthetic text parts (the runtime's own
 * injections, marked `synthetic: true`) are dropped: they are machine turns and
 * must never contribute presence.
 */
export function opencodePromptText(parts: unknown): string | null {
  if (!Array.isArray(parts)) return null;
  const texts: string[] = [];
  for (const part of parts) {
    if (typeof part !== "object" || part === null) continue;
    const source = part as Record<string, unknown>;
    if (source.type !== "text") continue;
    if (source.synthetic === true) continue;
    if (typeof source.text !== "string" || source.text.length === 0) continue;
    texts.push(source.text);
  }
  return texts.length === 0 ? null : texts.join("\n");
}
