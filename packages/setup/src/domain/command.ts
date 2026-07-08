import { parseArgs } from "node:util";
import { HarnessName } from "./harness.ts";
import type { VersionError } from "./semver.ts";
import { VersionSpec } from "./version-spec.ts";
import { Result } from "../shared/result.ts";

export type UsageError =
  | { readonly type: "unknown-subcommand"; readonly raw: string }
  | { readonly type: "unknown-flag"; readonly raw: string }
  | { readonly type: "invalid-harness"; readonly raw: string }
  | { readonly type: "multiple-harnesses"; readonly raws: readonly string[] }
  | { readonly type: "missing-required"; readonly fields: readonly string[] }
  | { readonly type: "invalid-version"; readonly cause: VersionError };

export namespace UsageError {
  export function unknownSubcommand(raw: string): UsageError {
    return Object.freeze({ type: "unknown-subcommand", raw });
  }
  export function unknownFlag(raw: string): UsageError {
    return Object.freeze({ type: "unknown-flag", raw });
  }
  export function invalidHarness(raw: string): UsageError {
    return Object.freeze({ type: "invalid-harness", raw });
  }
  export function multipleHarnesses(raws: readonly string[]): UsageError {
    return Object.freeze({ type: "multiple-harnesses", raws });
  }
  export function missingRequired(fields: readonly string[]): UsageError {
    return Object.freeze({ type: "missing-required", fields });
  }
  export function invalidVersion(cause: VersionError): UsageError {
    return Object.freeze({ type: "invalid-version", cause });
  }
}

Object.freeze(UsageError);

export type ParsedCommand = {
  readonly subcommand: "install" | "upgrade" | "help";
  readonly harness: HarnessName | null;
  readonly target: string | null;
  readonly version: VersionSpec;
  readonly yes: boolean;
  readonly force: boolean;
  isNonInteractive(stdinIsTty: boolean): boolean;
  missingRequiredFor(mode: "interactive" | "non-interactive"): readonly ("harness" | "target")[];
};

type ParsedCommandState = {
  readonly subcommand: "install" | "upgrade" | "help";
  readonly harness: HarnessName | null;
  readonly target: string | null;
  readonly version: VersionSpec;
  readonly yes: boolean;
  readonly force: boolean;
};

// Closure-backed constructor (functional-domain-modeling-ts factory pattern);
// kept private to this module since ParsedCommand.parse is the only entry
// point the CLI Contract exposes for building one.
function createParsedCommand(state: ParsedCommandState): ParsedCommand {
  return Object.freeze({
    ...state,
    isNonInteractive(stdinIsTty: boolean): boolean {
      return state.yes || !stdinIsTty;
    },
    // BR-I04: cwd defaulting for a missing target is a wizard-only concern
    // (interactive mode); both modes report the same "which fields are
    // still null" set here, and the caller decides what to do with it.
    missingRequiredFor(_mode: "interactive" | "non-interactive"): readonly ("harness" | "target")[] {
      const missing: ("harness" | "target")[] = [];
      if (state.harness === null) missing.push("harness");
      if (state.target === null) missing.push("target");
      return missing;
    },
  });
}

export namespace ParsedCommand {
  // BR-I01: no subcommand => help, install/upgrade are never run implicitly.
  export function parse(argv: readonly string[]): Result<ParsedCommand, UsageError> {
    const [rawSubcommand, ...rest] = argv;
    if (rawSubcommand === undefined) {
      return Result.ok(
        createParsedCommand({
          subcommand: "help",
          harness: null,
          target: null,
          version: VersionSpec.latest(),
          yes: false,
          force: false,
        }),
      );
    }
    if (rawSubcommand !== "install" && rawSubcommand !== "upgrade") {
      return Result.err(UsageError.unknownSubcommand(rawSubcommand));
    }

    let values: { harness?: string[]; target?: string; version?: string; yes?: boolean; force?: boolean };
    try {
      const parsed = parseArgs({
        args: rest,
        options: {
          harness: { type: "string", multiple: true },
          target: { type: "string" },
          version: { type: "string" },
          yes: { type: "boolean", default: false },
          force: { type: "boolean", default: false },
        },
        strict: true,
        allowPositionals: false,
      });
      values = parsed.values;
    } catch (cause) {
      return Result.err(UsageError.unknownFlag(describeParseArgsFailure(cause)));
    }

    const harnessRaws = values.harness ?? [];
    if (harnessRaws.length > 1) {
      return Result.err(UsageError.multipleHarnesses(harnessRaws));
    }
    let harness: HarnessName | null = null;
    if (harnessRaws.length === 1) {
      const parsedHarness = HarnessName.parse(harnessRaws[0] as string);
      if (parsedHarness.type === "err") return parsedHarness;
      harness = parsedHarness.value;
    }

    let version = VersionSpec.latest();
    if (values.version !== undefined) {
      const parsedVersion = VersionSpec.exact(values.version);
      if (parsedVersion.type === "err") return Result.err(UsageError.invalidVersion(parsedVersion.error));
      version = parsedVersion.value;
    }

    return Result.ok(
      createParsedCommand({
        subcommand: rawSubcommand,
        harness,
        target: values.target ?? null,
        version,
        yes: values.yes === true,
        force: values.force === true,
      }),
    );
  }
}

Object.freeze(ParsedCommand);

// node:util's parseArgs throws a plain Error (ERR_PARSE_ARGS_UNKNOWN_OPTION or
// similar) rather than returning a Result; this extracts the offending flag
// text from its message so UsageError.unknownFlag carries something useful.
function describeParseArgsFailure(cause: unknown): string {
  if (cause instanceof Error) {
    const match = /'(--?[^']+)'/.exec(cause.message);
    if (match) return match[1] as string;
    return cause.message;
  }
  return String(cause);
}

export type InstallInputs = {
  readonly harness: HarnessName;
  readonly target: string;
};

export namespace InstallInputs {
  // BR-I03: the non-interactive path only reaches here after
  // missingRequiredFor("non-interactive") has already been checked empty by
  // the caller; a violation is a programming defect, not a user-facing error.
  export function fromFlags(parsed: ParsedCommand): InstallInputs {
    if (parsed.harness === null || parsed.target === null) {
      throw new Error("InstallInputs.fromFlags requires harness and target to already be resolved (BR-I03 precondition)");
    }
    return Object.freeze({ harness: parsed.harness, target: parsed.target });
  }
}

Object.freeze(InstallInputs);
