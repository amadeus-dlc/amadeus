export const SUPPORTED_HARNESSES = ["claude", "codex", "kiro", "kiro-ide"] as const;

export type Harness = (typeof SUPPORTED_HARNESSES)[number];
export type SetupCommandName = "install" | "upgrade";

export type SetupCommand = {
  command: SetupCommandName;
  harness?: Harness;
  target?: string;
  version?: string;
  yes: boolean;
  force: boolean;
};

export type HelpRequest = {
  reason: "explicit" | "no-command";
};

export type SetupError = {
  code:
    | "archive-fetch-failed"
    | "archive-invalid"
    | "bun-required"
    | "distribution-metadata-invalid"
    | "downstream-not-implemented"
    | "duplicate-harness"
    | "harness-dist-missing"
    | "missing-option-value"
    | "multiple-commands"
    | "no-stable-version"
    | "not-implemented-in-this-slice"
    | "tag-list-failed"
    | "target-detection-failed"
    | "target-harness-mismatch"
    | "target-required"
    | "unknown-command"
    | "unknown-option"
    | "unsupported-command"
    | "unsupported-harness"
    | "unexpected-error"
    | "version-not-found";
  message: string;
  noFilesModified: true;
  nextAction: string;
  details?: Record<string, string>;
};

export type ParseResult =
  | { ok: true; kind: "command"; command: SetupCommand }
  | { ok: true; kind: "help"; help: HelpRequest }
  | { ok: false; error: SetupError };

export type EntrypointResult = {
  code: number;
  stdout: string;
  stderr: string;
};
