// Deterministic upstream AI-DLC v2 workspace migration.
//
// The public seam is deliberately small:
//   runMigration(options) -> a structured report
//   main(argv)             -> the CLI exit code
//
// Dry-run is the default. Filesystem and Git mutations are confined to the
// apply path, after the complete preflight and operation plan are green.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_NAMESPACE = "aidlc";
const DESTINATION_NAMESPACE = "amadeus";
const UPSTREAM_STATE_FILE = UPSTREAM_NAMESPACE + "-state.md";
const DESTINATION_STATE_FILE = DESTINATION_NAMESPACE + "-state.md";
const UPSTREAM_RUNTIME_PREFIX = "." + UPSTREAM_NAMESPACE + "-";
const DESTINATION_RUNTIME_PREFIX = "." + DESTINATION_NAMESPACE + "-";
const UPSTREAM_CLONE_ID = UPSTREAM_RUNTIME_PREFIX + "clone-id";
const DESTINATION_CLONE_ID = DESTINATION_RUNTIME_PREFIX + "clone-id";
const DISCARDED_RUNTIME_DIRECTORY_SUFFIXES = new Set([
  "hooks-health",
  "sensors",
  "sessions",
  "stop-hook",
]);
const DISCARDED_RUNTIME_FILE_SUFFIXES = new Set([
  "plan.json",
  "readonly-latch",
  "recovery.md",
  "turn-counter",
]);
const KNOWN_RUNTIME_TOKEN_SUFFIXES = [
  "clone-id",
  "compose-pending",
  "hooks-health",
  "plan.json",
  "readonly-latch",
  "recovery.md",
  "sensors",
  "sessions",
  "stop-hook",
  "turn-counter",
] as const;
const INSTALLER_MANIFEST = join(
  DESTINATION_NAMESPACE,
  ".installer",
  "amadeus-setup-manifest.json",
);
const SUPPORTED_STATE_VERSION = 7;
const MIN_UPSTREAM_VERSION = [2, 2, 0] as const;
const MAX_UPSTREAM_VERSION = [2, 2, 10] as const;
const INSTALLED_HARNESS_DIRS = [".claude", ".codex", ".kiro"] as const;
const MIGRATOR_TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

const STATE_V7_SECTIONS = [
  "## Project Information",
  "## Scope Configuration",
  "## Workspace State",
  "## Execution Plan Summary",
  "## Runtime State",
  "## Phase Progress",
  "## Stage Progress",
  "## Current Status",
  "## Session Resume Point",
] as const;

const STATE_V7_FIELDS = [
  "Project",
  "Project Type",
  "Scope",
  "Start Date",
  "State Version",
  "Active Agent",
  "Worktree Path",
  "Bolt Refs",
  "Practices Affirmed Timestamp",
  "Stages to Execute",
  "Stages to Skip",
  "Depth",
  "Test Strategy",
  "Project Root",
  "Languages",
  "Frameworks",
  "Build System",
  "Total Stages",
  "Completed",
  "In Progress",
  "Revision Count",
  "Initialization",
  "Ideation",
  "Inception",
  "Construction",
  "Operation",
  "Lifecycle Phase",
  "Current Stage",
  "Next Stage",
  "Status",
  "Last Updated",
  "Last Completed Stage",
  "Next Action",
  "Pending Artifacts",
] as const;

const KNOWN_AGENT_ROLES = new Set([
  "architect",
  "architecture-reviewer",
  "aws-platform",
  "compliance",
  "composer",
  "delivery",
  "design",
  "developer",
  "devsecops",
  "operations",
  "pipeline-deploy",
  "product",
  "product-lead",
  "quality",
]);

const KNOWN_STAGE_RUNNERS = [
  "application-design",
  "approval-handoff",
  "build-and-test",
  "ci-pipeline",
  "code-generation",
  "delivery-planning",
  "deployment-execution",
  "deployment-pipeline",
  "environment-provisioning",
  "feasibility",
  "feedback-optimization",
  "functional-design",
  "incident-response",
  "infrastructure-design",
  "intent-capture",
  "market-research",
  "nfr-design",
  "nfr-requirements",
  "observability-setup",
  "performance-validation",
  "practices-discovery",
  "refined-mockups",
  "requirements-analysis",
  "reverse-engineering",
  "rough-mockups",
  "scope-definition",
  "team-formation",
  "units-generation",
  "user-stories",
] as const;

const KNOWN_SCOPE_NAMES = [
  "bugfix",
  "enterprise",
  "feature",
  "infra",
  "mvp",
  "poc",
  "refactor",
  "security-patch",
  "workshop",
] as const;

const KNOWN_BARE_SCOPE_NAMES = [
  "bugfix",
  "feature",
  "mvp",
  "security-patch",
] as const;

const KNOWN_AGENT_JSON_ROLES = new Set([
  "architect",
  "architecture-reviewer",
  "composer",
  "developer",
  "product-lead",
]);

const KNOWN_TYPESCRIPT_STEMS = [
  "audit",
  "audit-logger",
  "bolt",
  "codex-adapter",
  "directive",
  "graph",
  "includes",
  "jump",
  "kiro-adapter",
  "learnings",
  "lib",
  "log",
  "log-subagent",
  "mint-presence",
  "orchestrate",
  "rule-schema",
  "runner-gen",
  "runtime",
  "runtime-compile",
  "sensor",
  "sensor-fire",
  "sensor-linter",
  "sensor-required-sections",
  "sensor-schema",
  "sensor-type-check",
  "sensor-upstream-coverage",
  "session-end",
  "session-start",
  "stage-schema",
  "state",
  "statusline",
  "stop",
  "swarm",
  "sync-statusline",
  "utility",
  "validate",
  "validate-state",
  "version",
  "worktree",
] as const;

const KNOWN_KIRO_HOOK_STEMS = [
  "audit-logger",
  "block",
  "log-subagent",
  "mint",
  "runtime-compile",
  "session-end",
  "session-start",
  "stop",
  "sync-statusline",
] as const;

const KNOWN_SENSOR_NAMES = [
  "linter",
  "required-sections",
  "type-check",
  "upstream-coverage",
] as const;

// Frozen from the distributed basename inventory at upstream v2.2.0 and
// commit 242953e (the 2.2.10 code revision). Exact tokens avoid rewriting
// methodology prose such as `aidlc-product-thinking` while covering every
// shipped tool, hook, sensor, scope, agent, and stage-runner name.
const KNOWN_OPERATIONAL_TOKENS = [
  "aidlc.md",
  "aidlc.json",
  "aidlc-common",
  "aidlc-compose",
  "aidlc-init",
  "aidlc-outcomes-pack",
  "aidlc-replay",
  "aidlc-session-cost",
  "aidlc-shared",
  ...KNOWN_STAGE_RUNNERS.map((name) => "aidlc-" + name),
  ...KNOWN_SCOPE_NAMES.map((name) => "aidlc-" + name + ".md"),
  ...KNOWN_BARE_SCOPE_NAMES.map((name) => "aidlc-" + name),
  ...[...KNOWN_AGENT_ROLES].flatMap((role) =>
    ["", ".md", ".toml"].map(
      (extension) => "aidlc-" + role + "-agent" + extension,
    ),
  ),
  ...[...KNOWN_AGENT_JSON_ROLES].map((role) => "aidlc-" + role + "-agent.json"),
  ...KNOWN_TYPESCRIPT_STEMS.map((name) => "aidlc-" + name + ".ts"),
  ...KNOWN_KIRO_HOOK_STEMS.map((name) => "aidlc-" + name + ".kiro.hook"),
  ...KNOWN_SENSOR_NAMES.map((name) => "aidlc-" + name + ".md"),
] as const;
const COMPLETE_TOKEN_END =
  "(?=$|[^A-Za-z0-9_.-]|\\.(?=$|[^A-Za-z0-9_-]))";

const GITIGNORE_SUFFIX_RENAMES = new Map<string, string>([
  ["active-space", "active-space"],
  ["spaces/*/intents/active-intent", "spaces/*/intents/active-intent"],
  [".aidlc-clone-id", ".amadeus-clone-id"],
  [".aidlc-sessions/", ".amadeus-sessions/"],
  [".aidlc-compose-pending", ".amadeus-compose-pending"],
  [".aidlc-turn-counter", ".amadeus-turn-counter"],
  [".aidlc-readonly-latch", ".amadeus-readonly-latch"],
  [
    "spaces/*/intents/*/runtime-graph.json",
    "spaces/*/intents/*/runtime-graph.json",
  ],
  ["spaces/*/intents/.aidlc-*", "spaces/*/intents/.amadeus-*"],
  ["spaces/*/intents/*/.aidlc-*", "spaces/*/intents/*/.amadeus-*"],
]);

export type MigrationStatus = "ready" | "applied" | "refused" | "failed";
export type MigrationMode = "dry-run" | "apply";
export type MigrationTarget = "absent" | "installer-seed" | "unsupported";

export interface MigrationCheck {
  id: string;
  pass: boolean;
  detail: string;
}

export interface MigrationOperation {
  kind: "delete" | "gitignore" | "move" | "preserve" | "rename" | "rewrite";
  path: string;
  to?: string;
  replacements?: number;
}

export interface MigrationEvidence {
  stateFiles: number;
  auditBefore: Record<string, string>;
  auditAfter?: Record<string, string>;
  doctor?: {
    status: "passed";
    output: string;
  };
  auditAppends?: Array<{
    path: string;
    bytes: number;
    events: string[];
  }>;
  rollback?: {
    attempted: boolean;
    restored: boolean;
  };
}

export interface MigrationReport {
  schemaVersion: 1;
  status: MigrationStatus;
  mode: MigrationMode;
  source: string;
  destination: string;
  sourceVersion: string;
  target: MigrationTarget;
  checks: MigrationCheck[];
  operations: MigrationOperation[];
  warnings: string[];
  evidence: MigrationEvidence;
}

export interface MigrationOptions {
  projectDir?: string;
  from?: string;
  apply?: boolean;
  json?: boolean;
}

interface IntentRegistryEntry {
  uuid: string;
  slug: string;
  dirName?: string;
  status: string;
}

interface InstallerManifestEntry {
  path: string;
  class: "owned" | "shared" | "user-preserved";
  required: boolean;
  md5: string;
}

interface InstallerManifest {
  schemaVersion: 1;
  installerPackageVersion: string;
  distributionVersion: string;
  sourceTag: string;
  installedAt: string;
  harness: "claude" | "codex" | "kiro" | "kiro-ide";
  files: InstallerManifestEntry[];
}

interface Inspection {
  report: MigrationReport;
  projectDir: string;
  sourceRelative: string;
  sourceFingerprint: string | null;
  destinationFingerprint: string | null;
  gitignoreFingerprint: string;
  gitignoreBefore: string | null;
  gitignoreAfter: string | null;
  installerManifestBytes: Buffer | null;
  doctorHarness: string | null;
  doctorUtility: string | null;
  doctorUtilityFingerprint: string | null;
  doctorToolsFingerprint: string | null;
}

interface WalkEntry {
  absolute: string;
  relative: string;
  kind: "directory" | "file" | "symlink";
}

function toPosix(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

function operationSortKey(operation: MigrationOperation): string {
  return JSON.stringify(operation);
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortOperations(operations: MigrationOperation[]): MigrationOperation[] {
  return operations.sort((left, right) =>
    compareCodePoints(operationSortKey(left), operationSortKey(right)),
  );
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function md5(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

function git(projectDir: string, args: readonly string[]): {
  ok: boolean;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync("git", ["-C", projectDir, ...args], {
    encoding: "utf-8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function canonicalExisting(path: string): string {
  return realpathSync(path);
}

function pathEntryExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith(".." + sep) && rel !== ".." && !isAbsolute(rel);
}

function isUtf8(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

interface MountInventory {
  available: boolean;
  mountPoints: string[];
  source: string;
}

interface MountBoundaryInspection extends MountInventory {
  boundaries: string[];
}

function decodeMountPath(path: string): string {
  return path.replace(/\\([0-7]{3})/g, (_match, octal: string) =>
    String.fromCharCode(Number.parseInt(octal, 8))
  );
}

function linuxMountPoints(input: string): string[] {
  const points: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    const separator = line.indexOf(" - ");
    if (separator === -1) continue;
    const fields = line.slice(0, separator).split(" ");
    if (fields.length < 5) continue;
    points.push(decodeMountPath(fields[4]));
  }
  return points;
}

function bsdMountPoints(input: string): string[] {
  const points: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    const options = line.lastIndexOf(" (");
    const marker = options === -1 ? -1 : line.lastIndexOf(" on ", options);
    if (marker === -1 || options <= marker + 4) continue;
    points.push(decodeMountPath(line.slice(marker + 4, options)));
  }
  return points;
}

function windowsMountPoints(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z]:\\/.test(line) && !line.startsWith("\\\\?\\"));
}

function normalizedMountInventory(
  mountPoints: readonly string[],
  source: string,
): MountInventory {
  const normalized = [...new Set(mountPoints.map((path) => resolve(path)))].sort(
    compareCodePoints,
  );
  return {
    available: normalized.length > 0,
    mountPoints: normalized,
    source,
  };
}

function unavailableMountInventory(source: string): MountInventory {
  return { available: false, mountPoints: [], source };
}

function bsdSystemMountInventory(): MountInventory {
  const mountCommand = pathEntryExists("/sbin/mount")
    ? "/sbin/mount"
    : pathEntryExists("/bin/mount")
      ? "/bin/mount"
      : null;
  if (mountCommand === null) {
    return unavailableMountInventory("system mount utility");
  }
  const mounted = spawnSync(mountCommand, [], { encoding: "utf-8" });
  return mounted.status === 0
    ? normalizedMountInventory(bsdMountPoints(mounted.stdout || ""), "mount")
    : unavailableMountInventory("mount");
}

function windowsSystemMountInventory(): MountInventory {
  const mountCommand = join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "mountvol.exe",
  );
  if (!pathEntryExists(mountCommand)) {
    return unavailableMountInventory(mountCommand);
  }
  const mounted = spawnSync(mountCommand, [], { encoding: "utf-8" });
  return mounted.status === 0
    ? normalizedMountInventory(
        windowsMountPoints(mounted.stdout || ""),
        "mountvol",
      )
    : unavailableMountInventory("mountvol");
}

function systemMountInventory(): MountInventory {
  const testMountInfo = process.env.AMADEUS_MIGRATE_TEST_MOUNTINFO;
  if (process.env.NODE_ENV === "test" && testMountInfo !== undefined) {
    return normalizedMountInventory(linuxMountPoints(testMountInfo), "test mountinfo");
  }
  if (process.platform === "linux") {
    try {
      return normalizedMountInventory(
        linuxMountPoints(readFileSync("/proc/self/mountinfo", "utf-8")),
        "/proc/self/mountinfo",
      );
    } catch {
      return unavailableMountInventory("/proc/self/mountinfo");
    }
  }
  if (["darwin", "freebsd", "openbsd", "netbsd"].includes(process.platform)) {
    return bsdSystemMountInventory();
  }
  if (process.platform === "win32") {
    return windowsSystemMountInventory();
  }
  return unavailableMountInventory(process.platform);
}

function inspectMountBoundaries(root: string): MountBoundaryInspection {
  const inventory = systemMountInventory();
  const resolvedRoot = resolve(root);
  const boundaries = inventory.mountPoints
    .filter((mountPoint) => mountPoint === resolvedRoot || isInside(resolvedRoot, mountPoint))
    .sort(compareCodePoints);
  return { ...inventory, boundaries };
}

function inspectSourceMountBoundaries(
  source: string,
  collector: CheckCollector,
): boolean {
  const inspection = inspectMountBoundaries(source);
  const pass = inspection.available && inspection.boundaries.length === 0;
  collector.add(
    "source-mount-boundaries",
    pass,
    !inspection.available
      ? "Mount metadata is unavailable from " + inspection.source + "; migration fails closed."
      : pass
        ? "The source contains no mount or reparse boundary."
        : "The source contains mount or reparse boundaries: " +
          inspection.boundaries.join(", "),
  );
  return pass;
}

function assertSafeRecursiveRemoval(path: string): void {
  if (!pathEntryExists(path)) return;
  const inspection = inspectMountBoundaries(path);
  if (!inspection.available) {
    throw new Error(
      "Refusing recursive removal because mount metadata is unavailable from " +
        inspection.source +
        ".",
    );
  }
  if (inspection.boundaries.length > 0) {
    throw new Error(
      "Refusing recursive removal across mount or reparse boundaries: " +
        inspection.boundaries.join(", "),
    );
  }
}

function removeTreeSafely(path: string): void {
  if (!pathEntryExists(path)) return;
  assertSafeRecursiveRemoval(path);
  rmSync(path, { recursive: true, force: true });
}

function walkTree(root: string): WalkEntry[] {
  const entries: WalkEntry[] = [];
  const rootDevice = lstatSync(root).dev;
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const absolute = join(dir, name);
      const rel = toPosix(relative(root, absolute));
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        entries.push({ absolute, relative: rel, kind: "symlink" });
      } else if (stat.isDirectory()) {
        entries.push({ absolute, relative: rel, kind: "directory" });
        if (stat.dev === rootDevice) visit(absolute);
      } else {
        entries.push({ absolute, relative: rel, kind: "file" });
      }
    }
  };
  visit(root);
  return entries;
}

function walkFilesWithoutFollowingSymlinks(root: string): WalkEntry[] {
  if (!existsSync(root)) return [];
  return walkTree(root).filter((entry) => entry.kind !== "directory");
}

function sourceTreeFingerprint(root: string): string {
  const hash = createHash("sha256");
  const add = (label: string, value: string | Buffer): void => {
    const bytes = typeof value === "string" ? Buffer.from(value, "utf-8") : value;
    hash.update(label + ":" + bytes.length + ":");
    hash.update(bytes);
  };
  const rootStat = lstatSync(root);
  add("root-mode", String(rootStat.mode));
  for (const entry of walkTree(root)) {
    const stat = lstatSync(entry.absolute);
    add("path", entry.relative);
    add("kind", entry.kind);
    add("mode", String(stat.mode));
    if (entry.kind === "symlink") {
      add("target", readlinkSync(entry.absolute, { encoding: "buffer" }));
    } else if (entry.kind === "file") {
      if (isRegularFile(entry.absolute)) {
        add("content", readFileSync(entry.absolute));
      } else {
        add("content-kind", "non-regular");
      }
    }
  }
  return hash.digest("hex");
}

function pathFingerprint(path: string): string {
  if (!pathEntryExists(path)) return "absent";
  const stat = lstatSync(path);
  const hash = createHash("sha256");
  hash.update(String(stat.mode));
  hash.update("\0");
  if (stat.isSymbolicLink()) {
    hash.update("symlink\0");
    hash.update(readlinkSync(path, { encoding: "buffer" }));
  } else if (stat.isFile()) {
    hash.update("file\0");
    hash.update(readFileSync(path));
  } else if (stat.isDirectory()) {
    hash.update("directory");
  } else {
    hash.update("non-regular");
  }
  return hash.digest("hex");
}

function escapeRegexLiteral(value: string): string {
  const special = new Set(["\\", "^", "$", ".", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|"]);
  return [...value].map((character) => (special.has(character) ? "\\" + character : character)).join("");
}

function getStateField(state: string, label: string): string {
  const match = state.match(
    new RegExp("^- \\*\\*" + escapeRegexLiteral(label) + "\\*\\*:[ \\t]*(.*)$", "m"),
  );
  return match ? match[1].trim() : "";
}

function isEmptyRuntimeField(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "[]" ||
    normalized === "[empty]" ||
    normalized === "[empty list]" ||
    normalized === "[unset]"
  );
}

function parseSemver(value: string): [number, number, number] | null {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isInstallerDistributionVersion(value: string): boolean {
  return /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
}

function compareSemver(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  for (let index = 0; index < 3; index++) {
    const delta = left[index] - right[index];
    if (delta !== 0) return delta;
  }
  return 0;
}

interface SourceVersionInspection {
  version: string;
  errors: string[];
  warnings: string[];
  oldEngineFiles: string[];
}

interface UpstreamEngineScan {
  versions: Set<string>;
  oldEngineFiles: string[];
  malformedVersionFiles: string[];
}

function hasLegacyEngineSegment(relativePath: string): boolean {
  return relativePath.split("/").some(
    (segment) =>
      segment === UPSTREAM_NAMESPACE ||
      segment.startsWith(UPSTREAM_NAMESPACE + "-") ||
      segment === UPSTREAM_NAMESPACE + ".md" ||
      segment === UPSTREAM_NAMESPACE + ".json",
  );
}

function scanLegacyEngineRoot(
  projectDir: string,
  relativeRoot: string,
  scan: UpstreamEngineScan,
): void {
  const root = join(projectDir, relativeRoot);
  if (
    !pathEntryExists(root) ||
    !lstatSync(root).isDirectory() ||
    lstatSync(root).isSymbolicLink()
  ) {
    return;
  }
  const rootDevice = lstatSync(root).dev;
  for (const entry of walkTree(root)) {
    if (entry.kind === "directory" || !hasLegacyEngineSegment(entry.relative)) {
      continue;
    }
    const relativePath = toPosix(relative(projectDir, entry.absolute));
    scan.oldEngineFiles.push(relativePath);
    if (basename(entry.relative) !== UPSTREAM_NAMESPACE + "-version.ts") {
      continue;
    }
    if (
      entry.kind !== "file" ||
      !isRegularFile(entry.absolute) ||
      lstatSync(entry.absolute).dev !== rootDevice
    ) {
      scan.malformedVersionFiles.push(relativePath);
      continue;
    }
    const versionBytes = readFileSync(entry.absolute);
    if (!isUtf8(versionBytes)) {
      scan.malformedVersionFiles.push(relativePath);
      continue;
    }
    const match = versionBytes.toString("utf-8").match(
      /AIDLC_VERSION\s*=\s*["']([^"']+)["']/,
    );
    if (match) scan.versions.add(match[1]);
    else scan.malformedVersionFiles.push(relativePath);
  }
}

function scanUpstreamEngine(projectDir: string): UpstreamEngineScan {
  const scan: UpstreamEngineScan = {
    versions: new Set<string>(),
    oldEngineFiles: [],
    malformedVersionFiles: [],
  };
  for (const root of [".claude", ".codex", ".kiro", ".agents/skills"]) {
    scanLegacyEngineRoot(projectDir, root, scan);
  }
  scan.oldEngineFiles = [...new Set(scan.oldEngineFiles)].sort(compareCodePoints);
  scan.malformedVersionFiles = [...new Set(scan.malformedVersionFiles)].sort(
    compareCodePoints,
  );
  return scan;
}

function classifySourceVersion(
  versions: ReadonlySet<string>,
  oldEngineFiles: string[],
  malformedVersionFiles: readonly string[],
): SourceVersionInspection {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (malformedVersionFiles.length > 0) {
    errors.push(
      "Upstream version declaration is malformed in: " +
        [...malformedVersionFiles].sort().join(", "),
    );
  }
  if (versions.size > 1) {
    errors.push("Conflicting upstream engine versions were detected: " + [...versions].join(", "));
    return { version: "unknown", errors, warnings, oldEngineFiles };
  }
  if (versions.size === 0) {
    warnings.push(
      "The upstream workspace carries no framework version; compatibility is admitted by State Version 7 and structural validation.",
    );
    return { version: "unknown", errors, warnings, oldEngineFiles };
  }

  const version = [...versions][0];
  const parsed = parseSemver(version);
  if (
    parsed === null ||
    compareSemver(parsed, MIN_UPSTREAM_VERSION) < 0 ||
    compareSemver(parsed, MAX_UPSTREAM_VERSION) > 0
  ) {
    errors.push(
      "Unsupported upstream version " +
        version +
        "; supported versions are 2.2.0 through the 2.2.10 code commit.",
    );
  }
  return { version, errors, warnings, oldEngineFiles };
}

function discoverSourceVersion(projectDir: string): SourceVersionInspection {
  const { versions, oldEngineFiles, malformedVersionFiles } =
    scanUpstreamEngine(projectDir);
  return classifySourceVersion(
    versions,
    oldEngineFiles,
    malformedVersionFiles,
  );
}

function stateVersion(state: string): number | null {
  const value = getStateField(state, "State Version");
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

function stateFieldCount(state: string, label: string): number {
  const pattern = new RegExp(
    "^- \\*\\*" + escapeRegexLiteral(label) + "\\*\\*:[ \\t]*(.*)$",
    "gm",
  );
  return [...state.matchAll(pattern)].length;
}

function validateStateSections(state: string): string[] {
  const errors: string[] = [];
  let previousSection = -1;
  for (const section of STATE_V7_SECTIONS) {
    const pattern = new RegExp("^" + escapeRegexLiteral(section) + "$", "gm");
    const matches = [...state.matchAll(pattern)];
    if (matches.length !== 1) {
      errors.push("section " + section.slice(3) + " must appear exactly once");
      continue;
    }
    const index = matches[0].index ?? -1;
    if (index <= previousSection) errors.push("state sections are out of order");
    previousSection = index;
  }
  return errors;
}

function validateStateFields(state: string): string[] {
  const errors: string[] = [];
  for (const field of STATE_V7_FIELDS) {
    if (stateFieldCount(state, field) !== 1) {
      errors.push("field " + field + " must appear exactly once");
    }
  }
  return errors;
}

function validateNumericStateValues(state: string): string[] {
  const errors: string[] = [];
  for (const numericField of ["Total Stages", "Completed", "Revision Count"]) {
    if (!/^\d+$/.test(getStateField(state, numericField))) {
      errors.push("field " + numericField + " must be a non-negative integer");
    }
  }
  return errors;
}

function validatePhaseStateValues(state: string): string[] {
  const errors: string[] = [];
  for (const phase of ["Initialization", "Ideation", "Inception", "Construction", "Operation"]) {
    const value = getStateField(state, phase);
    if (!/^(?:Pending|Active|Verified|Skipped)$/i.test(value)) {
      errors.push("phase " + phase + " has an invalid status");
    }
  }
  return errors;
}

const STATE_CHECKBOX_PREFIX = new RegExp("^- \\[");
const VALID_STATE_CHECKBOX_ROW = new RegExp(
  "^- \\[(?: |-|\\?|R|x|S)\\]\\s+\\S",
);

function isStateCheckboxRow(line: string): boolean {
  return STATE_CHECKBOX_PREFIX.test(line);
}

function isInvalidStateCheckboxRow(line: string): boolean {
  return !VALID_STATE_CHECKBOX_ROW.test(line);
}

function validateStateCheckboxRows(state: string): string[] {
  const errors: string[] = [];
  const checkboxLines = state
    .split(/\r?\n/)
    .filter(isStateCheckboxRow);
  if (checkboxLines.length === 0) errors.push("Stage Progress has no checkbox rows");
  if (checkboxLines.some(isInvalidStateCheckboxRow)) {
    errors.push("Stage Progress contains an invalid checkbox row");
  }
  return errors;
}

function validateStateValues(state: string): string[] {
  const errors = stateVersion(state) === SUPPORTED_STATE_VERSION
    ? []
    : ["State Version must be 7"];
  return [
    ...errors,
    ...validateNumericStateValues(state),
    ...validatePhaseStateValues(state),
    ...validateStateCheckboxRows(state),
  ];
}

function validateStateV7(state: string): string[] {
  return [
    ...validateStateSections(state),
    ...validateStateFields(state),
    ...validateStateValues(state),
  ];
}

function isRegularFile(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function uniqueStatePath(recordPath: string, stateFile: string): string | null {
  const matches = walkTree(recordPath).filter(
    (entry) => basename(entry.relative) === stateFile,
  );
  if (matches.length !== 1) return null;
  const [match] = matches;
  return match.kind === "file" &&
    match.relative === stateFile &&
    isRegularFile(match.absolute)
    ? match.absolute
    : null;
}

function recordDirectories(intentsRoot: string): string[] {
  if (!existsSync(intentsRoot)) return [];
  return readdirSync(intentsRoot)
    .sort()
    .filter((name) => !name.startsWith("."))
    .map((name) => join(intentsRoot, name))
    .filter((path) => {
      const stat = lstatSync(path);
      return !stat.isSymbolicLink() && stat.isDirectory();
    });
}

function readRegistry(path: string): IntentRegistryEntry[] | null {
  if (!isRegularFile(path)) return null;
  try {
    const bytes = readFileSync(path);
    if (!isUtf8(bytes)) return null;
    const parsed = JSON.parse(bytes.toString("utf-8")) as unknown;
    if (!Array.isArray(parsed)) return null;
    const entries: IntentRegistryEntry[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) return null;
      const value = item as Record<string, unknown>;
      if (
        typeof value.uuid !== "string" ||
        typeof value.slug !== "string" ||
        typeof value.status !== "string" ||
        (value.dirName !== undefined && typeof value.dirName !== "string")
      ) {
        return null;
      }
      entries.push({
        uuid: value.uuid,
        slug: value.slug,
        status: value.status,
        ...(typeof value.dirName === "string" ? { dirName: value.dirName } : {}),
      });
    }
    return entries;
  } catch {
    return null;
  }
}

function registryRecordName(
  entry: IntentRegistryEntry,
  records: readonly string[],
): string | null {
  if (entry.dirName !== undefined) {
    return records.includes(entry.dirName) ? entry.dirName : null;
  }
  const uuid = entry.uuid.replaceAll("-", "");
  const matching = records.filter((name) => {
    if (!name.startsWith(entry.slug + "-")) return false;
    const suffix = name.slice(entry.slug.length + 1);
    return (
      /^[0-9a-f]+$/.test(suffix) && uuid.slice(-suffix.length) === suffix
    );
  });
  return matching.length === 1 ? matching[0] : null;
}

function collectAuditHashes(root: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const entry of walkFilesWithoutFollowingSymlinks(root)) {
    if (!entry.relative.split("/").includes("audit")) continue;
    if (entry.kind !== "file" || !isRegularFile(entry.absolute)) continue;
    hashes[entry.relative] = sha256(entry.absolute);
  }
  return Object.fromEntries(
    Object.entries(hashes).sort(([left], [right]) => compareCodePoints(left, right)),
  );
}

function isSafeAuditEntry(entry: WalkEntry): boolean {
  const segments = entry.relative.split("/");
  const auditIndex = segments.indexOf("audit");
  if (auditIndex === -1) return true;
  if (segments.length === auditIndex + 1) return entry.kind === "directory";
  return (
    entry.kind === "directory" ||
    (entry.kind === "file" && isRegularFile(entry.absolute))
  );
}

function inspectAuditEntries(
  source: string,
  collector: CheckCollector,
): void {
  const unsafe = walkTree(source)
    .filter((entry) => !isSafeAuditEntry(entry))
    .map((entry) => entry.relative)
    .sort(compareCodePoints);
  collector.add(
    "audit-entry-types",
    unsafe.length === 0,
    unsafe.length === 0
      ? "Every audit directory contains only real directories and regular files."
      : "Audit directories contain symlinks or non-regular entries: " + unsafe.join(", "),
  );
}

function testAdjustedDevice(
  relativePath: string,
  actual: number,
  environmentName: string,
): number {
  return process.env.NODE_ENV === "test" &&
    process.env[environmentName] === relativePath
    ? actual + 1
    : actual;
}

function inspectSourceEntryTypes(
  source: string,
  collector: CheckCollector,
): boolean {
  const entries = walkTree(source);
  const unsupported = entries
    .filter((entry) => entry.kind === "file" && !isRegularFile(entry.absolute))
    .map((entry) => entry.relative)
    .sort(compareCodePoints);
  collector.add(
    "source-entry-types",
    unsupported.length === 0,
    unsupported.length === 0
      ? "The source contains only directories, regular files, and symlinks."
      : "The source contains unsupported non-regular entries: " + unsupported.join(", "),
  );
  const sourceDevice = lstatSync(source).dev;
  const crossDevice = entries
    .filter((entry) => entry.kind !== "symlink")
    .filter((entry) => {
      const actual = lstatSync(entry.absolute).dev;
      return (
        testAdjustedDevice(
          entry.relative,
          actual,
          "AMADEUS_MIGRATE_TEST_SOURCE_NESTED_DEVICE_MISMATCH",
        ) !== sourceDevice
      );
    })
    .map((entry) => entry.relative)
    .sort(compareCodePoints);
  collector.add(
    "source-entry-filesystems",
    crossDevice.length === 0,
    crossDevice.length === 0
      ? "Every real source entry is on the source filesystem."
      : "Source entries cross a filesystem boundary: " + crossDevice.join(", "),
  );
  return unsupported.length === 0 && crossDevice.length === 0;
}

function inspectStateInventory(
  source: string,
  validatedRecordStates: number,
  collector: CheckCollector,
): void {
  const stateEntries = walkTree(source).filter(
    (entry) => basename(entry.relative) === UPSTREAM_STATE_FILE,
  );
  const pass = stateEntries.length === validatedRecordStates;
  collector.add(
    "state-inventory",
    pass,
    pass
      ? "Every upstream state file is a validated record-root state."
      : "Upstream state files outside validated record roots were found or record states failed validation.",
  );
}

function isHistoricalText(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const name = segments[segments.length - 1] || "";
  return (
    segments.includes("audit") ||
    name === "intents.json" ||
    name === ".migrated" ||
    segments.includes(".installer")
  );
}

function rewriteOperationalText(input: string): {
  output: string;
  replacements: number;
} {
  let output = input;
  let replacements = 0;
  const replacePrefixed = (pattern: RegExp, replacement: string): void => {
    output = output.replace(pattern, (_whole, prefix: string) => {
      replacements++;
      return prefix + replacement;
    });
  };

  replacePrefixed(
    new RegExp(
      "(^|[^A-Za-z0-9_-])" +
        escapeRegexLiteral(UPSTREAM_STATE_FILE) +
        COMPLETE_TOKEN_END,
      "gm",
    ),
    DESTINATION_STATE_FILE,
  );
  const runtimeTokenPattern = new RegExp(
    "(^|[^A-Za-z0-9_-])(" +
      escapeRegexLiteral(UPSTREAM_RUNTIME_PREFIX) +
      "(?:" +
      KNOWN_RUNTIME_TOKEN_SUFFIXES.map(escapeRegexLiteral).join("|") +
      "))" +
      COMPLETE_TOKEN_END,
    "gm",
  );
  output = output.replace(
    runtimeTokenPattern,
    (_whole, prefix: string, token: string) => {
      replacements++;
      return prefix + DESTINATION_RUNTIME_PREFIX + token.slice(UPSTREAM_RUNTIME_PREFIX.length);
    },
  );
  const dotWorkspacePattern = new RegExp(
    "(^|[^A-Za-z0-9_-])\\." + UPSTREAM_NAMESPACE + "([/\\\\])",
    "gm",
  );
  output = output.replace(
    dotWorkspacePattern,
    (_whole, prefix: string, separator: string) => {
      replacements++;
      return prefix + "." + DESTINATION_NAMESPACE + separator;
    },
  );
  const workspacePathPattern = new RegExp(
    "(^|[^A-Za-z0-9_.-])" + UPSTREAM_NAMESPACE + "([/\\\\])",
    "gm",
  );
  output = output.replace(
    workspacePathPattern,
    (_whole, prefix: string, separator: string) => {
      replacements++;
      return prefix + DESTINATION_NAMESPACE + separator;
    },
  );
  replacePrefixed(
    /(^|[^A-Za-z0-9_])AIDLC_/gm,
    "AMADEUS_",
  );

  const commandPattern = new RegExp(
    "(^|[^A-Za-z0-9_-])" +
      "([/$])" +
      UPSTREAM_NAMESPACE +
      COMPLETE_TOKEN_END,
    "gm",
  );
  output = output.replace(commandPattern, (_whole, prefix: string, marker: string) => {
    replacements++;
    return prefix + marker + DESTINATION_NAMESPACE;
  });

  const knownToken = new RegExp(
    "(^|[^A-Za-z0-9_-])(" +
      [...KNOWN_OPERATIONAL_TOKENS]
        .sort((left, right) => right.length - left.length || compareCodePoints(left, right))
        .map(escapeRegexLiteral)
        .join("|") +
      ")" +
      COMPLETE_TOKEN_END,
    "gm",
  );
  output = output.replace(knownToken, (_whole, prefix: string, token: string) => {
    replacements++;
    return prefix + DESTINATION_NAMESPACE + token.slice(UPSTREAM_NAMESPACE.length);
  });
  return { output, replacements };
}

function isDiscardedRootRuntimePath(
  segments: readonly string[],
  name: string,
  prefix = UPSTREAM_RUNTIME_PREFIX,
): boolean {
  if (segments[0] === prefix + "sessions") return true;
  return (
    segments.length === 1 &&
    (name === prefix + "readonly-latch" || name === prefix + "turn-counter")
  );
}

function isIntentRuntimeGraphPath(
  segments: readonly string[],
  name: string,
): boolean {
  if (segments[0] !== "spaces" || segments[2] !== "intents") return false;
  return (
    name === "runtime-graph.json" &&
    (segments.length === 4 || segments.length === 5)
  );
}

function isDiscardedIntentRuntimePath(
  segments: readonly string[],
  prefix = UPSTREAM_RUNTIME_PREFIX,
): boolean {
  if (segments[0] !== "spaces" || segments[2] !== "intents") return false;
  const scratchIndex = segments[3]?.startsWith(prefix) ? 3 : 4;
  const scratchName = segments[scratchIndex];
  if (!scratchName?.startsWith(prefix)) return false;
  const suffix = scratchName.slice(prefix.length);
  if (DISCARDED_RUNTIME_DIRECTORY_SUFFIXES.has(suffix)) return true;
  return (
    segments.length === scratchIndex + 1 &&
    DISCARDED_RUNTIME_FILE_SUFFIXES.has(suffix)
  );
}

function isPrefixedRuntimeScratchPath(relativePath: string, prefix: string): boolean {
  const segments = relativePath.split("/");
  const name = segments[segments.length - 1] || "";
  return (
    isDiscardedRootRuntimePath(segments, name, prefix) ||
    isDiscardedIntentRuntimePath(segments, prefix) ||
    (segments.length === 1 && name === prefix + "compose-pending")
  );
}

function isDiscardedPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const name = segments[segments.length - 1] || "";
  return (
    isDiscardedRootRuntimePath(segments, name) ||
    isIntentRuntimeGraphPath(segments, name) ||
    isDiscardedIntentRuntimePath(segments)
  );
}

function isForbiddenConvertedRuntimePath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const name = segments[segments.length - 1] || "";
  return (
    isIntentRuntimeGraphPath(segments, name) ||
    isPrefixedRuntimeScratchPath(relativePath, UPSTREAM_RUNTIME_PREFIX) ||
    isPrefixedRuntimeScratchPath(relativePath, DESTINATION_RUNTIME_PREFIX)
  );
}

function renamedKnowledgePath(relativePath: string): string | null {
  const segments = relativePath.split("/");
  const knowledgeIndex = segments.lastIndexOf("knowledge");
  if (knowledgeIndex === -1 || knowledgeIndex + 1 >= segments.length) return null;
  if (segments.length !== knowledgeIndex + 2) return null;
  const name = segments[knowledgeIndex + 1];
  if (name === UPSTREAM_NAMESPACE + "-shared") {
    segments[knowledgeIndex + 1] = DESTINATION_NAMESPACE + "-shared";
    return segments.join("/");
  }
  const match = name.match(new RegExp("^" + UPSTREAM_NAMESPACE + "-(.+)-agent$"));
  if (!match || !KNOWN_AGENT_ROLES.has(match[1])) return null;
  segments[knowledgeIndex + 1] = DESTINATION_NAMESPACE + "-" + match[1] + "-agent";
  return segments.join("/");
}

function transformedGitignore(input: string, sourceRelative: string): string {
  const renames = new Map(
    [...GITIGNORE_SUFFIX_RENAMES].map(([sourceSuffix, destinationSuffix]) => [
      sourceRelative + "/" + sourceSuffix,
      DESTINATION_NAMESPACE + "/" + destinationSuffix,
    ]),
  );
  const rawLines = input.match(/.*?(?:\r\n|\n|\r|$)/g)?.filter(Boolean) ?? [];
  const parsed = rawLines.map((raw) => {
    const ending = raw.endsWith("\r\n")
      ? "\r\n"
      : raw.endsWith("\n")
        ? "\n"
        : raw.endsWith("\r")
          ? "\r"
          : "";
    return { line: ending === "" ? raw : raw.slice(0, -ending.length), ending };
  });
  const existing = new Set(parsed.map(({ line }) => line));
  const output: string[] = [];
  for (const { line, ending } of parsed) {
    const leadingSlash = line.startsWith("/");
    const key = leadingSlash ? line.slice(1) : line;
    const replacement = renames.get(key);
    if (!replacement) {
      output.push(line + ending);
      continue;
    }
    const target = (leadingSlash ? "/" : "") + replacement;
    if (existing.has(target) || output.some((raw) => raw.replace(/\r?\n$|\r$/, "") === target)) {
      continue;
    }
    output.push(target + ending);
  }
  return output.join("");
}

interface InstallerSeedInspection {
  target: MigrationTarget;
  manifestBytes: Buffer | null;
  errors: string[];
}

function parseInstallerManifest(manifestBytes: Buffer): {
  manifest: InstallerManifest | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isUtf8(manifestBytes)) {
    return {
      manifest: null,
      errors: ["The installer manifest must be valid UTF-8 without NUL bytes."],
    };
  }
  try {
    const parsed = JSON.parse(manifestBytes.toString("utf-8")) as Record<string, unknown>;
    const metadataValid =
      parsed?.schemaVersion === 1 &&
      typeof parsed.installerPackageVersion === "string" &&
      typeof parsed.distributionVersion === "string" &&
      isInstallerDistributionVersion(parsed.distributionVersion) &&
      typeof parsed.sourceTag === "string" &&
      parsed.sourceTag.startsWith("v") &&
      typeof parsed.installedAt === "string" &&
      typeof parsed.harness === "string" &&
      ["claude", "codex", "kiro", "kiro-ide"].includes(parsed.harness) &&
      Array.isArray(parsed.files);
    if (!metadataValid) {
      return {
        manifest: null,
        errors: ["The installer manifest is not schema version 1."],
      };
    }
    return { manifest: parsed as unknown as InstallerManifest, errors };
  } catch {
    return { manifest: null, errors: ["The installer manifest is malformed."] };
  }
}

function addParentDirectories(path: string, directories: Set<string>): void {
  let parent = toPosix(dirname(path));
  while (
    parent === DESTINATION_NAMESPACE ||
    parent.startsWith(DESTINATION_NAMESPACE + "/")
  ) {
    directories.add(parent);
    if (parent === DESTINATION_NAMESPACE) break;
    parent = toPosix(dirname(parent));
  }
}

function pathTraversesSymlink(root: string, target: string): boolean {
  let current = root;
  for (const segment of relative(root, target).split(sep).filter(Boolean)) {
    current = join(current, segment);
    if (!pathEntryExists(current)) return false;
    if (lstatSync(current).isSymbolicLink()) return true;
  }
  return false;
}

function isInstallerManifestEntry(entry: unknown): entry is InstallerManifestEntry {
  if (!entry || typeof entry !== "object") return false;
  const value = entry as Record<string, unknown>;
  return (
    typeof value.path === "string" &&
    ["owned", "shared", "user-preserved"].includes(String(value.class)) &&
    typeof value.required === "boolean" &&
    typeof value.md5 === "string" &&
    /^[a-f0-9]{32}$/i.test(value.md5)
  );
}

function installerManifestPath(
  entry: InstallerManifestEntry,
  projectDir: string,
  manifestPaths: Set<string>,
  errors: string[],
): { absolute: string; normalized: string } | null {
  const normalized = toPosix(entry.path);
  const absolute = resolve(projectDir, entry.path);
  const canonicalRelative = toPosix(relative(projectDir, absolute));
  if (
    !isInside(projectDir, absolute) ||
    normalized !== canonicalRelative ||
    pathTraversesSymlink(projectDir, absolute)
  ) {
    errors.push("The installer manifest contains an unsafe path: " + entry.path);
    return null;
  }
  if (manifestPaths.has(normalized)) {
    errors.push("The installer manifest contains a duplicate path: " + normalized);
    return null;
  }
  manifestPaths.add(normalized);
  return { absolute, normalized };
}

function validateExternalInstallerFile(
  path: { absolute: string; normalized: string },
  expectedHash: string,
  errors: string[],
): void {
  if (!isRegularFile(path.absolute)) {
    errors.push(
      "Installer-managed file is missing or not a regular file: " + path.normalized,
    );
  } else if (md5(path.absolute) !== expectedHash) {
    errors.push("Installer-managed file was modified: " + path.normalized);
  }
}

function expectedInstallerSeed(
  manifest: InstallerManifest,
  destination: string,
  projectDir: string,
  errors: string[],
): { files: Map<string, string>; directories: Set<string> } {
  const files = new Map<string, string>();
  const manifestPaths = new Set<string>();
  const directories = new Set<string>([
    DESTINATION_NAMESPACE,
    toPosix(dirname(INSTALLER_MANIFEST)),
  ]);
  for (const entry of manifest.files) {
    if (!isInstallerManifestEntry(entry)) {
      errors.push("The installer manifest contains a malformed files entry.");
      continue;
    }
    const path = installerManifestPath(entry, projectDir, manifestPaths, errors);
    if (!path) continue;
    if (!isInside(destination, path.absolute)) {
      validateExternalInstallerFile(path, entry.md5, errors);
      continue;
    }
    files.set(path.normalized, entry.md5);
    addParentDirectories(path.normalized, directories);
  }
  if (files.size === 0) {
    errors.push("The installer manifest contains no workspace seed files.");
  }
  return { files, directories };
}

function validateInstallerSeedEntry(
  entry: WalkEntry,
  destinationDevice: number,
  projectDir: string,
  expectedFiles: Map<string, string>,
  expectedDirectories: ReadonlySet<string>,
  errors: string[],
): void {
  const projectRelative = toPosix(relative(projectDir, entry.absolute));
  if (entry.kind !== "symlink") {
    const actual = lstatSync(entry.absolute).dev;
    const device = testAdjustedDevice(
      entry.relative,
      actual,
      "AMADEUS_MIGRATE_TEST_SEED_NESTED_DEVICE_MISMATCH",
    );
    if (device !== destinationDevice) {
      errors.push(
        "Installer seed entry crosses a filesystem boundary: " + projectRelative,
      );
      return;
    }
  }
  if (projectRelative === toPosix(INSTALLER_MANIFEST)) return;
  if (entry.kind === "directory") {
    if (!expectedDirectories.has(projectRelative)) {
      errors.push("Installer seed contains an unexpected directory: " + projectRelative);
    }
    return;
  }
  if (entry.kind === "symlink") {
    errors.push("Installer seed contains an unexpected symlink: " + projectRelative);
    return;
  }
  if (!isRegularFile(entry.absolute)) {
    errors.push("Installer seed contains a non-regular file: " + projectRelative);
    return;
  }
  const expectedHash = expectedFiles.get(projectRelative);
  if (!expectedHash) {
    errors.push("Installer seed contains an unexpected file: " + projectRelative);
    return;
  }
  if (md5(entry.absolute) !== expectedHash) {
    errors.push("Installer seed file was modified: " + projectRelative);
  }
  expectedFiles.delete(projectRelative);
}

function validateInstallerSeedTree(
  destination: string,
  projectDir: string,
  expectedFiles: Map<string, string>,
  expectedDirectories: ReadonlySet<string>,
  errors: string[],
): void {
  const destinationDevice = lstatSync(destination).dev;
  for (const entry of walkTree(destination)) {
    validateInstallerSeedEntry(
      entry,
      destinationDevice,
      projectDir,
      expectedFiles,
      expectedDirectories,
      errors,
    );
  }
  for (const missing of [...expectedFiles.keys()].sort()) {
    errors.push("Installer seed file is missing: " + missing);
  }
}

function inspectInstallerSeed(
  destination: string,
  projectDir: string,
): InstallerSeedInspection {
  if (!pathEntryExists(destination)) {
    return { target: "absent", manifestBytes: null, errors: [] };
  }
  const destinationStat = lstatSync(destination);
  if (!destinationStat.isDirectory() || destinationStat.isSymbolicLink()) {
    return {
      target: "unsupported",
      manifestBytes: null,
      errors: ["The destination must be a real installer-managed directory."],
    };
  }
  const mountInspection = inspectMountBoundaries(destination);
  if (!mountInspection.available) {
    return {
      target: "unsupported",
      manifestBytes: null,
      errors: [
        "Installer seed mount metadata is unavailable from " +
          mountInspection.source +
          "; migration fails closed.",
      ],
    };
  }
  if (mountInspection.boundaries.length > 0) {
    return {
      target: "unsupported",
      manifestBytes: null,
      errors: [
        "Installer seed contains mount or reparse boundaries: " +
          mountInspection.boundaries.join(", "),
      ],
    };
  }
  const manifestPath = join(projectDir, INSTALLER_MANIFEST);
  if (pathTraversesSymlink(destination, manifestPath)) {
    return {
      target: "unsupported",
      manifestBytes: null,
      errors: ["The destination installer manifest path must not traverse a symlink."],
    };
  }
  if (!isRegularFile(manifestPath)) {
    return {
      target: "unsupported",
      manifestBytes: null,
      errors: ["The destination has no regular installer manifest."],
    };
  }

  const manifestDevice = testAdjustedDevice(
    toPosix(relative(destination, manifestPath)),
    lstatSync(manifestPath).dev,
    "AMADEUS_MIGRATE_TEST_SEED_NESTED_DEVICE_MISMATCH",
  );
  if (manifestDevice !== destinationStat.dev) {
    return {
      target: "unsupported",
      manifestBytes: null,
      errors: ["The installer manifest crosses a filesystem boundary."],
    };
  }

  const manifestBytes = readFileSync(manifestPath);
  const { manifest, errors } = parseInstallerManifest(manifestBytes);
  if (!manifest) return { target: "unsupported", manifestBytes, errors };

  const expected = expectedInstallerSeed(manifest, destination, projectDir, errors);
  validateInstallerSeedTree(
    destination,
    projectDir,
    expected.files,
    expected.directories,
    errors,
  );
  return {
    target: errors.length === 0 ? "installer-seed" : "unsupported",
    manifestBytes,
    errors,
  };
}

function renameOperationFor(entry: WalkEntry): MigrationOperation | null {
  const name = basename(entry.relative);
  if (entry.kind === "file" && name === UPSTREAM_STATE_FILE) {
    return {
      kind: "rename",
      path: entry.relative,
      to: toPosix(join(dirname(entry.relative), DESTINATION_STATE_FILE)),
    };
  }
  if (entry.relative === UPSTREAM_CLONE_ID) {
    return { kind: "rename", path: entry.relative, to: DESTINATION_CLONE_ID };
  }
  if (entry.kind !== "directory" && entry.kind !== "symlink") return null;
  const renamed = renamedKnowledgePath(entry.relative);
  return renamed
    ? { kind: "rename", path: entry.relative, to: renamed }
    : null;
}

function rewriteOperationFor(entry: WalkEntry): MigrationOperation | null {
  if (
    entry.kind !== "file" ||
    !isRegularFile(entry.absolute) ||
    isHistoricalText(entry.relative)
  ) {
    return null;
  }
  const bytes = readFileSync(entry.absolute);
  if (!isUtf8(bytes)) return null;
  const replacements = rewriteOperationalText(bytes.toString("utf-8")).replacements;
  return replacements > 0
    ? { kind: "rewrite", path: entry.relative, replacements }
    : null;
}

function buildOperations(
  source: string,
  sourceRelative: string,
  gitignoreBefore: string | null,
  gitignoreAfter: string | null,
  target: MigrationTarget,
): MigrationOperation[] {
  const operations: MigrationOperation[] = [
    { kind: "move", path: toPosix(sourceRelative), to: DESTINATION_NAMESPACE },
  ];
  if (target === "installer-seed") {
    operations.push({ kind: "preserve", path: toPosix(INSTALLER_MANIFEST) });
  }

  for (const entry of walkTree(source)) {
    if (isDiscardedPath(entry.relative)) {
      operations.push({ kind: "delete", path: entry.relative });
      continue;
    }
    const rename = renameOperationFor(entry);
    if (rename) operations.push(rename);
    const rewrite = rewriteOperationFor(entry);
    if (rewrite) operations.push(rewrite);
  }

  if (
    gitignoreBefore !== null &&
    gitignoreAfter !== null &&
    gitignoreBefore !== gitignoreAfter
  ) {
    operations.push({ kind: "gitignore", path: ".gitignore" });
  }
  return sortOperations(operations);
}

interface CheckCollector {
  checks: MigrationCheck[];
  errors: string[];
  add(id: string, pass: boolean, detail: string): void;
}

function createCheckCollector(): CheckCollector {
  const checks: MigrationCheck[] = [];
  const errors: string[] = [];
  return {
    checks,
    errors,
    add(id, pass, detail) {
      checks.push({ id, pass, detail });
      if (!pass) errors.push(detail);
    },
  };
}

function inspectGitRepository(projectInput: string, collector: CheckCollector): string {
  const result = git(projectInput, ["rev-parse", "--show-toplevel"]);
  if (!result.ok) {
    collector.add(
      "git-repository",
      false,
      "Project directory is not inside a Git repository.",
    );
    return projectInput;
  }
  try {
    const projectDir = canonicalExisting(projectInput);
    const root = canonicalExisting(result.stdout.trim());
    const exactRoot = root === projectDir;
    collector.add(
      "git-repository",
      exactRoot,
      exactRoot
        ? "Project directory is the Git worktree root."
        : "Project directory must be the Git worktree root.",
    );
    return projectDir;
  } catch {
    collector.add(
      "git-repository",
      false,
      "Project or Git root could not be canonicalised.",
    );
    return projectInput;
  }
}

function inspectCleanWorktree(projectDir: string, collector: CheckCollector): void {
  const clean = git(projectDir, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const pass = clean.ok && clean.stdout.length === 0;
  collector.add(
    "git-clean",
    pass,
    pass ? "Git worktree is clean." : "Git worktree must be clean before migration.",
  );
}

interface SourceInspection {
  source: string;
  exists: boolean;
  withinProject: boolean;
}

function destinationDevice(path: string): number {
  const actual = lstatSync(path).dev;
  return process.env.AMADEUS_MIGRATE_TEST_DESTINATION_DEVICE_MISMATCH === "1"
    ? actual + 1
    : actual;
}

function inspectSourceRoot(
  projectDir: string,
  sourceInput: string,
  destination: string,
  collector: CheckCollector,
): SourceInspection {
  if (!pathEntryExists(sourceInput)) {
    collector.add("source", false, "Migration source does not exist: " + sourceInput);
    collector.add(
      "source-boundary",
      false,
      "Migration source must be contained by the Git worktree.",
    );
    collector.add(
      "same-filesystem",
      false,
      "Filesystem identity cannot be checked without a source.",
    );
    return { source: sourceInput, exists: false, withinProject: false };
  }

  const stat = lstatSync(sourceInput);
  const isDirectory = stat.isDirectory() && !stat.isSymbolicLink();
  collector.add(
    "source",
    isDirectory,
    isDirectory
      ? "Migration source is a real directory."
      : "Migration source must be a real directory and not a symlink.",
  );
  if (!isDirectory) {
    collector.add(
      "source-boundary",
      false,
      "Migration source must be contained by the Git worktree.",
    );
    collector.add(
      "same-filesystem",
      false,
      "Filesystem identity cannot be checked without a source directory.",
    );
    return { source: sourceInput, exists: false, withinProject: false };
  }

  const source = canonicalExisting(sourceInput);
  const withinProject = isInside(projectDir, source) && source !== destination;
  collector.add(
    "source-boundary",
    withinProject,
    withinProject
      ? "Migration source is contained by the Git worktree."
      : "Migration source must be contained by the Git worktree and differ from the destination.",
  );
  const sourceDevice = lstatSync(source).dev;
  const projectDevice = lstatSync(projectDir).dev;
  const destinationFilesystem = pathEntryExists(destination)
    ? destinationDevice(destination)
    : lstatSync(dirname(destination)).dev;
  const sameFilesystem =
    sourceDevice === projectDevice && sourceDevice === destinationFilesystem;
  collector.add(
    "same-filesystem",
    sameFilesystem,
    sameFilesystem
      ? "Source, destination, and Git worktree are on the same filesystem."
      : "Source, destination, and Git worktree must be on the same filesystem.",
  );
  return { source, exists: true, withinProject };
}

function realDirectoryNames(root: string): string[] {
  if (!pathEntryExists(root)) return [];
  return readdirSync(root)
    .sort()
    .filter((name) => {
      const entry = lstatSync(join(root, name));
      return entry.isDirectory() && !entry.isSymbolicLink();
    });
}

function inspectOptionalCursor(
  path: string,
  allowed: ReadonlySet<string>,
  id: string,
  label: string,
  collector: CheckCollector,
): void {
  if (!pathEntryExists(path)) return;
  const regular = isRegularFile(path);
  const bytes = regular ? readFileSync(path) : null;
  const validUtf8 = bytes !== null && isUtf8(bytes);
  const value = validUtf8 ? bytes.toString("utf-8").trim() : "";
  const pass = regular && validUtf8 && allowed.has(value);
  collector.add(
    id,
    pass,
    pass
      ? label + " cursor resolves."
      : label +
        " cursor must be a regular UTF-8 file without NUL bytes naming an existing workspace entry.",
  );
}

function registryReconciles(
  registry: readonly IntentRegistryEntry[],
  recordNames: readonly string[],
): boolean {
  if (registry.length !== recordNames.length) return false;
  const uuids = new Set(registry.map((entry) => entry.uuid));
  if (uuids.size !== registry.length) return false;
  const claimed = registry.map((entry) => registryRecordName(entry, recordNames));
  if (claimed.some((record) => record === null)) return false;
  return new Set(claimed).size === recordNames.length;
}

function inspectRecordState(
  space: string,
  recordPath: string,
  collector: CheckCollector,
): boolean {
  const recordName = basename(recordPath);
  const id = "state-" + space + "-" + recordName;
  const statePath = uniqueStatePath(recordPath, UPSTREAM_STATE_FILE);
  if (statePath === null) {
    collector.add(
      id,
      false,
      "Each record must contain exactly one regular " +
        UPSTREAM_STATE_FILE +
        " at its root; validation failed for " +
        space +
        "/" +
        recordName +
        ".",
    );
    return false;
  }

  const stateBytes = readFileSync(statePath);
  if (!isUtf8(stateBytes)) {
    collector.add(
      id,
      false,
      "State must be valid UTF-8 without NUL bytes for " +
        space +
        "/" +
        recordName +
        ".",
    );
    return false;
  }
  const state = stateBytes.toString("utf-8");
  const stateErrors = validateStateV7(state);
  const collisionPass = !pathEntryExists(join(recordPath, DESTINATION_STATE_FILE));
  const runtimePass =
    isEmptyRuntimeField(getStateField(state, "Worktree Path")) &&
    isEmptyRuntimeField(getStateField(state, "Bolt Refs"));
  const pass = stateErrors.length === 0 && collisionPass && runtimePass;
  collector.add(
    id,
    pass,
    pass
      ? "State Version 7 and runtime guards pass for " + space + "/" + recordName + "."
      : "State validation failed for " +
          space +
          "/" +
          recordName +
          ": " +
          [
            ...stateErrors,
            ...(collisionPass ? [] : ["state rename target exists"]),
            ...(runtimePass ? [] : ["Bolt, swarm, or worktree runtime is active"]),
          ].join("; ") +
          ".",
  );
  return pass;
}

function isPreIntentLayout(intentsRoot: string, space: string): boolean {
  if (!pathEntryExists(intentsRoot)) return true;
  const stat = lstatSync(intentsRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
  if (
    pathEntryExists(join(intentsRoot, "intents.json")) ||
    pathEntryExists(join(intentsRoot, "active-intent"))
  ) {
    return false;
  }
  return walkTree(intentsRoot).every((entry) => {
    const topLevel = entry.relative.split("/")[0] || "";
    const workspaceRelative = [
      "spaces",
      space,
      "intents",
      entry.relative,
    ].join("/");
    return (
      topLevel.startsWith(UPSTREAM_RUNTIME_PREFIX) &&
      isDiscardedPath(workspaceRelative)
    );
  });
}

function inspectSpace(
  spacesRoot: string,
  space: string,
  collector: CheckCollector,
): number {
  if (space === "help") {
    collector.add(
      "reserved-space-" + space,
      false,
      "The reserved space slug help cannot be migrated.",
    );
  }
  const intentsRoot = join(spacesRoot, space, "intents");
  if (isPreIntentLayout(intentsRoot, space)) {
    collector.add(
      "registry-" + space,
      true,
      "No Intent records, registry, or cursor exist for space " + space + ".",
    );
    return 0;
  }
  if (
    !pathEntryExists(intentsRoot) ||
    !lstatSync(intentsRoot).isDirectory() ||
    lstatSync(intentsRoot).isSymbolicLink()
  ) {
    collector.add(
      "registry-" + space,
      false,
      "Intent root must be a real directory for space " + space + ".",
    );
    return 0;
  }
  const registry = readRegistry(join(intentsRoot, "intents.json"));
  if (registry === null) {
    collector.add(
      "registry-" + space,
      false,
      "Intent registry is missing or malformed for space " + space + ".",
    );
    return 0;
  }
  const recordPaths = recordDirectories(intentsRoot);
  const recordNames = recordPaths.map((path) => basename(path));
  for (const entry of registry) {
    if (entry.slug === "help") {
      collector.add(
        "reserved-intent-" + space,
        false,
        "The reserved intent slug help cannot be migrated.",
      );
    }
  }
  const registryPass = registryReconciles(registry, recordNames);
  collector.add(
    "registry-" + space,
    registryPass,
    registryPass
      ? "Intent registry and record directories reconcile for space " + space + "."
      : "Intent registry and record directories do not reconcile for space " + space + ".",
  );
  inspectOptionalCursor(
    join(intentsRoot, "active-intent"),
    new Set(recordNames),
    "active-intent-" + space,
    "Active intent",
    collector,
  );
  let stateCount = 0;
  for (const recordPath of recordPaths) {
    if (inspectRecordState(space, recordPath, collector)) stateCount++;
  }
  return stateCount;
}

function inspectWorkspaceStructure(
  source: string,
  collector: CheckCollector,
): number {
  const composePending = join(source, UPSTREAM_RUNTIME_PREFIX + "compose-pending");
  const noCompose = !pathEntryExists(composePending);
  collector.add(
    "compose-pending",
    noCompose,
    noCompose
      ? "No unresolved compose marker was found."
      : "An unresolved upstream compose marker must be resolved before migration.",
  );

  const spacesRoot = join(source, "spaces");
  const validSpacesRoot =
    pathEntryExists(spacesRoot) &&
    lstatSync(spacesRoot).isDirectory() &&
    !lstatSync(spacesRoot).isSymbolicLink();
  if (!validSpacesRoot) {
    collector.add("workspace-layout", false, "Source does not contain a v2 spaces directory.");
    return 0;
  }
  const spaces = realDirectoryNames(spacesRoot);
  collector.add(
    "workspace-layout",
    spaces.length > 0,
    spaces.length > 0
      ? "Source contains " + spaces.length + " space(s)."
      : "Source contains no spaces.",
  );
  inspectOptionalCursor(
    join(source, "active-space"),
    new Set(spaces),
    "active-space",
    "Active space",
    collector,
  );
  return spaces.reduce(
    (count, space) => count + inspectSpace(spacesRoot, space, collector),
    0,
  );
}

function inspectDestinationRuntimeScratch(
  source: string,
  collector: CheckCollector,
): void {
  const collisions = walkTree(source)
    .filter((entry) =>
      isPrefixedRuntimeScratchPath(entry.relative, DESTINATION_RUNTIME_PREFIX)
    )
    .map((entry) => entry.relative)
    .sort(compareCodePoints);
  collector.add(
    "destination-runtime-scratch",
    collisions.length === 0,
    collisions.length === 0
      ? "The source contains no destination-named runtime scratch."
      : "The source contains destination-named runtime scratch: " +
          collisions.join(", "),
  );
}

function inspectWritableReservedPaths(
  source: string,
  target: MigrationTarget,
  collector: CheckCollector,
): void {
  const cloneId = join(source, UPSTREAM_CLONE_ID);
  const cloneStat = pathEntryExists(cloneId) ? lstatSync(cloneId) : null;
  const cloneSafe =
    cloneStat === null ||
    cloneStat.isSymbolicLink() ||
    (cloneStat.isFile() && cloneStat.nlink === 1);
  collector.add(
    "clone-id-entry",
    cloneSafe,
    cloneSafe
      ? "The upstream clone identifier is absent, a symlink, or a single-link regular file."
      : "The upstream clone identifier must be a symlink or single-link regular file.",
  );

  if (target !== "installer-seed") {
    collector.add(
      "source-installer-entry",
      true,
      "The source installer path is preserved because no seed manifest will be restored.",
    );
    return;
  }

  const installerDir = join(source, ".installer");
  const installerExists = pathEntryExists(installerDir);
  const installerDirectorySafe =
    !installerExists ||
    (lstatSync(installerDir).isDirectory() &&
      !lstatSync(installerDir).isSymbolicLink());
  const sourceManifest = join(installerDir, basename(INSTALLER_MANIFEST));
  const manifestPathSafe =
    installerDirectorySafe &&
    !pathTraversesSymlink(source, sourceManifest);
  collector.add(
    "source-installer-entry",
    installerDirectorySafe && manifestPathSafe,
    installerDirectorySafe && manifestPathSafe
      ? "The reserved source installer path cannot redirect migration writes."
      : "The reserved source .installer path and manifest must not be symlinks or non-directories.",
  );
}

function inspectRegisteredWorktrees(
  projectDir: string,
  warnings: string[],
  collector: CheckCollector,
): void {
  const worktrees = git(projectDir, ["worktree", "list", "--porcelain"]);
  const segment = "/." + UPSTREAM_NAMESPACE + "/worktrees/";
  const active =
    worktrees.ok &&
    worktrees.stdout
      .split(/\r?\n/)
      .some(
        (line) =>
          line.startsWith("worktree ") && toPosix(line).includes(segment),
      );
  collector.add(
    "active-worktrees",
    worktrees.ok && !active,
    !worktrees.ok
      ? "Registered Git worktrees could not be inspected."
      : active
        ? "Registered upstream worktrees must be resolved before migration."
        : "No registered upstream worktree is active.",
  );
  const stale = join(projectDir, "." + UPSTREAM_NAMESPACE, "worktrees");
  if (pathEntryExists(stale) && worktrees.ok && !active) {
    warnings.push("A stale upstream worktree directory remains outside the workspace: " + stale);
  }
}

function inspectRenameCollisions(
  source: string,
  operations: readonly MigrationOperation[],
  collector: CheckCollector,
): void {
  const collisions = operations
    .filter((operation) => operation.kind === "rename" && operation.to !== undefined)
    .filter((operation) => pathEntryExists(join(source, operation.to || "")))
    .map((operation) => operation.to || operation.path)
    .sort();
  collector.add(
    "rename-collisions",
    collisions.length === 0,
    collisions.length === 0
      ? "No migration rename target exists."
      : "Migration rename targets already exist: " + collisions.join(", "),
  );
}

function inspectDestination(
  destination: string,
  projectDir: string,
  collector: CheckCollector,
): InstallerSeedInspection {
  const seed = inspectInstallerSeed(destination, projectDir);
  let detail = seed.errors.join(" ");
  if (seed.errors.length === 0) {
    detail = seed.target === "absent"
      ? "Destination is absent."
      : "Destination is a pristine installer-managed seed.";
  }
  collector.add("destination", seed.errors.length === 0, detail);
  return seed;
}

function inspectVersionCompatibility(
  projectDir: string,
  warnings: string[],
  collector: CheckCollector,
): SourceVersionInspection {
  const version = discoverSourceVersion(projectDir);
  warnings.push(...version.warnings);
  warnings.push(
    ...version.oldEngineFiles.map(
      (path) => "Legacy upstream engine file remains outside the workspace: " + path,
    ),
  );
  collector.add(
    "source-version",
    version.errors.length === 0,
    version.errors.length === 0
      ? "Source version " + version.version + " is structurally admissible."
      : version.errors.join(" "),
  );
  return version;
}

function inspectGitignore(
  projectDir: string,
  collector: CheckCollector,
): string | null {
  const path = join(projectDir, ".gitignore");
  const exists = pathEntryExists(path);
  const regular = !exists || isRegularFile(path);
  const bytes = exists && regular ? readFileSync(path) : null;
  const validUtf8 = bytes === null || isUtf8(bytes);
  const pass = regular && validUtf8;
  collector.add(
    "gitignore-structure",
    pass,
    pass
      ? "Project .gitignore is absent or a regular UTF-8 file without NUL bytes."
      : !regular
        ? "Project .gitignore must be a regular file when present."
        : "Project .gitignore must be valid UTF-8 without NUL bytes.",
  );
  return bytes !== null && validUtf8 ? bytes.toString("utf-8") : null;
}

interface InstalledDoctorInspection {
  harness: string | null;
  utility: string | null;
  fingerprint: string | null;
  toolsFingerprint: string | null;
}

function invokedHarnessDir(projectDir: string): string | null {
  const relativeTools = toPosix(relative(projectDir, MIGRATOR_TOOLS_DIR));
  const parts = relativeTools.split("/");
  return parts.length === 2 &&
    parts[1] === "tools" &&
    INSTALLED_HARNESS_DIRS.includes(
      parts[0] as (typeof INSTALLED_HARNESS_DIRS)[number],
    )
    ? parts[0]
    : null;
}

function gitBlobHash(path: string, algorithm: "sha1" | "sha256"): string {
  const bytes = readFileSync(path);
  return createHash(algorithm)
    .update("blob " + bytes.length + "\0")
    .update(bytes)
    .digest("hex");
}

interface IndexedToolTree {
  algorithm: "sha1" | "sha256";
  entries: Map<string, { mode: string; hash: string }>;
}

function indexedToolTree(
  projectDir: string,
  relativeTools: string,
): IndexedToolTree | null {
  const staged = git(projectDir, ["ls-files", "--stage", "-z", "--", relativeTools]);
  const objectFormat = git(projectDir, ["rev-parse", "--show-object-format"]);
  if (!staged.ok || !objectFormat.ok) return null;
  const algorithm = objectFormat.stdout.trim();
  if (algorithm !== "sha1" && algorithm !== "sha256") return null;
  const entries = new Map<string, { mode: string; hash: string }>();
  for (const row of staged.stdout.split("\0").filter(Boolean)) {
    const match = row.match(/^(\d+) ([0-9a-f]+) \d+\t([\s\S]+)$/);
    if (!match) return null;
    entries.set(match[3], { mode: match[1], hash: match[2] });
  }
  return { algorithm, entries };
}

function committedToolEntryMatches(
  entry: WalkEntry,
  projectDir: string,
  rootDevice: number,
  indexed: IndexedToolTree,
): boolean {
  const stat = lstatSync(entry.absolute);
  if (entry.kind === "directory") return stat.dev === rootDevice;
  if (entry.kind !== "file" || !isRegularFile(entry.absolute) || stat.dev !== rootDevice) {
    return false;
  }
  const projectRelative = toPosix(relative(projectDir, entry.absolute));
  const expected = indexed.entries.get(projectRelative);
  const mode = (stat.mode & 0o111) !== 0 ? "100755" : "100644";
  return (
    expected !== undefined &&
    expected.mode === mode &&
    expected.hash === gitBlobHash(entry.absolute, indexed.algorithm)
  );
}

function committedToolsFingerprint(
  projectDir: string,
  harness: string,
): string | null {
  const toolsRoot = join(projectDir, harness, "tools");
  if (
    !pathEntryExists(toolsRoot) ||
    pathTraversesSymlink(projectDir, toolsRoot) ||
    !lstatSync(toolsRoot).isDirectory()
  ) {
    return null;
  }
  const relativeTools = toPosix(relative(projectDir, toolsRoot));
  const indexed = indexedToolTree(projectDir, relativeTools);
  if (indexed === null) return null;
  const rootDevice = lstatSync(toolsRoot).dev;
  const entries = walkTree(toolsRoot);
  const files = entries.filter((entry) => entry.kind !== "directory");
  if (files.length === 0 || files.length !== indexed.entries.size) return null;
  if (!entries.every((entry) => committedToolEntryMatches(entry, projectDir, rootDevice, indexed))) {
    return null;
  }
  return sourceTreeFingerprint(toolsRoot);
}

function inspectInstalledDoctor(
  projectDir: string,
  collector: CheckCollector,
): InstalledDoctorInspection {
  const invokedHarness = invokedHarnessDir(projectDir);
  const harnessOrder = invokedHarness === null
    ? [...INSTALLED_HARNESS_DIRS]
    : [
        invokedHarness,
        ...INSTALLED_HARNESS_DIRS.filter((harness) => harness !== invokedHarness),
      ];
  const candidates = harnessOrder.map((harness) => ({
    harness,
    utility: join(projectDir, harness, "tools", "amadeus-utility.ts"),
  }));
  const valid = candidates.flatMap(({ harness, utility }) => {
    if (
      !pathEntryExists(utility) ||
      pathTraversesSymlink(projectDir, utility) ||
      !isRegularFile(utility)
    ) {
      return [];
    }
    const toolsFingerprint = committedToolsFingerprint(projectDir, harness);
    if (toolsFingerprint === null) return [];
    const bytes = readFileSync(utility);
    if (!isUtf8(bytes)) return [];
    const source = bytes.toString("utf-8");
    if (!source.includes("function handleDoctor(") || !source.includes('case "doctor"')) {
      return [];
    }
    return [{ harness, utility, toolsFingerprint }];
  });
  const selected = valid[0];
  collector.add(
    "installed-engine",
    selected !== undefined,
    selected
      ? "A committed project-local Amadeus utility will run doctor from " +
          toPosix(relative(projectDir, selected.utility)) +
          "."
      : "Migration requires a committed regular Amadeus utility at .claude/tools/amadeus-utility.ts, .codex/tools/amadeus-utility.ts, or .kiro/tools/amadeus-utility.ts.",
  );
  return selected
    ? {
        harness: selected.harness,
        utility: selected.utility,
        fingerprint: pathFingerprint(selected.utility),
        toolsFingerprint: selected.toolsFingerprint,
      }
    : { harness: null, utility: null, fingerprint: null, toolsFingerprint: null };
}

function planMigrationOperations(input: {
  projectDir: string;
  sourceInspection: SourceInspection;
  gitignoreBefore: string | null;
  gitignoreAfter: string | null;
  target: MigrationTarget;
  sourceEntriesSafe: boolean;
  collector: CheckCollector;
}): { sourceRelative: string; operations: MigrationOperation[] } {
  const { sourceInspection } = input;
  if (
    !sourceInspection.exists ||
    !sourceInspection.withinProject ||
    !input.sourceEntriesSafe
  ) {
    return { sourceRelative: "", operations: [] };
  }
  const sourceRelative = toPosix(relative(input.projectDir, sourceInspection.source));
  const operations = buildOperations(
    sourceInspection.source,
    sourceRelative,
    input.gitignoreBefore,
    input.gitignoreAfter,
    input.target,
  );
  inspectRenameCollisions(sourceInspection.source, operations, input.collector);
  return { sourceRelative, operations };
}

function inspectMigrationSource(input: {
  sourceInspection: SourceInspection;
  target: MigrationTarget;
  projectDir: string;
  warnings: string[];
  collector: CheckCollector;
}): { sourceEntriesSafe: boolean; safeSource: boolean; stateCount: number } {
  const { sourceInspection, collector } = input;
  if (!sourceInspection.exists || !sourceInspection.withinProject) {
    return { sourceEntriesSafe: false, safeSource: false, stateCount: 0 };
  }
  if (!inspectSourceMountBoundaries(sourceInspection.source, collector)) {
    return { sourceEntriesSafe: false, safeSource: false, stateCount: 0 };
  }
  const sourceEntriesSafe = inspectSourceEntryTypes(
    sourceInspection.source,
    collector,
  );
  if (!sourceEntriesSafe) {
    return { sourceEntriesSafe: false, safeSource: false, stateCount: 0 };
  }

  const stateCount = inspectWorkspaceStructure(sourceInspection.source, collector);
  inspectDestinationRuntimeScratch(sourceInspection.source, collector);
  inspectWritableReservedPaths(sourceInspection.source, input.target, collector);
  inspectAuditEntries(sourceInspection.source, collector);
  inspectStateInventory(sourceInspection.source, stateCount, collector);
  inspectRegisteredWorktrees(input.projectDir, input.warnings, collector);
  return { sourceEntriesSafe: true, safeSource: true, stateCount };
}

function inspectMigration(options: MigrationOptions): Inspection {
  const projectInput = resolve(options.projectDir || process.cwd());
  const sourceInput = resolve(projectInput, options.from || UPSTREAM_NAMESPACE);
  const mode: MigrationMode = options.apply ? "apply" : "dry-run";
  const warnings: string[] = [];
  const collector = createCheckCollector();
  const projectDir = inspectGitRepository(projectInput, collector);
  const destination = join(projectDir, DESTINATION_NAMESPACE);
  inspectCleanWorktree(projectDir, collector);
  const doctor = inspectInstalledDoctor(projectDir, collector);
  const sourceInspection = inspectSourceRoot(
    projectDir,
    sourceInput,
    destination,
    collector,
  );
  const { source } = sourceInspection;
  const seed = inspectDestination(destination, projectDir, collector);
  const version = inspectVersionCompatibility(projectDir, warnings, collector);

  const { sourceEntriesSafe, safeSource, stateCount } = inspectMigrationSource({
    sourceInspection,
    target: seed.target,
    projectDir,
    warnings,
    collector,
  });

  const gitignoreBefore = inspectGitignore(projectDir, collector);
  const sourceRelativeForGitignore =
    sourceInspection.exists && sourceInspection.withinProject
      ? toPosix(relative(projectDir, source))
      : UPSTREAM_NAMESPACE;
  const gitignoreAfter =
    gitignoreBefore === null
      ? null
      : transformedGitignore(gitignoreBefore, sourceRelativeForGitignore);
  const { sourceRelative, operations } = planMigrationOperations({
    projectDir,
    sourceInspection,
    gitignoreBefore,
    gitignoreAfter,
    target: seed.target,
    sourceEntriesSafe,
    collector,
  });
  const auditBefore = safeSource ? collectAuditHashes(source) : {};
  const sourceFingerprint = safeSource
    ? sourceTreeFingerprint(source)
    : null;
  const destinationFingerprint = seed.target === "installer-seed"
    ? sourceTreeFingerprint(destination)
    : null;
  const gitignoreFingerprint = pathFingerprint(join(projectDir, ".gitignore"));

  const report: MigrationReport = {
    schemaVersion: 1,
    status: collector.errors.length === 0 ? "ready" : "refused",
    mode,
    source,
    destination,
    sourceVersion: version.version,
    target: seed.target,
    checks: collector.checks,
    operations,
    warnings: [...new Set(warnings)].sort(),
    evidence: {
      stateFiles: stateCount,
      auditBefore,
    },
  };
  return {
    report,
    projectDir,
    sourceRelative,
    sourceFingerprint,
    destinationFingerprint,
    gitignoreFingerprint,
    gitignoreBefore,
    gitignoreAfter,
    installerManifestBytes: seed.manifestBytes,
    doctorHarness: doctor.harness,
    doctorUtility: doctor.utility,
    doctorUtilityFingerprint: doctor.fingerprint,
    doctorToolsFingerprint: doctor.toolsFingerprint,
  };
}

function copyTree(source: string, destination: string): void {
  cpSync(source, destination, {
    recursive: true,
    dereference: false,
    preserveTimestamps: true,
    verbatimSymlinks: true,
  });
}

function applyPlannedTransform(
  root: string,
  operations: readonly MigrationOperation[],
): void {
  for (const operation of operations.filter((entry) => entry.kind === "rewrite")) {
    const path = join(root, operation.path);
    if (!existsSync(path) || lstatSync(path).isSymbolicLink()) continue;
    const before = readFileSync(path, "utf-8");
    const rewritten = rewriteOperationalText(before);
    writeFileSync(path, rewritten.output, "utf-8");
  }

  const deletes = operations
    .filter((entry) => entry.kind === "delete")
    .sort(
      (left, right) =>
        left.path.split("/").length - right.path.split("/").length ||
        compareCodePoints(left.path, right.path),
    );
  for (const operation of deletes) {
    rmSync(join(root, operation.path), { recursive: true, force: true });
  }

  const renames = operations
    .filter((entry) => entry.kind === "rename" && entry.to !== undefined)
    .sort(
      (left, right) =>
        right.path.split("/").length - left.path.split("/").length ||
        compareCodePoints(left.path, right.path),
    );
  for (const operation of renames) {
    const from = join(root, operation.path);
    const to = join(root, operation.to || "");
    if (!pathEntryExists(from)) continue;
    if (pathEntryExists(to)) {
      throw new Error("Migration rename target already exists: " + operation.to);
    }
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }
}

function convertedRecordDirectories(intentsRoot: string): string[] {
  if (!existsSync(intentsRoot)) return [];
  return readdirSync(intentsRoot)
    .sort()
    .filter((name) => !name.startsWith("."))
    .map((name) => join(intentsRoot, name))
    .filter((path) => {
      const stat = lstatSync(path);
      return !stat.isSymbolicLink() && stat.isDirectory();
    });
}

function assertConvertedPathEntry(entry: WalkEntry): void {
  if (!isSafeAuditEntry(entry)) {
    throw new Error("Converted audit entry is a symlink or non-regular file: " + entry.relative);
  }
  if (basename(entry.relative) === UPSTREAM_STATE_FILE) {
    throw new Error("Upstream state filename remains after conversion: " + entry.relative);
  }
  if (entry.relative === UPSTREAM_CLONE_ID) {
    throw new Error("Upstream clone identifier remains after conversion.");
  }
  if (
    entry.relative === DESTINATION_CLONE_ID &&
    entry.kind !== "symlink" &&
    (entry.kind !== "file" || !isRegularFile(entry.absolute))
  ) {
    throw new Error("Converted clone identifier is not a regular file or symlink.");
  }
  if (
    (entry.kind === "directory" || entry.kind === "symlink") &&
    renamedKnowledgePath(entry.relative) !== null
  ) {
    throw new Error("Upstream knowledge directory remains after conversion: " + entry.relative);
  }
  if (isForbiddenConvertedRuntimePath(entry.relative)) {
    throw new Error("Discarded runtime path remains after conversion: " + entry.relative);
  }
}

function assertConvertedStateEntry(entry: WalkEntry): boolean {
  if (basename(entry.relative) !== DESTINATION_STATE_FILE) return false;
  if (entry.kind !== "file" || !isRegularFile(entry.absolute)) {
    throw new Error("Converted state is not a regular file: " + entry.relative);
  }
  const bytes = readFileSync(entry.absolute);
  if (!isUtf8(bytes)) {
    throw new Error("Converted state is not valid UTF-8: " + entry.relative);
  }
  const state = bytes.toString("utf-8");
  const errors = validateStateV7(state);
  if (errors.length > 0) {
    throw new Error(
      "Converted state failed validation: " +
        entry.relative +
        ": " +
        errors.join("; "),
    );
  }
  if (rewriteOperationalText(state).replacements > 0) {
    throw new Error("Operational upstream reference remains in state: " + entry.relative);
  }
  return true;
}

function assertConvertedOperationalText(entry: WalkEntry): void {
  if (entry.kind !== "file" || isHistoricalText(entry.relative)) return;
  if (!isRegularFile(entry.absolute)) {
    throw new Error("Converted source entry is not a regular file: " + entry.relative);
  }
  const bytes = readFileSync(entry.absolute);
  if (!isUtf8(bytes)) return;
  if (rewriteOperationalText(bytes.toString("utf-8")).replacements > 0) {
    throw new Error("Operational upstream reference remains: " + entry.relative);
  }
}

function assertConvertedEntry(entry: WalkEntry): boolean {
  assertConvertedPathEntry(entry);
  if (assertConvertedStateEntry(entry)) return true;
  assertConvertedOperationalText(entry);
  return false;
}

function assertConvertedSpace(spacesRoot: string, space: string): void {
  const intentsRoot = join(spacesRoot, space, "intents");
  if (!pathEntryExists(intentsRoot)) return;
  if (
    !lstatSync(intentsRoot).isDirectory() ||
    lstatSync(intentsRoot).isSymbolicLink()
  ) {
    throw new Error("Converted intent root is invalid for space " + space + ".");
  }
  if (readdirSync(intentsRoot).length === 0) return;
  const registry = readRegistry(join(intentsRoot, "intents.json"));
  if (registry === null) {
    throw new Error("Converted intent registry is missing or malformed for space " + space + ".");
  }
  const records = convertedRecordDirectories(intentsRoot).map((path) => basename(path));
  if (!registryReconciles(registry, records)) {
    throw new Error("Converted intent registry does not reconcile for space " + space + ".");
  }
  for (const record of records) {
    if (uniqueStatePath(join(intentsRoot, record), DESTINATION_STATE_FILE) === null) {
      throw new Error(
        "Converted record does not contain exactly one state file: " +
          space +
          "/" +
          record +
          ".",
      );
    }
  }
  const cursorPath = join(intentsRoot, "active-intent");
  if (pathEntryExists(cursorPath)) {
    const cursor = isRegularFile(cursorPath)
      ? readFileSync(cursorPath, "utf-8").trim()
      : "";
    if (!records.includes(cursor)) {
      throw new Error("Converted active intent cursor does not resolve for space " + space + ".");
    }
  }
}

function assertConvertedRegistry(root: string): void {
  const spacesRoot = join(root, "spaces");
  const spaces = realDirectoryNames(spacesRoot);
  for (const space of spaces) assertConvertedSpace(spacesRoot, space);
  const activeSpacePath = join(root, "active-space");
  if (pathEntryExists(activeSpacePath)) {
    const active = isRegularFile(activeSpacePath)
      ? readFileSync(activeSpacePath, "utf-8").trim()
      : "";
    if (!spaces.includes(active)) {
      throw new Error("Converted active space cursor does not resolve.");
    }
  }
}

function assertConvertedWorkspace(
  root: string,
  expectedStates: number,
  auditBefore: Readonly<Record<string, string>>,
): Record<string, string> {
  let states = 0;
  for (const entry of walkTree(root)) {
    if (assertConvertedEntry(entry)) states++;
  }
  if (states !== expectedStates) {
    throw new Error(
      "Converted state count mismatch: expected " + expectedStates + ", found " + states + ".",
    );
  }

  assertConvertedRegistry(root);

  const auditAfter = collectAuditHashes(root);
  if (JSON.stringify(auditAfter) !== JSON.stringify(auditBefore)) {
    throw new Error("Audit shards changed during workspace conversion.");
  }
  return auditAfter;
}

function runDoctor(inspection: Inspection): {
  status: "passed";
  output: string;
} {
  if (inspection.doctorHarness === null || inspection.doctorUtility === null) {
    throw new Error("The installed Amadeus doctor utility is unavailable.");
  }
  const restoreTestHealthDir = injectDoctorHealthDirectorySymlinkForTest(inspection);
  const result = (() => {
    try {
      const restoreTestUtility = injectDoctorUtilitySymlinkForTest(inspection);
      try {
        assertDoctorUtilityStable(inspection);
        return spawnSync(
          process.execPath,
          [inspection.doctorUtility, "doctor", "--project-dir", inspection.projectDir],
          {
            cwd: inspection.projectDir,
            encoding: "utf-8",
            env: {
              ...process.env,
              AMADEUS_HARNESS_DIR: inspection.doctorHarness,
              AMADEUS_MIGRATION_DOCTOR: "1",
            },
          },
        );
      } finally {
        restoreTestUtility();
      }
    } finally {
      restoreTestHealthDir();
    }
  })();
  const output = (result.stdout || "") + (result.stderr || "");
  if (result.status !== 0) {
    throw new Error("Post-migration doctor failed:\n" + output.trim());
  }
  return { status: "passed", output: output.trim() };
}

function injectDoctorHealthDirectorySymlinkForTest(
  inspection: Inspection,
): () => void {
  const target = process.env.AMADEUS_MIGRATE_TEST_DOCTOR_HEALTH_DIR_SYMLINK;
  if (process.env.NODE_ENV !== "test" || !target) return () => undefined;
  const state = walkTree(inspection.report.destination).find(
    (entry) =>
      entry.kind === "file" && basename(entry.relative) === DESTINATION_STATE_FILE
  );
  if (!state) throw new Error("Migration test converted state was not found.");
  const healthDir = join(
    dirname(state.absolute),
    DESTINATION_RUNTIME_PREFIX + "hooks-health",
  );
  if (pathEntryExists(healthDir)) {
    throw new Error("Migration test doctor health directory already exists.");
  }
  symlinkSync(
    target,
    healthDir,
    process.platform === "win32" ? "junction" : "dir",
  );
  return () => {
    if (
      !lstatSync(healthDir).isSymbolicLink() ||
      readlinkSync(healthDir) !== target
    ) {
      throw new Error("Migration doctor changed the test health directory symlink.");
    }
    rmSync(healthDir, { force: true });
  };
}

function assertDoctorUtilityStable(inspection: Inspection): void {
  const utility = inspection.doctorUtility;
  if (
    utility === null ||
    inspection.doctorUtilityFingerprint === null ||
    inspection.doctorHarness === null ||
    inspection.doctorToolsFingerprint === null ||
    pathTraversesSymlink(inspection.projectDir, utility) ||
    !isRegularFile(utility) ||
    pathFingerprint(utility) !== inspection.doctorUtilityFingerprint ||
    committedToolsFingerprint(
      inspection.projectDir,
      inspection.doctorHarness,
    ) !== inspection.doctorToolsFingerprint
  ) {
    throw new Error("The installed Amadeus doctor utility changed before execution.");
  }
}

function injectDoctorUtilitySymlinkForTest(
  inspection: Inspection,
): () => void {
  const target = process.env.AMADEUS_MIGRATE_TEST_DOCTOR_UTILITY_SYMLINK;
  const utility = inspection.doctorUtility;
  if (process.env.NODE_ENV !== "test" || !target || utility === null) {
    return () => undefined;
  }
  const backup = `${utility}.amadeus-migrate-test-backup`;
  renameSync(utility, backup);
  symlinkSync(target, utility);
  return () => {
    rmSync(utility, { force: true });
    renameSync(backup, utility);
  };
}

function auditFileBytes(root: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const entry of walkFilesWithoutFollowingSymlinks(root)) {
    if (!entry.relative.split("/").includes("audit")) continue;
    if (!isSafeAuditEntry(entry) || entry.kind !== "file") {
      throw new Error("Audit entry is a symlink or non-regular file: " + entry.relative);
    }
    files.set(entry.relative, readFileSync(entry.absolute));
  }
  return files;
}

function parseDoctorAuditSuffix(input: string, allowHeader: boolean): string[] | null {
  let suffix = input;
  if (allowHeader) {
    const header = "# AI-DLC Audit Log\n";
    if (!suffix.startsWith(header)) return null;
    suffix = suffix.slice(header.length);
  }
  const events: string[] = [];
  const block = /\n## [^\r\n]+\r?\n\*\*Timestamp\*\*: [^\r\n]+\r?\n\*\*Event\*\*: (GUARDRAIL_LOADED|HEALTH_CHECKED)\r?\n(?:\*\*[^*\r\n]+\*\*: [^\r\n]*\r?\n)*\r?\n---\r?\n/y;
  let offset = 0;
  while (offset < suffix.length) {
    block.lastIndex = offset;
    const match = block.exec(suffix);
    if (!match || match.index !== offset) return null;
    events.push(match[1]);
    offset = block.lastIndex;
  }
  return events;
}

type AuditAppendEvidence = NonNullable<MigrationEvidence["auditAppends"]>[number];

function existingAuditAppend(
  path: string,
  before: Buffer,
  after: Buffer | undefined,
): AuditAppendEvidence | null {
  if (!after) throw new Error("Doctor removed an audit shard: " + path);
  if (after.length < before.length || !after.subarray(0, before.length).equals(before)) {
    throw new Error("Doctor rewrote existing audit bytes: " + path);
  }
  const suffix = after.subarray(before.length);
  const events = parseDoctorAuditSuffix(suffix.toString("utf-8"), false);
  if (events === null) {
    throw new Error("Doctor appended malformed or unexpected audit bytes: " + path);
  }
  return suffix.length > 0 ? { path, bytes: suffix.length, events } : null;
}

function newAuditAppend(path: string, after: Buffer): AuditAppendEvidence {
  const events = parseDoctorAuditSuffix(after.toString("utf-8"), true);
  if (events === null || events.length === 0) {
    throw new Error("Doctor created an invalid audit shard: " + path);
  }
  return { path, bytes: after.length, events };
}

function assertAuditAppendOnly(
  originalRoot: string,
  destinationRoot: string,
): NonNullable<MigrationEvidence["auditAppends"]> {
  const beforeFiles = auditFileBytes(originalRoot);
  const afterFiles = auditFileBytes(destinationRoot);
  const appends: NonNullable<MigrationEvidence["auditAppends"]> = [];
  for (const [path, before] of beforeFiles) {
    const append = existingAuditAppend(path, before, afterFiles.get(path));
    if (append) appends.push(append);
  }
  for (const [path, after] of afterFiles) {
    if (beforeFiles.has(path)) continue;
    appends.push(newAuditAppend(path, after));
  }
  return appends.sort((left, right) => compareCodePoints(left.path, right.path));
}

function restoreGitignore(projectDir: string, contents: string | null): void {
  const path = join(projectDir, ".gitignore");
  if (contents === null) {
    rmSync(path, { force: true });
  } else {
    writeFileAtomically(path, contents);
  }
}

function writeFileAtomically(path: string, contents: string | Buffer): void {
  const temporary = path + ".amadeus-migrate-" + process.pid + ".tmp";
  const mode = pathEntryExists(path) ? lstatSync(path).mode : undefined;
  try {
    writeFileSync(temporary, contents, mode === undefined ? undefined : { mode });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

interface RollbackInput {
  projectDir: string;
  source: string;
  destination: string;
  originalBackup: string;
  seedBackup: string;
  target: MigrationTarget;
  gitignoreBefore: string | null;
  tempRoot: string;
  journal: MutationJournal;
  indexTree: string;
  indexPath: string;
  indexBytes: Buffer;
  sourceFingerprint: string;
  destinationFingerprint: string | null;
  gitignoreFingerprint: string;
}

function restoreRollbackFilesystem(input: RollbackInput): boolean {
  const sourceBackupExists = pathEntryExists(input.originalBackup);
  const seedBackupExists = pathEntryExists(input.seedBackup);
  if (input.journal.sourceMoveAttempted || seedBackupExists) {
    removeTreeSafely(input.destination);
  }
  if (!pathEntryExists(input.source) && sourceBackupExists) {
    renameSync(input.originalBackup, input.source);
  }
  if (seedBackupExists && input.target === "installer-seed") {
    renameSync(input.seedBackup, input.destination);
  }
  if (input.journal.gitignoreWriteAttempted) {
    restoreGitignore(input.projectDir, input.gitignoreBefore);
  }
  const sourceRestored =
    pathEntryExists(input.source) &&
    sourceTreeFingerprint(input.source) === input.sourceFingerprint;
  const destinationRestored = input.target === "installer-seed"
    ? input.destinationFingerprint !== null &&
      pathEntryExists(input.destination) &&
      sourceTreeFingerprint(input.destination) === input.destinationFingerprint
    : !pathEntryExists(input.destination);
  return (
    sourceRestored &&
    destinationRestored &&
    pathFingerprint(join(input.projectDir, ".gitignore")) === input.gitignoreFingerprint
  );
}

function restoreRollbackIndex(input: RollbackInput): boolean {
  writeFileAtomically(input.indexPath, input.indexBytes);
  if (!readFileSync(input.indexPath).equals(input.indexBytes)) return false;
  const index = git(input.projectDir, ["write-tree"]);
  if (!index.ok || index.stdout.trim() !== input.indexTree) return false;
  // `git write-tree` may refresh the cache-tree extension even though the
  // represented tree is unchanged. Restore the exact starting bytes again
  // after the semantic tree check so index flags/extensions survive rollback.
  writeFileAtomically(input.indexPath, input.indexBytes);
  return readFileSync(input.indexPath).equals(input.indexBytes);
}

function rollbackMigration(input: RollbackInput): boolean {
  try {
    const filesystemRestored = restoreRollbackFilesystem(input);
    removeTreeSafely(input.tempRoot);
    const indexRestored = restoreRollbackIndex(input);
    const status = git(input.projectDir, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]);
    return indexRestored && status.ok && status.stdout.length === 0 && filesystemRestored;
  } catch {
    return false;
  }
}

interface MutationJournal {
  seedMoveAttempted: boolean;
  sourceMoveAttempted: boolean;
  destinationReplaceAttempted: boolean;
  gitignoreWriteAttempted: boolean;
  indexTouched: boolean;
}

function mutationAttempted(journal: MutationJournal): boolean {
  return Object.values(journal).some(Boolean);
}

function stagingParent(projectDir: string, source: string): string | null {
  const candidates = [dirname(projectDir)];
  const gitDirectory = git(projectDir, ["rev-parse", "--absolute-git-dir"]);
  if (gitDirectory.ok && gitDirectory.stdout.trim() !== "") {
    candidates.push(gitDirectory.stdout.trim());
  }
  const sourceDevice = statSync(source).dev;
  return (
    candidates.find((candidate) => {
      try {
        return statSync(candidate).isDirectory() && statSync(candidate).dev === sourceDevice;
      } catch {
        return false;
      }
    }) ?? null
  );
}

function injectMigrationFailure(point: string): void {
  if (process.env.AMADEUS_MIGRATE_TEST_FAIL_AT === point) {
    throw new Error("Injected migration failure at " + point + ".");
  }
}

function appendMigrationTestMutation(
  root: string,
  relativePath: string,
  marker: string,
): void {
  const target = resolve(root, relativePath);
  if (
    !isInside(root, target) ||
    pathTraversesSymlink(root, target) ||
    !isRegularFile(target)
  ) {
    throw new Error("Unsafe migration test mutation path.");
  }
  writeFileSync(
    target,
    Buffer.concat([readFileSync(target), Buffer.from(marker, "utf-8")]),
  );
}

function injectSourceMutationAfterCopy(source: string): void {
  const relativePath = process.env.AMADEUS_MIGRATE_TEST_MUTATE_AFTER_COPY;
  if (process.env.NODE_ENV !== "test" || !relativePath) return;
  appendMigrationTestMutation(
    source,
    relativePath,
    "concurrent update after migration staging\n",
  );
}

function injectCommitBoundaryMutationForTest(inspection: Inspection): void {
  if (process.env.NODE_ENV !== "test") return;
  const relativePath = process.env.AMADEUS_MIGRATE_TEST_MUTATE_BEFORE_COMMIT_PATH;
  if (relativePath) {
    appendMigrationTestMutation(
      inspection.projectDir,
      relativePath,
      "concurrent update before migration commit\n",
    );
  }
  if (process.env.AMADEUS_MIGRATE_TEST_MUTATE_BEFORE_COMMIT_INDEX === "1") {
    const updated = git(inspection.projectDir, [
      "update-index",
      "--assume-unchanged",
      "README.md",
    ]);
    if (!updated.ok) throw new Error("Migration test index mutation failed.");
  }
}

function injectConvertedInstallerSymlinkForTest(
  preparation: ApplyPreparation,
): void {
  const target = process.env.AMADEUS_MIGRATE_TEST_CONVERTED_INSTALLER_SYMLINK;
  if (process.env.NODE_ENV !== "test" || !target) return;
  const installerDir = join(preparation.converted, ".installer");
  rmSync(installerDir, { recursive: true, force: true });
  symlinkSync(
    target,
    installerDir,
    process.platform === "win32" ? "junction" : "dir",
  );
}

function injectConvertedStateTokenForTest(preparation: ApplyPreparation): void {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.AMADEUS_MIGRATE_TEST_CONVERTED_STATE_TOKEN !== "1"
  ) {
    return;
  }
  const state = walkTree(preparation.converted).find(
    (entry) => entry.kind === "file" && basename(entry.relative) === DESTINATION_STATE_FILE,
  );
  if (!state) throw new Error("Migration test converted state was not found.");
  writeFileSync(
    state.absolute,
    Buffer.concat([
      readFileSync(state.absolute),
      Buffer.from("\nRun /aidlc --status after migration.\n", "utf-8"),
    ]),
  );
}

function injectAppliedRuntimeScratchForTest(inspection: Inspection): void {
  const target = process.env.AMADEUS_MIGRATE_TEST_APPLIED_RUNTIME_SCRATCH_TARGET;
  if (process.env.NODE_ENV !== "test" || !target) return;
  const state = walkTree(inspection.report.destination).find(
    (entry) =>
      entry.kind === "file" && basename(entry.relative) === DESTINATION_STATE_FILE
  );
  if (!state) throw new Error("Migration test converted state was not found.");
  symlinkSync(
    target,
    join(dirname(state.absolute), DESTINATION_RUNTIME_PREFIX + "hooks-health"),
    process.platform === "win32" ? "junction" : "dir",
  );
}

function injectRollbackBackupCorruptionForTest(
  preparation: ApplyPreparation,
): void {
  const relativePath = process.env.AMADEUS_MIGRATE_TEST_CORRUPT_ROLLBACK_BACKUP;
  if (process.env.NODE_ENV !== "test" || !relativePath) return;
  appendMigrationTestMutation(
    preparation.originalBackup,
    relativePath,
    "corrupted rollback backup\n",
  );
}

interface ApplyPreparation {
  indexTree: string;
  indexPath: string;
  indexBytes: Buffer;
  tempRoot: string;
  originalBackup: string;
  converted: string;
  seedBackup: string;
  journal: MutationJournal;
}

type ApplyPreparationResult =
  | { ok: true; value: ApplyPreparation }
  | { ok: false; report: MigrationReport };

function failedApplyReport(
  inspection: Inspection,
  warning: string,
): MigrationReport {
  return {
    ...inspection.report,
    status: "failed",
    warnings: [...inspection.report.warnings, warning].sort(),
  };
}

function sameApplyInspection(left: Inspection, right: Inspection): boolean {
  const sameManifest =
    left.installerManifestBytes === null
      ? right.installerManifestBytes === null
      : right.installerManifestBytes !== null &&
        left.installerManifestBytes.equals(right.installerManifestBytes);
  return (
    JSON.stringify(left.report) === JSON.stringify(right.report) &&
    left.sourceRelative === right.sourceRelative &&
    left.sourceFingerprint === right.sourceFingerprint &&
    left.destinationFingerprint === right.destinationFingerprint &&
    left.gitignoreFingerprint === right.gitignoreFingerprint &&
    left.gitignoreBefore === right.gitignoreBefore &&
    left.gitignoreAfter === right.gitignoreAfter &&
    left.doctorHarness === right.doctorHarness &&
    left.doctorUtility === right.doctorUtility &&
    left.doctorUtilityFingerprint === right.doctorUtilityFingerprint &&
    left.doctorToolsFingerprint === right.doctorToolsFingerprint &&
    sameManifest
  );
}

function refreshedApplyInspection(inspection: Inspection): Inspection {
  return inspectMigration({
    projectDir: inspection.projectDir,
    from: inspection.report.source,
    apply: true,
  });
}

function assertApplyPreflightStable(inspection: Inspection): void {
  const refreshed = refreshedApplyInspection(inspection);
  if (
    refreshed.report.status !== "ready" ||
    !sameApplyInspection(inspection, refreshed)
  ) {
    throw new Error("Migration preflight changed before the workspace move.");
  }
}

function assertCommitBoundaryStable(
  inspection: Inspection,
  preparation: ApplyPreparation,
): void {
  assertApplyPreflightStable(inspection);
  if (
    !isRegularFile(preparation.indexPath) ||
    !readFileSync(preparation.indexPath).equals(preparation.indexBytes)
  ) {
    throw new Error("Git index changed before the workspace mutation boundary.");
  }
}

function prepareApply(inspection: Inspection): ApplyPreparationResult {
  const source = inspection.report.source;
  const reinspection = refreshedApplyInspection(inspection);
  if (
    reinspection.report.status !== "ready" ||
    !sameApplyInspection(inspection, reinspection)
  ) {
    return {
      ok: false,
      report: failedApplyReport(inspection, "Migration preflight changed before apply."),
    };
  }
  const indexPathResult = git(inspection.projectDir, ["rev-parse", "--git-path", "index"]);
  const indexPathRaw = indexPathResult.stdout.trim();
  const indexPath = isAbsolute(indexPathRaw)
    ? indexPathRaw
    : resolve(inspection.projectDir, indexPathRaw);
  if (!indexPathResult.ok || indexPathRaw === "" || !isRegularFile(indexPath)) {
    return {
      ok: false,
      report: failedApplyReport(
        inspection,
        "The starting Git index bytes could not be snapshotted.",
      ),
    };
  }
  const indexBytes = readFileSync(indexPath);
  const index = git(inspection.projectDir, ["write-tree"]);
  if (!readFileSync(indexPath).equals(indexBytes)) {
    // `write-tree` can refresh cache-tree metadata. The apply baseline and
    // rollback snapshot are the exact bytes that existed when apply began.
    writeFileAtomically(indexPath, indexBytes);
  }
  if (!index.ok || index.stdout.trim() === "") {
    return {
      ok: false,
      report: failedApplyReport(
        inspection,
        "The starting Git index could not be snapshotted.",
      ),
    };
  }
  const parent = stagingParent(inspection.projectDir, source);
  if (parent === null) {
    return {
      ok: false,
      report: failedApplyReport(
        inspection,
        "No clean same-filesystem staging directory is available.",
      ),
    };
  }
  const tempRoot = mkdtempSync(join(parent, ".amadeus-migrate-tmp-"));
  const stagingDevice = statSync(tempRoot).dev;
  const sourceDevice = statSync(source).dev;
  const destinationDeviceMatches =
    inspection.report.target !== "installer-seed" ||
    lstatSync(inspection.report.destination).dev === stagingDevice;
  if (stagingDevice !== sourceDevice || !destinationDeviceMatches) {
    removeTreeSafely(tempRoot);
    return {
      ok: false,
      report: failedApplyReport(
        inspection,
        "Temporary migration staging, source, and destination are not on one filesystem.",
      ),
    };
  }
  return {
    ok: true,
    value: {
      indexTree: index.stdout.trim(),
      indexPath,
      indexBytes,
      tempRoot,
      originalBackup: join(tempRoot, "source-original"),
      converted: join(tempRoot, "converted"),
      seedBackup: join(tempRoot, "installer-seed"),
      journal: {
        seedMoveAttempted: false,
        sourceMoveAttempted: false,
        destinationReplaceAttempted: false,
        gitignoreWriteAttempted: false,
        indexTouched: false,
      },
    },
  };
}

function prepareConvertedTree(
  inspection: Inspection,
  preparation: ApplyPreparation,
): void {
  copyTree(inspection.report.source, preparation.originalBackup);
  copyTree(inspection.report.source, preparation.converted);
  applyPlannedTransform(preparation.converted, inspection.report.operations);
  assertConvertedWorkspace(
    preparation.converted,
    inspection.report.evidence.stateFiles,
    inspection.report.evidence.auditBefore,
  );
}

function restoreInstallerManifest(inspection: Inspection): void {
  if (
    inspection.report.target !== "installer-seed" ||
    inspection.installerManifestBytes === null
  ) {
    return;
  }
  const manifestPath = join(inspection.projectDir, INSTALLER_MANIFEST);
  const destination = inspection.report.destination;
  const installerDir = dirname(manifestPath);
  if (
    pathEntryExists(destination) &&
    (!lstatSync(destination).isDirectory() || lstatSync(destination).isSymbolicLink())
  ) {
    throw new Error("Converted destination is not a real directory.");
  }
  if (pathEntryExists(installerDir)) {
    if (
      !lstatSync(installerDir).isDirectory() ||
      lstatSync(installerDir).isSymbolicLink()
    ) {
      throw new Error("Converted installer directory is not a real directory.");
    }
  } else {
    mkdirSync(installerDir, { recursive: true });
  }
  if (pathTraversesSymlink(destination, manifestPath)) {
    throw new Error("Converted installer manifest path traverses a symlink.");
  }
  writeFileAtomically(manifestPath, inspection.installerManifestBytes);
}

function updateProjectGitignore(
  inspection: Inspection,
  journal: MutationJournal,
): void {
  if (
    inspection.gitignoreBefore === null ||
    inspection.gitignoreAfter === null ||
    inspection.gitignoreBefore === inspection.gitignoreAfter
  ) {
    return;
  }
  journal.gitignoreWriteAttempted = true;
  writeFileAtomically(
    join(inspection.projectDir, ".gitignore"),
    inspection.gitignoreAfter,
  );
}

function swapWorkspace(
  inspection: Inspection,
  preparation: ApplyPreparation,
): void {
  assertCommitBoundaryStable(inspection, preparation);
  const { journal } = preparation;
  const destination = inspection.report.destination;
  injectMigrationFailure("before-seed-move");
  if (inspection.report.target === "installer-seed") {
    journal.seedMoveAttempted = true;
    renameSync(destination, preparation.seedBackup);
    injectMigrationFailure("after-seed-move");
  }
  journal.sourceMoveAttempted = true;
  journal.indexTouched = true;
  const moved = git(inspection.projectDir, [
    "mv",
    "--",
    inspection.sourceRelative,
    DESTINATION_NAMESPACE,
  ]);
  if (!moved.ok) {
    throw new Error("git mv failed: " + (moved.stderr || moved.stdout).trim());
  }
  injectMigrationFailure("after-source-move");
  journal.destinationReplaceAttempted = true;
  removeTreeSafely(destination);
  renameSync(preparation.converted, destination);
  injectMigrationFailure("after-destination-replace");
  restoreInstallerManifest(inspection);
  injectMigrationFailure("after-manifest-restore");
  updateProjectGitignore(inspection, journal);
  injectMigrationFailure("after-gitignore-write");
  injectMigrationFailure("after-workspace-write");
}

function validateAndStageAppliedMigration(
  inspection: Inspection,
  preparation: ApplyPreparation,
): {
  auditAfter: Record<string, string>;
  auditAppends: NonNullable<MigrationEvidence["auditAppends"]>;
  doctor: NonNullable<MigrationEvidence["doctor"]>;
} {
  const destination = inspection.report.destination;
  assertConvertedWorkspace(
    destination,
    inspection.report.evidence.stateFiles,
    inspection.report.evidence.auditBefore,
  );
  injectMigrationFailure("before-doctor");
  const doctor = runDoctor(inspection);
  injectMigrationFailure("after-doctor");
  const auditAppends = assertAuditAppendOnly(
    preparation.originalBackup,
    destination,
  );
  const auditAfter = collectAuditHashes(destination);
  const stagePaths = [DESTINATION_NAMESPACE];
  if (inspection.gitignoreBefore !== inspection.gitignoreAfter) {
    stagePaths.push(".gitignore");
  }
  injectMigrationFailure("before-git-add");
  const staged = git(inspection.projectDir, ["add", "-A", "--", ...stagePaths]);
  if (!staged.ok) {
    throw new Error("git add failed: " + (staged.stderr || staged.stdout).trim());
  }
  preparation.journal.indexTouched = true;
  injectMigrationFailure("before-final-verification");
  const unstaged = git(inspection.projectDir, ["diff", "--name-only"]);
  if (!unstaged.ok || unstaged.stdout.trim() !== "") {
    throw new Error("Migration left unstaged tracked changes.");
  }
  return { auditAfter, auditAppends, doctor };
}

function cleanupAppliedStaging(tempRoot: string): string | null {
  try {
    removeTreeSafely(tempRoot);
    return null;
  } catch {
    return "Temporary migration staging could not be removed: " + tempRoot;
  }
}

function rollbackFailureReport(
  inspection: Inspection,
  preparation: ApplyPreparation,
  error: unknown,
): MigrationReport {
  const attempted = mutationAttempted(preparation.journal);
  let restored = true;
  if (attempted) {
    restored = rollbackMigration({
      projectDir: inspection.projectDir,
      source: inspection.report.source,
      destination: inspection.report.destination,
      originalBackup: preparation.originalBackup,
      seedBackup: preparation.seedBackup,
      target: inspection.report.target,
      gitignoreBefore: inspection.gitignoreBefore,
      tempRoot: preparation.tempRoot,
      journal: preparation.journal,
      indexTree: preparation.indexTree,
      indexPath: preparation.indexPath,
      indexBytes: preparation.indexBytes,
      sourceFingerprint: inspection.sourceFingerprint || "",
      destinationFingerprint: inspection.destinationFingerprint,
      gitignoreFingerprint: inspection.gitignoreFingerprint,
    });
  } else {
    try {
      removeTreeSafely(preparation.tempRoot);
    } catch {
      restored = false;
    }
  }
  return {
    ...inspection.report,
    status: "failed",
    warnings: [
      ...inspection.report.warnings,
      error instanceof Error ? error.message : String(error),
      ...(restored ? [] : ["Automatic rollback did not restore the clean baseline."]),
    ].sort(),
    evidence: {
      ...inspection.report.evidence,
      rollback: { attempted, restored },
    },
  };
}

function applyMigration(inspection: Inspection): MigrationReport {
  const preparationResult = prepareApply(inspection);
  if (!preparationResult.ok) return preparationResult.report;
  const preparation = preparationResult.value;

  try {
    prepareConvertedTree(inspection, preparation);
    injectConvertedInstallerSymlinkForTest(preparation);
    injectConvertedStateTokenForTest(preparation);
    injectRollbackBackupCorruptionForTest(preparation);
    injectSourceMutationAfterCopy(inspection.report.source);
    assertApplyPreflightStable(inspection);
    injectCommitBoundaryMutationForTest(inspection);
    swapWorkspace(inspection, preparation);
    injectAppliedRuntimeScratchForTest(inspection);
    const evidence = validateAndStageAppliedMigration(inspection, preparation);
    const cleanupWarning = cleanupAppliedStaging(preparation.tempRoot);
    return {
      ...inspection.report,
      status: "applied",
      evidence: { ...inspection.report.evidence, ...evidence },
      warnings: [
        ...inspection.report.warnings,
        ...(cleanupWarning === null ? [] : [cleanupWarning]),
      ].sort(),
    };
  } catch (error) {
    return rollbackFailureReport(inspection, preparation, error);
  }
}

export function runMigration(options: MigrationOptions = {}): MigrationReport {
  const inspection = inspectMigration(options);
  if (!options.apply || inspection.report.status !== "ready") {
    return inspection.report;
  }
  return applyMigration(inspection);
}

export function renderMigrationReport(report: MigrationReport): string {
  const lines = [
    "AI-DLC v2 -> Amadeus workspace migration",
    "Mode: " + report.mode,
    "Status: " + report.status,
    "Source: " + report.source,
    "Destination: " + report.destination,
    "Source version: " + report.sourceVersion,
    "Target: " + report.target,
    "",
    "Checks:",
    ...report.checks.map(
      (check) => (check.pass ? "[pass] " : "[fail] ") + check.id + ": " + check.detail,
    ),
    "",
    "Operations:",
    ...report.operations.map((operation) => JSON.stringify(operation)),
  ];
  if (report.warnings.length > 0) {
    lines.push("", "Warnings:", ...report.warnings.map((warning) => "- " + warning));
  }
  if (report.mode === "dry-run" && report.status === "ready") {
    lines.push("", "No files were changed. Re-run with --apply only after explicit approval.");
  }
  return lines.join("\n") + "\n";
}

function usageError(message: string): never {
  throw new Error(message);
}

function requiredOptionValue(
  args: readonly string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) usageError(option + " requires a value.");
  return value;
}

function parseCliArgs(args: readonly string[]): MigrationOptions {
  const options: MigrationOptions = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    switch (arg) {
      case "--apply":
        options.apply = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--from":
        options.from = requiredOptionValue(args, index, arg);
        index++;
        break;
      case "--project-dir":
        options.projectDir = requiredOptionValue(args, index, arg);
        index++;
        break;
      default:
        usageError("Unknown argument: " + arg);
    }
  }
  if (options.from === undefined) usageError("--from requires a value.");
  return options;
}

export function main(args: readonly string[] = process.argv.slice(2)): number {
  let options: MigrationOptions = {};
  try {
    options = parseCliArgs(args);
    const report = runMigration(options);
    process.stdout.write(
      options.json ? JSON.stringify(report) + "\n" : renderMigrationReport(report),
    );
    return report.status === "ready" || report.status === "applied" ? 0 : 1;
  } catch (error) {
    const projectDir = resolve(options.projectDir || process.cwd());
    const source = resolve(projectDir, options.from || UPSTREAM_NAMESPACE);
    const report: MigrationReport = {
      schemaVersion: 1,
      status: "failed",
      mode: options.apply ? "apply" : "dry-run",
      source,
      destination: join(projectDir, DESTINATION_NAMESPACE),
      sourceVersion: "unknown",
      target: "unsupported",
      checks: [],
      operations: [],
      warnings: [error instanceof Error ? error.message : String(error)],
      evidence: { stateFiles: 0, auditBefore: {} },
    };
    if (options.json || args.includes("--json")) {
      process.stdout.write(JSON.stringify(report) + "\n");
    } else {
      process.stderr.write(renderMigrationReport(report));
    }
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = main();
}
