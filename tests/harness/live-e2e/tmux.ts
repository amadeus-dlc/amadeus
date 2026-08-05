import { spawnSync } from "node:child_process";

/**
 * Run-private tmux mechanics shared by every rendered-TUI adapter. The port
 * only executes what the caller names: socket selection stays with the adapter
 * so no default-server discovery can happen here.
 */

export const MAX_PANE_BYTES = 1_048_576;
export const MAX_PANE_LINES = 16_384;
export const MAX_PANE_LINE_BYTES = 65_536;

export interface TmuxCommandResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface TmuxCommandOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface TmuxCommandPort {
  run(args: readonly string[], options?: TmuxCommandOptions): TmuxCommandResult;
}

export class SpawnSyncTmuxCommandPort implements TmuxCommandPort {
  readonly #tmuxBin: string;

  constructor(tmuxBin: string) {
    this.#tmuxBin = tmuxBin;
  }

  run(args: readonly string[], options: TmuxCommandOptions = {}): TmuxCommandResult {
    const result = spawnSync(this.#tmuxBin, [...args], {
      cwd: options.cwd,
      env: options.env,
      encoding: "utf8",
      maxBuffer: MAX_PANE_BYTES + 1,
    });
    return {
      exitCode: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? String(result.error ?? ""),
    };
  }
}

export function commandFailed(result: TmuxCommandResult): boolean {
  return result.exitCode !== 0;
}

/** A kill against a server that is already gone is a closed resource, not a failure. */
export function absentPrivateServer(result: TmuxCommandResult): boolean {
  const diagnostic = `${result.stdout}\n${result.stderr}`;
  return /no server running|can't find session|no sessions/i.test(diagnostic);
}

export function paneLimitIssue(pane: string): string | null {
  if (Buffer.byteLength(pane) > MAX_PANE_BYTES) return "pane exceeded byte limit";
  const lines = pane.split("\n");
  if (lines.length > MAX_PANE_LINES) return "pane exceeded line limit";
  return lines.some((line) => Buffer.byteLength(line) > MAX_PANE_LINE_BYTES)
    ? "pane exceeded single-line limit"
    : null;
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
