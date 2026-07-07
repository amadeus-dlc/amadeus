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

export type SetupError = {
  code:
    | "apply-declined"
    | "apply-failed"
    | "archive-fetch-failed"
    | "archive-invalid"
    | "bun-required"
    | "distribution-metadata-invalid"
    | "downstream-not-implemented"
    | "duplicate-harness"
    | "harness-dist-missing"
    | "manifest-write-failed"
    | "missing-option-value"
    | "multiple-commands"
    | "no-stable-version"
    | "not-implemented-in-this-slice"
    | "plan-no-write"
    | "tag-list-failed"
    | "target-detection-failed"
    | "target-harness-mismatch"
    | "target-required"
    | "unknown-command"
    | "unknown-option"
    | "unsupported-command"
    | "unsupported-harness"
    | "unexpected-error"
    | "verification-failed"
    | "version-not-found";
  message: string;
  noFilesModified: boolean;
  nextAction: string;
  details?: Record<string, string>;
};

export type SetupExitCode = 0 | 1 | 2;

export type EntrypointResult = {
  code: SetupExitCode;
  stdout: string;
  stderr: string;
};
