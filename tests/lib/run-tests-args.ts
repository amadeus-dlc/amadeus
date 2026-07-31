// Argument parsing seam for tests/run-tests.ts.
//
// tests/run-tests.ts is an executable script: importing it runs a whole test
// session, so its argv handling cannot be exercised in-process from a test.
// This module owns the pure part of that handling — the level/profile/modifier
// decode — and takes its process-terminating effects as an injected `io`, the
// same seam shape tests/lib/run-tests-totals.ts uses for the totals block.
// The runner keeps `usage()` (whose text tests/smoke/t05 pins) and supplies the
// stderr/stdout writes and exit codes through `io`.

export type Level = "smoke" | "unit" | "integration" | "e2e" | "perf";

export interface ParsedArgs {
  runSmoke: boolean;
  runUnit: boolean;
  runIntegration: boolean;
  runE2e: boolean;
  runPerf: boolean;
  coverage: boolean;
  coverageDir: string;
  verbose: boolean;
  debug: boolean;
  filter: string;
  parallel: number;
  fullProfile: boolean;
}

/** The process-terminating half of argv handling, injected by the caller. */
export interface ParseArgsIo {
  /** Value of `--parallel` when the flag is absent. */
  readonly defaultParallel: number;
  /** Print `message` followed by the usage block to stderr and exit 1. */
  failUsage(message: string): never;
  /** Print `message` to stderr and exit with `code`. */
  fail(message: string, code: number): never;
  /** Print the usage block to stdout and exit 0. */
  help(): never;
}

export function parseArgs(argv: string[], io: ParseArgsIo): ParsedArgs {
  const out: ParsedArgs = {
    runSmoke: false,
    runUnit: false,
    runIntegration: false,
    runE2e: false,
    runPerf: false,
    coverage: false,
    coverageDir: "coverage",
    verbose: false,
    debug: false,
    filter: "",
    parallel: io.defaultParallel,
    fullProfile: false,
  };
  let levelSelected = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--smoke":
        out.runSmoke = true;
        levelSelected = true;
        break;
      case "--unit":
        out.runUnit = true;
        levelSelected = true;
        break;
      case "--integration":
        out.runIntegration = true;
        levelSelected = true;
        break;
      case "--e2e":
        out.runE2e = true;
        levelSelected = true;
        break;
      case "--perf":
        out.runPerf = true;
        levelSelected = true;
        break;
      case "--ci":
        out.runSmoke = true;
        out.runUnit = true;
        out.runIntegration = true;
        levelSelected = true;
        break;
      case "--release":
      case "--all":
        out.runSmoke = true;
        out.runUnit = true;
        out.runIntegration = true;
        out.runE2e = true;
        out.runPerf = true;
        out.fullProfile = true;
        levelSelected = true;
        break;
      case "--coverage":
        out.coverage = true;
        break;
      case "--coverage-dir": {
        const value = argv[++i] ?? "";
        if (!value) io.failUsage("--coverage-dir requires a directory");
        out.coverageDir = value;
        break;
      }
      case "--verbose":
        out.verbose = true;
        break;
      case "--debug":
        out.debug = true;
        out.verbose = true;
        break;
      case "--filter": {
        const value = argv[++i] ?? "";
        out.filter = value;
        break;
      }
      case "--parallel":
      case "-P": {
        const value = argv[++i] ?? "";
        if (!/^[1-9][0-9]*$/.test(value)) {
          io.fail(
            `ERROR: --parallel requires a positive integer (got: '${value || "<missing>"}')\n`,
            2,
          );
        }
        out.parallel = Number(value);
        break;
      }
      case "--help":
      case "-h":
        io.help();
        break;
      default:
        io.failUsage(`Unknown flag: ${arg}`);
    }
  }

  if (!levelSelected) {
    out.runSmoke = true;
    out.runUnit = true;
    out.runIntegration = true;
  }
  return out;
}
