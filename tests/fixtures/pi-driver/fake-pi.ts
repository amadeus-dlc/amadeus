#!/usr/bin/env bun

import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

if (process.argv.includes("--version")) {
  process.stdout.write("0.83.0\n");
  process.exit(0);
}

const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
lines.on("line", (line) => {
  const command = JSON.parse(line) as { type?: string; id?: string; message?: string };
  if (command.type === "abort") return;
  if (command.type !== "prompt" || typeof command.id !== "string" || typeof command.message !== "string") return;
  const countPath = command.message.startsWith("success:") ? command.message.slice("success:".length) : null;
  if (countPath) appendFileSync(countPath, "spawned\n");
  process.stdout.write(`${JSON.stringify({ id: command.id, type: "response", command: "prompt", success: true })}\n`);
  if (command.message === "hang" || command.message === "cancel") {
    process.on("SIGTERM", () => {});
    return;
  }
  const failed = command.message === "fail";
  const providerMismatch = command.message === "provider-check"
    && process.argv[process.argv.indexOf("--provider") + 1] !== "openai-codex";
  process.stdout.write(`${JSON.stringify({ type: "agent_start" })}\n`);
  process.stdout.write(`${JSON.stringify({
    type: "message_end",
    message: {
      role: "assistant",
      content: [
        { type: "thinking", thinking: "must not leak" },
        { type: "text", text: failed || providerMismatch ? "partial" : "OK" },
        { type: "toolCall", name: "bash", arguments: { command: "must not leak" } },
      ],
      stopReason: failed || providerMismatch ? "error" : "stop",
      ...(failed || providerMismatch ? { errorMessage: "provider failed" } : {}),
    },
  })}\n`);
  process.stdout.write(`${JSON.stringify({ type: "agent_end", willRetry: false })}\n`);
  process.stdout.write(`${JSON.stringify({ type: "agent_settled" })}\n`);
  setTimeout(() => process.exit(0), 10);
});
