// amadeus-opencode-plugin.ts — the OpenCode prompt-hook mint site (AUTHORED
// harness file; the amadeus-*.ts modules it imports from ../tools are PACKAGED
// core, byte-shared with every other harness).
//
// OpenCode has no shell-command hook shell — its extension surface is JS
// plugins loaded from `.opencode/plugin/`. This plugin owns exactly one seam:
// it converts OpenCode's `chat.message` payload into the canonical
// HostSessionCapability union and hands it to the canonical mint. It performs
// NO authorization of its own and appends NO audit entry of its own.
//
// Measured 2026-07-26 on opencode 1.18.3: the runtime triggers
// `chat.message` with `{sessionID, agent, model, messageID, variant}` — a
// stable per-session identity — so a solo standing-grant fallback armed in THIS
// session mints its targeted owner HUMAN_TURN with the same semantics as
// Claude, Codex, Cursor and Kiro CLI. When the payload carries no usable
// identity the capability is `unavailable` and the ordinary untargeted
// HUMAN_TURN is appended instead; it is NEVER degraded onto a shared workspace
// key, the PID, or the active-intent cursor.
//
// Machine-injected turns must not scaffold a phantom HUMAN_TURN (#755/#811):
// the runtime's own text injections are dropped via the `synthetic` marker, and
// the surviving human text is classified through the SHARED lib predicate the
// core mint hook uses. The on-disk state self-gate prevents scaffolding outside
// workflows, and every failure stays advisory — a mint failure must never block
// the human's turn.

import { existsSync } from "node:fs";
import { isMachineInjectedTurnText, stateFilePath } from "../tools/amadeus-lib.ts";
import { hostSessionCapability, mintHumanPresence } from "../tools/amadeus-presence-reservation.ts";
import { opencodeProjectDir, opencodePromptText } from "../lib/amadeus-opencode-vocab.ts";

type ChatMessageInput = { sessionID?: unknown };
type ChatMessageOutput = { parts?: unknown };

export const amadeusOpencodePlugin = async (input: unknown) => ({
  "chat.message": async (message: ChatMessageInput, output: ChatMessageOutput): Promise<void> => {
    try {
      const projectDir = opencodeProjectDir(input);
      if (projectDir === null || !existsSync(stateFilePath(projectDir))) return;
      const prompt = opencodePromptText(output?.parts);
      if (prompt !== null && isMachineInjectedTurnText(prompt)) return;
      mintHumanPresence({
        projectDir,
        capability: hostSessionCapability(message?.sessionID),
      });
    } catch {
      // best-effort presence record — advisory
    }
  },
});

export default amadeusOpencodePlugin;
