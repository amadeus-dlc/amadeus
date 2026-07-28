// t-coverage-mechanism.test.ts — pins static mechanism-classifier contracts.
// Every fixture is synthetic so failures identify one provenance or syntax rule.

import { describe, expect, test } from "bun:test";

import {
  type ClaudeDependency,
  claudeDependenciesOf,
  type Mechanism,
  mechanismsOf,
} from "../gen-coverage-registry.ts";

function calleeForms(callee: string): string[] {
  return [
    `(${callee})`,
    `${callee}!`,
    `(${callee} as typeof ${callee})`,
    `(${callee} satisfies typeof ${callee})`,
    `(<typeof ${callee}>${callee})`,
  ];
}

type WrappedCalleeFixture = {
  label: string;
  callee: string;
  source: (wrapped: string) => string;
  expectedMechanisms: readonly Mechanism[];
  expectedDependencies?: readonly ClaudeDependency[];
};

function wrappedCalleeMismatches(
  fixtures: readonly WrappedCalleeFixture[],
): string[] {
  const mismatches: string[] = [];
  for (const fixture of fixtures) {
    for (const wrapped of calleeForms(fixture.callee)) {
      const source = fixture.source(wrapped);
      const mechanisms = mechanismsOf("t99.none.test.ts", source);
      const dependencies = claudeDependenciesOf("t99.none.test.ts", source);
      const expectedDependencies = fixture.expectedDependencies ?? [];
      if (
        mechanisms.join(",") !== fixture.expectedMechanisms.join(",") ||
        dependencies.join(",") !== expectedDependencies.join(",")
      ) {
        mismatches.push(
          `${fixture.label} via ${wrapped}: mechanisms {${mechanisms.join(
            ",",
          )}}, dependencies {${dependencies.join(",")}}`,
        );
      }
    }
  }
  return mismatches;
}

describe("mechanismsOf is statically body-classified (milestone 3)", () => {
  // (a) Known-answer fixtures — each a minimal in-test source string. The
  // filename argument is chosen to DISAGREE with the body so "body wins" is
  // unambiguous.
  test("driveAidlc() in a file NAMED .none derives sdk (body beats segment)", () => {
    const src = [
      "// covers: audit:STAGE_STARTED",
      'import { driveAidlc } from "../harness/sdk-drive.ts";',
      "test('x', async () => {",
      '  const r = await driveAidlc("/amadeus bugfix");',
      "  expect(r).toBeDefined();",
      "});",
    ].join("\n");
    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["sdk"]);
  });

  test("SDK detection requires a called canonical imported binding", () => {
    const alias = [
      'import { driveAidlc as drive } from "../harness/sdk-drive.ts";',
      'drive("/amadeus bugfix");',
    ].join("\n");
    const importOnly =
      'import { driveAidlc } from "../harness/sdk-drive.ts";';
    const sameNamedLocal = [
      "function driveAidlc() {}",
      "driveAidlc();",
    ].join("\n");
    const shadowed = [
      'import { driveAidlc } from "../harness/sdk-drive.ts";',
      "function invoke(driveAidlc: () => void) { driveAidlc(); }",
      "invoke(() => {});",
    ].join("\n");
    const wrongModule = [
      'import { driveAidlc } from "../fake/sdk-drive.ts";',
      "driveAidlc();",
    ].join("\n");
    const stringOnly = 'const mention = "driveAidlc(";';

    expect(mechanismsOf("t99.none.test.ts", alias)).toEqual(["sdk"]);
    expect(claudeDependenciesOf("t99.none.test.ts", alias)).toEqual(["sdk"]);
    for (
      const src of [
        importOnly,
        sameNamedLocal,
        shadowed,
        wrongModule,
        stringOnly,
      ]
    ) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
      expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual([]);
    }
  });

  test("SDK detection unwraps a canonical imported callee", () => {
    for (const callee of calleeForms("driveAidlc")) {
      const src = [
        'import { driveAidlc } from "../harness/sdk-drive.ts";',
        `${callee}("/amadeus bugfix");`,
      ].join("\n");
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["sdk"]);
      expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual(["sdk"]);
    }
  });

  test("escaped canonical module specifiers retain SDK and TUI identity", () => {
    const cases = [
      {
        source: [
          'import { driveAidlc } from "../harness/sdk\\x2ddrive.ts";',
          'driveAidlc("/amadeus bugfix");',
        ].join("\n"),
        mechanism: "sdk",
      },
      {
        source: [
          'import { runTuiDriver } from "../harness/tui\\x2dclient.ts";',
          "runTuiDriver([]);",
        ].join("\n"),
        mechanism: "tui",
      },
    ] as const;

    for (const { source, mechanism } of cases) {
      expect(mechanismsOf("t99.none.test.ts", source)).toEqual([mechanism]);
      expect(claudeDependenciesOf("t99.none.test.ts", source)).toEqual([
        mechanism,
      ]);
    }
  });

  test("classification is syntactic, not call-graph reachability analysis", () => {
    const unusedSdkCall = [
      'import { driveAidlc } from "../harness/sdk-drive.ts";',
      "function notRun() { driveAidlc('/amadeus bugfix'); }",
    ].join("\n");
    const unusedTuiCall = [
      'import { runTuiDriver } from "../harness/tui-client.ts";',
      "function notRun() { runTuiDriver(['capture']); }",
    ].join("\n");
    const unusedCliSpawn = [
      'import { spawnSync } from "node:child_process";',
      'import { amadeusToolTarget } from "../harness/cli-target.ts";',
      "function notRun(tool: string) {",
      '  spawnSync("bun", [amadeusToolTarget(tool)]);',
      "}",
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", unusedSdkCall)).toEqual(["sdk"]);
    expect(mechanismsOf("t99.none.test.ts", unusedTuiCall)).toEqual(["tui"]);
    expect(mechanismsOf("t99.none.test.ts", unusedCliSpawn)).toEqual(["cli"]);
  });

  test("a // comment containing /* above a real tool spawn still derives cli", () => {
    // TypeScript parses the leading "// …/*…" as comment trivia, so its embedded
    // block-comment opener never hides the executable spawn CallExpression below.
    // This fixture pins the narrower contract that comment contents cannot
    // suppress cli derivation.
    const src = [
      "// covers: subcommand:amadeus-state:show",
      'import { spawnSync } from "node:child_process";',
      "// matches tests/fixtures/**/*.md  (a glob with /* in a // comment)",
      "const BUN = process.execPath;",
      'const TOOL = "../../dist/claude/.claude/tools/amadeus-state.ts";',
      'test("x", () => {',
      '  const r = spawnSync(BUN, [TOOL, "show"], { encoding: "utf-8" });',
      "  expect(r.status).toBe(0);",
      "});",
    ].join("\n");
    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["cli"]);
  });

  test("a // inside a string literal (a URL) does NOT truncate the real spawn", () => {
    // The TypeScript AST keeps "//" inside the URL's StringLiteral instead of
    // treating it as comment trivia. The URL and spawn share one physical line,
    // with the URL first, so the classifier must still visit the spawnSync
    // CallExpression and derive cli.
    const src = [
      "// covers: subcommand:amadeus-state:show",
      'import { spawnSync } from "node:child_process";',
      "const BUN = process.execPath;",
      'const u = "https://example.com/amadeus"; const r = spawnSync(BUN, ["../../dist/claude/.claude/tools/amadeus-state.ts", "show"]);',
      "expect(r.status).toBe(0);",
    ].join("\n");
    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["cli"]);
  });

  test("a /* inside a string literal does NOT open a phantom block comment", () => {
    // The parser keeps "/*" and "*/" inside StringLiteral nodes, so a glob-like
    // value cannot turn the intervening spawn into comment trivia.
    const src = [
      "// covers: subcommand:amadeus-state:show",
      'import { spawnSync } from "node:child_process";',
      "const BUN = process.execPath;",
      'const pat = "glob /* not a comment";',
      'const TOOL = "../../dist/claude/.claude/tools/amadeus-state.ts";',
      '  const r = spawnSync(BUN, [TOOL, "show"], { encoding: "utf-8" });',
      'const close = "and */ still not a comment";',
      "expect(r.status).toBe(0);",
    ].join("\n");
    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["cli"]);
  });

  test("a non-Bun tool spawn stays none beside unrelated Bun tokens", () => {
    const nodeOnly = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "../../dist/claude/.claude/tools/amadeus-state.ts";',
      'spawnSync("node", [TOOL, "show"]);',
    ].join("\n");
    const unrelatedConstant = [
      nodeOnly,
      'const runtime = "bun";',
    ].join("\n");
    const unrelatedProbe = [
      nodeOnly,
      'spawnSync("bun", ["--version"]);',
    ].join("\n");

    for (const src of [nodeOnly, unrelatedConstant, unrelatedProbe]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("an amadeus path in Bun eval source is not a command target", () => {
    const src = [
      'const source = \'import "../../tools/amadeus-state.ts";\';',
      'Bun.spawn([process.execPath, "-e", source]);',
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
  });

  test("Bun array spawns bind the launcher and tool in one call", () => {
    const src = [
      'import { spawnSync } from "bun";',
      'const TOOL = "../../dist/claude/.claude/tools/amadeus-state.ts";',
      'spawnSync(["bun", TOOL, "show"]);',
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["cli"]);
  });

  test("CLI detection unwraps every canonical imported and global callee", () => {
    const positionalCases: WrappedCalleeFixture[] = [
      "spawn",
      "spawnSync",
      "execFileSync",
    ].map((callee) => ({
      label: `node:child_process ${callee}`,
      callee,
      source: (wrapped) =>
        [
          `import { ${callee} } from "node:child_process";`,
          `${wrapped}("bun", ["amadeus-state.ts"]);`,
        ].join("\n"),
      expectedMechanisms: ["cli"],
    }));
    const claudeCases: WrappedCalleeFixture[] = [
      "spawn",
      "spawnSync",
      "execFileSync",
    ].map((callee) => ({
      label: `node:child_process ${callee} for Claude print`,
      callee,
      source: (wrapped) =>
        [
          `import { ${callee} } from "node:child_process";`,
          `${wrapped}("claude", ["-p", "hello"]);`,
        ].join("\n"),
      expectedMechanisms: ["cli"],
      expectedDependencies: ["cli-claude"],
    }));
    const bunImportCases: WrappedCalleeFixture[] = [
      "spawn",
      "spawnSync",
    ].map((callee) => ({
      label: `bun import ${callee}`,
      callee,
      source: (wrapped) =>
        [
          `import { ${callee} } from "bun";`,
          `${wrapped}(["bun", "amadeus-state.ts"]);`,
        ].join("\n"),
      expectedMechanisms: ["cli"],
    }));
    const globalBunCases: WrappedCalleeFixture[] = [
      "Bun.spawn",
      "Bun.spawnSync",
    ].map((callee) => ({
      label: `global ${callee}`,
      callee,
      source: (wrapped) =>
        `${wrapped}(["bun", "amadeus-state.ts"]);`,
      expectedMechanisms: ["cli"],
    }));
    const cases: WrappedCalleeFixture[] = [
      ...positionalCases,
      ...claudeCases,
      ...bunImportCases,
      ...globalBunCases,
      {
        label: "node:path join",
        callee: "join",
        source: (wrapped) =>
          [
            'import { spawnSync } from "node:child_process";',
            'import { join } from "node:path";',
            `spawnSync("bun", [${wrapped}("/tmp", "amadeus-state.ts")]);`,
          ].join("\n"),
        expectedMechanisms: ["cli"],
      },
      {
        label: "amadeusToolTarget",
        callee: "amadeusToolTarget",
        source: (wrapped) =>
          [
            'import { spawnSync } from "node:child_process";',
            'import { amadeusToolTarget } from "../harness/cli-target.ts";',
            `spawnSync("bun", [${wrapped}("amadeus-state.ts")]);`,
          ].join("\n"),
        expectedMechanisms: ["cli"],
      },
    ];

    expect(wrappedCalleeMismatches(cases)).toEqual([]);
  });

  test("wrapped CLI lookalikes and wrong-module imports remain fail closed", () => {
    const cases: WrappedCalleeFixture[] = [
      {
        label: "local spawnSync",
        callee: "spawnSync",
        source: (wrapped) =>
          [
            "function spawnSync(_command: string, _args: string[]) {}",
            `${wrapped}("bun", ["amadeus-state.ts"]);`,
          ].join("\n"),
        expectedMechanisms: ["none"],
      },
      {
        label: "wrong-module spawnSync",
        callee: "spawnSync",
        source: (wrapped) =>
          [
            'import { spawnSync } from "./fake.ts";',
            `${wrapped}("bun", ["amadeus-state.ts"]);`,
          ].join("\n"),
        expectedMechanisms: ["none"],
      },
      {
        label: "wrong-module join",
        callee: "join",
        source: (wrapped) =>
          [
            'import { spawnSync } from "node:child_process";',
            'import { join } from "./fake.ts";',
            `spawnSync("bun", [${wrapped}("/tmp", "amadeus-state.ts")]);`,
          ].join("\n"),
        expectedMechanisms: ["none"],
      },
      {
        label: "wrong-module amadeusToolTarget",
        callee: "amadeusToolTarget",
        source: (wrapped) =>
          [
            'import { spawnSync } from "node:child_process";',
            'import { amadeusToolTarget } from "../fake/cli-target.ts";',
            `spawnSync("bun", [${wrapped}("amadeus-state.ts")]);`,
          ].join("\n"),
        expectedMechanisms: ["none"],
      },
      {
        label: "shadowed Bun.spawnSync",
        callee: "Bun.spawnSync",
        source: (wrapped) =>
          [
            "const Bun = { spawnSync(_command: string[]) {} };",
            `${wrapped}(["bun", "amadeus-state.ts"]);`,
          ].join("\n"),
        expectedMechanisms: ["none"],
      },
    ];

    expect(wrappedCalleeMismatches(cases)).toEqual([]);
  });

  test("Bun object spawns ignore unrelated property forms before cmd", () => {
    const src = [
      "const defaults = {};",
      "Bun.spawnSync({",
      "  ...defaults,",
      '  0: "ignored",',
      '  cmd: ["bun", "amadeus-state.ts"],',
      "});",
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["cli"]);
  });

  test("Bun object spawns fail closed on a later ambiguous cmd override", () => {
    const missingCmd = 'Bun.spawnSync({ cwd: "/tmp" });';
    const laterSpread = [
      'const replacement = { cmd: ["bun", "--version"] };',
      "Bun.spawnSync({",
      '  cmd: ["bun", "amadeus-state.ts"],',
      "  ...replacement,",
      "});",
    ].join("\n");
    const laterComputed = [
      "Bun.spawnSync({",
      '  cmd: ["bun", "amadeus-state.ts"],',
      '  ["cmd"]: ["bun", "--version"],',
      "});",
    ].join("\n");

    for (const src of [missingCmd, laterSpread, laterComputed]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("indirect wrapper targets require the canonical target marker", () => {
    const unmarkedWrapper = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "../../dist/claude/.claude/tools/amadeus-state.ts";',
      "function run(command: string, args: string[]) {",
      "  return spawnSync(command, args);",
      "}",
    ];
    const unmarkedBunCall = [
      ...unmarkedWrapper,
      'run("bun", [TOOL, "show"]);',
    ].join("\n");
    const crossedCalls = [
      ...unmarkedWrapper,
      'run("node", [TOOL, "show"]);',
      'run("bun", ["--version"]);',
    ].join("\n");
    const markedWrapper = [
      'import { spawnSync } from "node:child_process";',
      'import { amadeusToolTarget } from "../harness/cli-target.ts";',
      'const TOOL = "../../dist/claude/.claude/tools/amadeus-state.ts";',
      "function run(tool: string, args: string[]) {",
      '  return spawnSync("bun", [amadeusToolTarget(tool), ...args]);',
      "}",
      'run(TOOL, ["show"]);',
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", unmarkedBunCall)).toEqual(["none"]);
    expect(mechanismsOf("t99.none.test.ts", crossedCalls)).toEqual(["none"]);
    expect(mechanismsOf("t99.none.test.ts", markedWrapper)).toEqual(["cli"]);
  });

  test("the canonical target marker proves only imported indirect tool paths", () => {
    const marked = [
      'import { amadeusToolTarget as target } from "../harness/cli-target.ts";',
      'import { spawnSync } from "node:child_process";',
      'import { STATE } from "../harness/solo-gate-fixture.ts";',
      "spawnSync(process.execPath, [target(STATE), \"show\"]);",
    ].join("\n");
    const sameNamedLocal = [
      'import { spawnSync } from "node:child_process";',
      "const amadeusToolTarget = (path: string) => path;",
      'spawnSync(process.execPath, [amadeusToolTarget("helper.ts")]);',
    ].join("\n");
    const wrongModule = [
      'import { spawnSync } from "node:child_process";',
      'import { amadeusToolTarget } from "../fake/cli-target.ts";',
      'spawnSync(process.execPath, [amadeusToolTarget("amadeus-state.ts")]);',
    ].join("\n");
    const invalidStaticTarget = [
      'import { spawnSync } from "node:child_process";',
      'import { amadeusToolTarget } from "../harness/cli-target.ts";',
      'spawnSync(process.execPath, [amadeusToolTarget("helper.ts")]);',
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", marked)).toEqual(["cli"]);
    for (const src of [sameNamedLocal, wrongModule, invalidStaticTarget]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("spawn and Bun lookalikes do not satisfy subprocess provenance", () => {
    const localSpawn = [
      'const TOOL = "amadeus-state.ts";',
      "function spawnSync(_command: string, _args: string[]) {}",
      'spawnSync("bun", [TOOL]);',
    ].join("\n");
    const fakeImport = [
      'import { spawnSync } from "./fake.ts";',
      'spawnSync("bun", ["amadeus-state.ts"]);',
    ].join("\n");
    const malformedImport = [
      "import { spawnSync } from childProcess;",
      'spawnSync("bun", ["amadeus-state.ts"]);',
    ].join("\n");
    const localBun = [
      "const Bun = { spawnSync(_command: string[]) {} };",
      'Bun.spawnSync(["bun", "amadeus-state.ts"]);',
    ].join("\n");
    const localProcess = [
      'import { spawnSync } from "node:child_process";',
      'const process = { execPath: "bun" };',
      'spawnSync(process.execPath, ["amadeus-state.ts"]);',
    ].join("\n");

    for (
      const src of [
        localSpawn,
        fakeImport,
        malformedImport,
        localBun,
        localProcess,
      ]
    ) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("object and array selectors do not borrow an unrelated tool value", () => {
    const objectSelector = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      'const config = { tool: TOOL, version: "--version" };',
      'spawnSync("bun", [config.version]);',
    ].join("\n");
    const arraySelector = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      'const values = [TOOL, "--version"];',
      'spawnSync("bun", [values[1]]);',
    ].join("\n");

    for (const src of [objectSelector, arraySelector]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("unknown target expressions do not borrow non-result tool values", () => {
    const helperCall = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      "function first(a: string, _b: string) { return a; }",
      'spawnSync("bun", [first("--version", TOOL)]);',
    ].join("\n");
    const commaExpression = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      'spawnSync("bun", [(TOOL, "--version")]);',
    ].join("\n");
    const logicalExpression = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      'spawnSync("bun", [TOOL && "--version"]);',
    ].join("\n");

    for (const src of [helperCall, commaExpression, logicalExpression]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("static subprocess targets require an exact basename", () => {
    const nearMisses = [
      'spawnSync("bun", ["/tmp/not-amadeus-state.ts"]);',
      'spawnSync("bun", ["/tmp/amadeus-state.ts.bak"]);',
      'spawnSync("bash", ["/tmp/not-run-tests.sh"]);',
      'spawnSync("bash", ["/tmp/run-tests.sh.bak"]);',
    ];

    for (const command of nearMisses) {
      const src = [
        'import { spawnSync } from "node:child_process";',
        command,
      ].join("\n");
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("static path construction allows only canonical node:path join", () => {
    const canonicalJoin = [
      'import { spawnSync } from "node:child_process";',
      'import { join } from "node:path";',
      'spawnSync("bun", [join("/tmp", "amadeus-state.ts")]);',
    ].join("\n");
    const canonicalResolve = [
      'import { spawnSync } from "node:child_process";',
      'import { resolve } from "node:path";',
      'spawnSync("bun", [resolve("/tmp", "amadeus-state.ts")]);',
    ].join("\n");
    const localJoin = [
      'import { spawnSync } from "node:child_process";',
      "function join(...parts: string[]) { return parts.join('/'); }",
      'spawnSync("bun", [join("/tmp", "amadeus-state.ts")]);',
    ].join("\n");
    const emptyJoin = [
      'import { spawnSync } from "node:child_process";',
      'import { join } from "node:path";',
      'spawnSync("bun", [join()]);',
    ].join("\n");
    const cyclicJoin = [
      'import { spawnSync } from "node:child_process";',
      'import { join } from "node:path";',
      'const TOOL = join("/tmp", TOOL);',
      'spawnSync("bun", [TOOL]);',
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", canonicalJoin)).toEqual(["cli"]);
    expect(mechanismsOf("t99.none.test.ts", canonicalResolve)).toEqual(["none"]);
    expect(mechanismsOf("t99.none.test.ts", localJoin)).toEqual(["none"]);
    expect(mechanismsOf("t99.none.test.ts", emptyJoin)).toEqual(["none"]);
    expect(mechanismsOf("t99.none.test.ts", cyclicJoin)).toEqual(["none"]);
  });

  test("reassigned launcher and target variables fail closed", () => {
    const reassignedLauncher = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      'let runtime = "bun";',
      'runtime = "node";',
      'spawnSync(runtime, [TOOL]);',
    ].join("\n");
    const reassignedTarget = [
      'import { spawnSync } from "node:child_process";',
      'let target = "amadeus-state.ts";',
      'target = "helper.ts";',
      'spawnSync("bun", [target]);',
    ].join("\n");
    const reassignedParameter = [
      'import { spawnSync } from "node:child_process";',
      'const TOOL = "amadeus-state.ts";',
      'function run(runtime = "bun") {',
      '  runtime = "node";',
      '  spawnSync(runtime, [TOOL]);',
      '}',
      'run();',
    ].join("\n");

    for (
      const src of [
        reassignedLauncher,
        reassignedTarget,
        reassignedParameter,
      ]
    ) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
    }
  });

  test("Claude print mode requires an exact argv flag", () => {
    const promptMention = [
      'import { spawnSync } from "node:child_process";',
      'spawnSync("claude", ["explain the -p option"]);',
    ].join("\n");
    const printFlag = [
      'import { spawnSync } from "node:child_process";',
      'spawnSync("claude", ["-p", "hello"]);',
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", promptMention)).toEqual(["none"]);
    expect(claudeDependenciesOf("t99.none.test.ts", promptMention)).toEqual([]);
    expect(mechanismsOf("t99.none.test.ts", printFlag)).toEqual(["cli"]);
    expect(claudeDependenciesOf("t99.none.test.ts", printFlag)).toEqual([
      "cli-claude",
    ]);
  });

  test("a suffix-free file with a dotted descriptive slug seeds none (no throw)", () => {
    // Forward-compat for milestone 6 (suffix drop): once .none/.cli are gone, a test whose
    // basename carries a DOT in a descriptive slug (not a mechanism segment) must
    // fall back to none, never crash the generator. mechanismOfTestFile recognises
    // only real mechanism segments; any other trailing dot-segment seeds none.
    const src = '// covers: function:foo\ntest("x", () => { expect(1).toBe(1); });';
    expect(mechanismsOf("t200.scope-exclusion.test.ts", src)).toEqual(["none"]);
  });

  test("importing a tui-drive helper without spawning the driver does NOT derive tui", () => {
    // D-TUI-7: the AST classifier requires a CallExpression bound to the
    // canonical client import. An import-only helper therefore cannot register
    // tui, and the scan falls back to the filename segment (here: none).
    const src = [
      "// covers: function:gridHasMenu",
      'import { gridHasMenu } from "../harness/tui-drive.ts";',
      'test("x", () => {',
      "  expect(typeof gridHasMenu).toBe('function');",
      "});",
    ].join("\n");
    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
  });

  test("calling the canonical TUI client derives the tui mechanism", () => {
    const src = [
      "// covers: render-surface:statusline",
      'import { runTuiDriver } from "../harness/tui-client.ts";',
      'test("x", () => {',
      '  const result = runTuiDriver(["capture", "--session", "s"]);',
      "  expect(result.rc).toBe(0);",
      "});",
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["tui"]);
    expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual(["tui"]);
  });

  test("calling the long-running TUI client derives the tui mechanism", () => {
    const src = [
      "// covers: render-surface:statusline",
      'import { runTuiDriverToExit } from "../harness/tui-client.ts";',
      'test("x", async () => {',
      '  expect(await runTuiDriverToExit(["answer-gate"])).toBe(0);',
      "});",
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["tui"]);
    expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual(["tui"]);
  });

  test("calling an aliased canonical TUI client binding derives tui", () => {
    const src = [
      'import { waitForTui as waitForScreen } from "../harness/tui-client.ts";',
      'test("x", () => {',
      '  expect(waitForScreen("s", "ready", 1000, 0)).toBe(true);',
      "});",
    ].join("\n");

    expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["tui"]);
    expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual(["tui"]);
  });

  test("TUI detection unwraps a canonical imported callee", () => {
    for (const callee of calleeForms("runTuiDriver")) {
      const src = [
        'import { runTuiDriver } from "../harness/tui-client.ts";',
        `${callee}([]);`,
      ].join("\n");
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["tui"]);
      expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual(["tui"]);
    }
  });

  test("same-named locals, strings, and import-only clients do not derive tui", () => {
    const local = [
      "function runTuiDriver() { return 0; }",
      "runTuiDriver();",
      'const mention = "runTuiDriver(";',
      'const driverFile = "tui-drive.ts";',
    ].join("\n");
    const importOnly = [
      'import { runTuiDriver } from "../harness/tui-client.ts";',
      'test("x", () => expect(typeof runTuiDriver).toBe("function"));',
    ].join("\n");
    const shadowed = [
      'import { runTuiDriver } from "../harness/tui-client.ts";',
      "function invoke(runTuiDriver: () => void) {",
      "  runTuiDriver();",
      "}",
      "invoke(() => {});",
    ].join("\n");
    const wrongModule = [
      'import { runTuiDriver } from "../fake/tui-client.ts";',
      "runTuiDriver();",
    ].join("\n");

    for (const src of [local, importOnly, shadowed, wrongModule]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
      expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual([]);
    }
  });

  test("direct driver references stay outside the canonical client contract", () => {
    const directSpawn = [
      'import { spawnSync as runChild } from "node:child_process";',
      'import { join } from "node:path";',
      'const DRIVER = join(import.meta.dir, "../harness/tui-drive.ts");',
      "runChild(process.execPath, [DRIVER]);",
    ].join("\n");
    const wrongExecutable = [
      'import { spawnSync } from "node:child_process";',
      'spawnSync("echo", ["../harness/tui-drive.ts"]);',
    ].join("\n");
    const sourceReadThenSpawn = [
      'import { spawnSync } from "node:child_process";',
      'import { readFileSync } from "node:fs";',
      'import { join } from "node:path";',
      'const source = readFileSync(join(import.meta.dir, "../harness/tui-drive.ts"), "utf8");',
      'spawnSync("wc", ["-c"], { input: source });',
    ].join("\n");

    for (const src of [directSpawn, wrongExecutable, sourceReadThenSpawn]) {
      expect(mechanismsOf("t99.none.test.ts", src)).toEqual(["none"]);
      expect(claudeDependenciesOf("t99.none.test.ts", src)).toEqual([]);
    }
  });
});
