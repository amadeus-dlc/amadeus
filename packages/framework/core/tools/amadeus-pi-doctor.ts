import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve, win32 } from "node:path";

export const PI_DOCTOR_CHECK_IDS = [
  "pi.os",
  "pi.bun",
  "pi.runtime-version",
  "pi.project-trust",
  "pi.skill-resources",
  "pi.extension-resources",
  "pi.package-resource",
  "pi.driver-resources",
] as const;

export type PiDoctorCheckId = (typeof PI_DOCTOR_CHECK_IDS)[number];

export interface PiDoctorCheck {
  readonly id: PiDoctorCheckId;
  readonly pass: boolean;
  readonly observed: string;
  readonly expected: string;
  readonly remediation: string;
}

type ResourceKind = "skill" | "question-annex" | "extension" | "driver";

interface CatalogResource {
  readonly kind: ResourceKind;
  readonly source: string;
  readonly destination: string;
  readonly load: "native" | "annex" | "internal";
  readonly sha256: string;
}

interface PiCatalog {
  readonly minimumVersion: string;
  readonly resources: readonly CatalogResource[];
}

export interface PiDoctorProbeInput {
  readonly projectDir: string;
  readonly platform: NodeJS.Platform;
  readonly bunVersion: string | undefined;
  readonly piExecutable: string | undefined;
  readonly piVersionOutput: string;
  readonly piAgentDir: string;
}

const CATALOG_RELATIVE_PATH = ".pi/tools/data/harness.json";
const INSTALLER_MANIFEST_RELATIVE_PATH = "amadeus/.installer/amadeus-setup-manifest.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const SEMVER = /(\d+)\.(\d+)\.(\d+)/u;

function check(
  id: PiDoctorCheckId,
  pass: boolean,
  observed: string,
  expected: string,
  remediation: string,
): PiDoctorCheck {
  return Object.freeze({ id, pass, observed, expected, remediation });
}

function safeRelativePath(value: string): boolean {
  if (value.length === 0 || isAbsolute(value) || win32.isAbsolute(value)) return false;
  const parts = value.replaceAll("\\", "/").split("/");
  return !parts.includes("") && !parts.includes(".") && !parts.includes("..");
}

function closeProbeFile(fd: number): boolean {
  try {
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function readRegularFileNoFollow(path: string): Buffer | null {
  let fd: number | undefined;
  try {
    const before = lstatSync(path);
    if (!before.isFile() || before.isSymbolicLink()) throw new Error("unsafe probe file");
    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    fd = openSync(path, fsConstants.O_RDONLY | noFollow);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error("probe identity changed");
    }
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size) {
      throw new Error("probe file changed during read");
    }
    return closeProbeFile(fd) ? bytes : null;
  } catch {
    if (fd !== undefined) closeProbeFile(fd);
    return null;
  }
}

function catalogMinimumVersion(record: Record<string, unknown>): string | null {
  const runtime = record.nativeRuntime;
  if (
    record.name !== "pi" || record.harnessDir !== ".pi" ||
    typeof runtime !== "object" || runtime === null || Array.isArray(runtime)
  ) return null;
  const native = runtime as Record<string, unknown>;
  return native.package === "@earendil-works/pi-coding-agent" &&
      typeof native.minimumVersion === "string" && SEMVER.test(native.minimumVersion) &&
      native.projectTrust === "native" && native.trustIsSandbox === false &&
      native.autoApproveProjectTrust === false && native.mutateTrustStore === false
    ? native.minimumVersion
    : null;
}

function catalogResource(value: unknown): CatalogResource | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const family = row.kind === "extension" ? "extensions"
    : row.kind === "driver" ? "drivers"
    : "skills";
  const expectedLoad = row.kind === "question-annex" ? "annex"
    : row.kind === "driver" ? "internal"
    : "native";
  if (
    !["skill", "question-annex", "extension", "driver"].includes(String(row.kind)) ||
    !["native", "annex", "internal"].includes(String(row.load)) ||
    typeof row.source !== "string" || !safeRelativePath(row.source) ||
    typeof row.destination !== "string" || !safeRelativePath(row.destination) ||
    row.load !== expectedLoad ||
    !row.destination.startsWith(`.pi/${family}/`) ||
    typeof row.sha256 !== "string" || !SHA256.test(row.sha256)
  ) return null;
  return row as unknown as CatalogResource;
}

function closedResourceFamilies(resources: readonly CatalogResource[]): boolean {
  return resources.filter((resource) => resource.kind === "skill").length === 1 &&
    resources.filter((resource) => resource.kind === "question-annex").length === 1 &&
    resources.filter((resource) => resource.kind === "extension").length === 1 &&
    resources.some((resource) => resource.kind === "driver");
}

function parseCatalog(projectDir: string): { catalog: PiCatalog | null; detail: string } {
  const bytes = readRegularFileNoFollow(join(projectDir, ...CATALOG_RELATIVE_PATH.split("/")));
  if (bytes === null) return { catalog: null, detail: "catalog missing, symlinked, or non-regular" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    return { catalog: null, detail: "catalog is not valid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { catalog: null, detail: "catalog root is not an object" };
  }
  const record = parsed as Record<string, unknown>;
  const minimumVersion = catalogMinimumVersion(record);
  if (minimumVersion === null) {
    return { catalog: null, detail: "catalog native runtime/trust contract is invalid" };
  }
  if (!Array.isArray(record.resources)) return { catalog: null, detail: "catalog resources are absent" };
  const resources: CatalogResource[] = [];
  const folded = new Set<string>();
  for (const value of record.resources) {
    const row = catalogResource(value);
    if (row === null) return { catalog: null, detail: "catalog contains an invalid resource descriptor" };
    const identity = row.destination.normalize("NFC").toLocaleLowerCase("en-US");
    if (folded.has(identity)) return { catalog: null, detail: "catalog resource destinations collide" };
    folded.add(identity);
    resources.push(row);
  }
  if (!closedResourceFamilies(resources)) {
    return { catalog: null, detail: "catalog closed resource families are incomplete" };
  }
  return {
    catalog: Object.freeze({
      minimumVersion,
      resources: Object.freeze(resources),
    }),
    detail: `${resources.length} descriptors loaded`,
  };
}

function compareSemver(observed: string, expected: string): boolean {
  const left = SEMVER.exec(observed);
  const right = SEMVER.exec(expected);
  if (left === null || right === null) return false;
  for (let index = 1; index <= 3; index++) {
    const l = Number(left[index]);
    const r = Number(right[index]);
    if (l !== r) return l > r;
  }
  return true;
}

function parsedVersion(output: string): string | null {
  return SEMVER.exec(output)?.[0] ?? null;
}

function nearestTrustDecision(projectDir: string, piAgentDir: string): "trusted" | "declined" | "absent" | "invalid" {
  const bytes = readRegularFileNoFollow(join(piAgentDir, "trust.json"));
  if (bytes === null) return "absent";
  let data: unknown;
  try {
    data = JSON.parse(bytes.toString("utf8"));
  } catch {
    return "invalid";
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return "invalid";
  let current = resolve(projectDir);
  while (true) {
    const value = (data as Record<string, unknown>)[current];
    if (value === true) return "trusted";
    if (value === false) return "declined";
    if (value !== undefined && value !== null) return "invalid";
    const parent = dirname(current);
    if (parent === current) return "absent";
    current = parent;
  }
}

function collectFilesBelow(root: string, dir: string, result: string[]): boolean {
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) return false;
    if (entry.isDirectory() && !collectFilesBelow(root, path, result)) return false;
    if (entry.isFile()) result.push(relative(root, path).split("\\").join("/"));
    if (!entry.isDirectory() && !entry.isFile()) return false;
  }
  return true;
}

function filesBelow(root: string): string[] | null {
  if (!existsSync(root)) return [];
  const result: string[] = [];
  try {
    return collectFilesBelow(root, root, result) ? result.sort() : null;
  } catch {
    return null;
  }
}

function validateResourceFamily(
  projectDir: string,
  resources: readonly CatalogResource[],
  rootRelative: string,
): { pass: boolean; observed: string } {
  const failures: string[] = [];
  for (const resource of resources) {
    const bytes = readRegularFileNoFollow(join(projectDir, ...resource.destination.split("/")));
    if (bytes === null) {
      failures.push(`${resource.destination}: missing/symlink/non-regular`);
      continue;
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== resource.sha256) failures.push(`${resource.destination}: sha256 mismatch`);
  }
  const expectedBelow = resources
    .map((resource) => posix.relative(rootRelative, resource.destination))
    .filter((path) => path !== "" && !path.startsWith("../"))
    .sort();
  const observedBelow = filesBelow(join(projectDir, ...rootRelative.split("/")));
  if (observedBelow === null) failures.push(`${rootRelative}: unsafe or unreadable tree`);
  else {
    const extras = observedBelow.filter((path) => !expectedBelow.includes(path));
    if (extras.length > 0) failures.push(`${rootRelative}: unexpected ${extras.join(",")}`);
  }
  return failures.length === 0
    ? { pass: true, observed: `${resources.length} catalogued resource(s) match` }
    : { pass: false, observed: failures.join("; ") };
}

function installerCatalogReceipt(projectDir: string): { pass: boolean; observed: string } {
  const manifestBytes = readRegularFileNoFollow(
    join(projectDir, ...INSTALLER_MANIFEST_RELATIVE_PATH.split("/")),
  );
  if (manifestBytes === null) return { pass: false, observed: "installer manifest absent or unsafe" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    return { pass: false, observed: "installer manifest is invalid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { files?: unknown }).files)) {
    return { pass: false, observed: "installer manifest schema is invalid" };
  }
  const rows = (parsed as { files: unknown[] }).files.filter(
    (row): row is { path: string; required: boolean; md5: string } =>
      typeof row === "object" && row !== null &&
      (row as { path?: unknown }).path === CATALOG_RELATIVE_PATH &&
      (row as { required?: unknown }).required === true &&
      typeof (row as { md5?: unknown }).md5 === "string",
  );
  if (rows.length !== 1) return { pass: false, observed: "catalog has no unique required installer receipt" };
  const catalogBytes = readRegularFileNoFollow(join(projectDir, ...CATALOG_RELATIVE_PATH.split("/")));
  if (catalogBytes === null) return { pass: false, observed: "candidate catalog is absent or unsafe" };
  const digest = createHash("md5").update(catalogBytes).digest("hex");
  return digest === rows[0].md5
    ? { pass: true, observed: "candidate catalog matches installer receipt" }
    : { pass: false, observed: "candidate catalog differs from installer receipt" };
}

export function probePiDoctor(input: PiDoctorProbeInput): readonly PiDoctorCheck[] {
  const catalogResult = parseCatalog(input.projectDir);
  const catalog = catalogResult.catalog;
  const supportedPlatform = input.platform === "darwin" || input.platform === "linux";
  const bunVersion = parsedVersion(input.bunVersion ?? "");
  const piVersion = input.piExecutable === undefined ? null : parsedVersion(input.piVersionOutput);
  const minimumVersion = catalog?.minimumVersion ?? "catalog minimum version";
  const trust = nearestTrustDecision(input.projectDir, input.piAgentDir);
  const packageReceipt = installerCatalogReceipt(input.projectDir);
  const family = (
    kinds: readonly ResourceKind[],
    root: string,
  ): { pass: boolean; observed: string } => catalog === null
    ? { pass: false, observed: "candidate catalog unavailable" }
    : validateResourceFamily(
      input.projectDir,
      catalog.resources.filter((resource) => kinds.includes(resource.kind)),
      root,
    );
  const skills = family(["skill", "question-annex"], ".pi/skills/amadeus");
  const extensions = family(["extension"], ".pi/extensions");
  const drivers = family(["driver"], ".pi/drivers");

  return Object.freeze([
    check("pi.os", supportedPlatform, input.platform, "darwin or linux", "run Pi Amadeus on macOS or Linux; native Windows is not a formal-success target"),
    check("pi.bun", bunVersion !== null, bunVersion ?? "not found or unparseable", "bun available with a parseable version", "install Bun and expose it to the non-interactive PATH"),
    check(
      "pi.runtime-version",
      piVersion !== null && catalog !== null && compareSemver(piVersion, catalog.minimumVersion),
      piVersion ?? "not found or unparseable",
      `@earendil-works/pi-coding-agent >= ${minimumVersion}`,
      "install or upgrade @earendil-works/pi-coding-agent; 0.82.x is unsupported",
    ),
    check("pi.project-trust", trust === "trusted", trust, "an applicable saved Pi native trust decision", "review .pi resources and approve the project with Pi /trust; doctor never changes trust.json"),
    check("pi.skill-resources", skills.pass, skills.observed, "catalogued Pi skill resources, hashes, and closed directory", "re-run the Amadeus installer; do not repair individual files from doctor"),
    check("pi.extension-resources", extensions.pass, extensions.observed, "catalogued Pi native extension, hash, and closed directory", "re-run the Amadeus installer; do not load a changed extension"),
    check(
      "pi.package-resource",
      catalog !== null && packageReceipt.pass,
      catalog === null ? catalogResult.detail : packageReceipt.observed,
      "manifest-generated candidate catalog with a matching required installer receipt",
      "re-run the Amadeus installer from a reviewed immutable distribution",
    ),
    check("pi.driver-resources", drivers.pass, drivers.observed, "catalogued internal Pi driver resources, hashes, and closed directory", "re-run the Amadeus installer; do not execute a changed driver"),
  ]);
}

export function redactPiDoctorText(
  value: string,
  projectDir: string,
  piAgentDir: string,
  homeDir?: string,
): string {
  let text = value;
  for (const path of [resolve(projectDir), resolve(piAgentDir), ...(homeDir ? [resolve(homeDir)] : [])]) {
    if (path.length > 1) text = text.split(path).join("<redacted-path>");
  }
  text = text.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/giu, "$1<redacted>@");
  text = text.replace(/\b(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s;,]+/giu, "$1=<redacted>");
  return text;
}

export function piDoctorCheckLabel(row: PiDoctorCheck, projectDir: string, piAgentDir: string): string {
  const observed = redactPiDoctorText(row.observed, projectDir, piAgentDir);
  const expected = redactPiDoctorText(row.expected, projectDir, piAgentDir);
  return `[${row.id}] observed=${observed}; expected=${expected}`;
}
