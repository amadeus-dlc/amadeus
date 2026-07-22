import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, mkdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import type { ArmId, Result } from "./contract.ts";
import { validateRepositoryPath } from "./repository-path-policy.ts";

export interface FrozenExecutable {
  path: string;
  version: string;
  sha256: string;
}

export interface ExecutionPolicy {
  repositoryRoot: string;
  snapshotRoot: string;
  executable: FrozenExecutable;
  allowedEnvironmentKeys: readonly string[];
  allowedPathPrefixes: readonly string[];
}

export interface ProcessRequest {
  revisionIdentity: string;
  argv: readonly string[];
  cwd: string;
  environment: Readonly<Record<string, string>>;
  inputPaths: readonly string[];
  outputPath: string;
  arm: ArmId;
  subject: string;
  armSha: string;
  baselineSha: string;
  inputSetHash: string;
}

export interface AuthorizedProcessRequest extends ProcessRequest {
  snapshotRoot: string;
  snapshotIdentity: string;
  authorizationIdentity: string;
  executableVersion: string;
  environmentKeys: readonly string[];
  snapshotFiles: readonly { path: string; sha256: string }[];
}

export interface ExecutionPolicyError {
  kind: "ExecutionPolicyError";
  message: string;
}

function fail(message: string): Result<never, ExecutionPolicyError> {
  return { ok: false, error: { kind: "ExecutionPolicyError", message } };
}

function lexicalRelative(path: string): boolean {
  return path.length > 0 && !path.includes("\0") && !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(path) && !path.split(/[\\/]/).includes("..");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function copyFrozenFile(repositoryRoot: string, snapshotRoot: string, path: string): { path: string; sha256: string } {
  const source = resolve(repositoryRoot, path);
  const destination = join(snapshotRoot, path);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  chmodSync(destination, 0o444);
  return { path, sha256: sha256(readFileSync(destination)) };
}

function authorizationPreimage(request: Omit<AuthorizedProcessRequest, "authorizationIdentity">) {
  return { revisionIdentity: request.revisionIdentity, snapshotRoot: request.snapshotRoot, snapshotIdentity: request.snapshotIdentity, executableVersion: request.executableVersion, argv: request.argv, cwd: request.cwd, environment: request.environment, environmentKeys: request.environmentKeys, inputPaths: request.inputPaths, outputPath: request.outputPath, arm: request.arm, subject: request.subject, armSha: request.armSha, baselineSha: request.baselineSha, inputSetHash: request.inputSetHash, snapshotFiles: request.snapshotFiles };
}

export function authorizeExecution(policy: ExecutionPolicy, request: ProcessRequest): Result<AuthorizedProcessRequest, ExecutionPolicyError> {
  if (!request.subject || !/^[0-9a-f]{64}$/.test(request.revisionIdentity) || !/^[0-9a-f]{64}$/.test(request.armSha) || !/^[0-9a-f]{64}$/.test(request.baselineSha) || !/^[0-9a-f]{64}$/.test(request.inputSetHash)) return fail("execution identity is not frozen");
  if (!Array.isArray(request.argv) || request.argv.length === 0 || request.argv[0] !== policy.executable.path || request.argv.some((value) => typeof value !== "string" || value.length === 0 || value.includes("\0"))) return fail("argv must be a non-empty string array bound to the frozen executable");
  if (!lexicalRelative(request.outputPath)) return fail("output path must be repository relative");
  const repositoryRoot = realpathSync(policy.repositoryRoot);
  const cwd = request.cwd === "." ? repositoryRoot : resolve(repositoryRoot, request.cwd);
  const cwdRelative = relative(repositoryRoot, cwd).replaceAll("\\", "/") || ".";
  if (cwdRelative === ".." || cwdRelative.startsWith("../")) return fail("cwd escapes repository");
  const executable = validateRepositoryPath(repositoryRoot, policy.executable.path, policy.allowedPathPrefixes);
  if (!executable.ok) return fail(executable.error.message);
  const executableBytes = readFileSync(resolve(repositoryRoot, executable.value));
  if (sha256(executableBytes) !== policy.executable.sha256 || !policy.executable.version) return fail("executable identity drift");
  const inputs: string[] = [];
  for (const path of request.inputPaths) {
    const checked = validateRepositoryPath(repositoryRoot, path, policy.allowedPathPrefixes);
    if (!checked.ok) return fail(checked.error.message);
    inputs.push(checked.value);
  }
  const environmentKeys = Object.keys(request.environment).sort();
  if (environmentKeys.some((key) => !policy.allowedEnvironmentKeys.includes(key) || /secret|credential|token|password|home/i.test(key))) return fail("environment key is not allowlisted");
  const snapshotFiles = [{ path: executable.value, sha256: policy.executable.sha256 }, ...inputs.map((path) => ({ path, sha256: sha256(readFileSync(resolve(repositoryRoot, path))) }))];
  const snapshotIdentity = canonicalIdentity({ executableVersion: policy.executable.version, files: snapshotFiles }, "amadeus.formal-verif.execution-snapshot.v1").sha256;
  const snapshotRoot = join(policy.snapshotRoot, snapshotIdentity);
  mkdirSync(snapshotRoot, { recursive: true });
  const copied = [copyFrozenFile(repositoryRoot, snapshotRoot, executable.value), ...inputs.map((path) => copyFrozenFile(repositoryRoot, snapshotRoot, path))];
  if (copied.some((item) => item.sha256 !== (item.path === executable.value ? policy.executable.sha256 : sha256(readFileSync(resolve(repositoryRoot, item.path)))))) return fail("snapshot identity drift");
  const authorized = { ...request, argv: [executable.value, ...request.argv.slice(1)], cwd: cwdRelative, inputPaths: inputs, outputPath: request.outputPath.replaceAll("\\", "/"), snapshotRoot, snapshotIdentity, executableVersion: policy.executable.version, environmentKeys, snapshotFiles };
  const authorizationIdentity = canonicalIdentity(authorizationPreimage(authorized), "amadeus.formal-verif.authorized-process.v1").sha256;
  return { ok: true, value: { ...authorized, authorizationIdentity } };
}

export function verifyAuthorizedProcessRequest(request: AuthorizedProcessRequest): Result<void, ExecutionPolicyError> {
  if (!request.snapshotRoot || request.argv[0] !== request.snapshotFiles[0]?.path || !lexicalRelative(request.cwd) || !lexicalRelative(request.outputPath) || request.inputPaths.some((path) => !lexicalRelative(path))) return fail("authorized request is not snapshot relative");
  for (const file of request.snapshotFiles) {
    if (!lexicalRelative(file.path)) return fail("snapshot path is not relative");
    const path = resolve(request.snapshotRoot, file.path);
    let bytes: Uint8Array;
    try { bytes = readFileSync(path); } catch { return fail("snapshot file is missing"); }
    if (sha256(bytes) !== file.sha256 || (statSync(path).mode & 0o222) !== 0) return fail("snapshot seal or content hash drift");
  }
  const identity = canonicalIdentity({ executableVersion: request.executableVersion, files: request.snapshotFiles }, "amadeus.formal-verif.execution-snapshot.v1").sha256;
  if (identity !== request.snapshotIdentity) return fail("snapshot identity drift");
  const { authorizationIdentity, ...authorized } = request;
  const expectedAuthorization = canonicalIdentity(authorizationPreimage(authorized), "amadeus.formal-verif.authorized-process.v1").sha256;
  return expectedAuthorization === authorizationIdentity ? { ok: true, value: undefined } : fail("authorized request identity drift");
}
