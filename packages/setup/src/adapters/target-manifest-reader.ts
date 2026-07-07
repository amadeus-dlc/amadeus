import { join } from "node:path";
import { validateInstallerManifestJson } from "../domain/manifest-schema.ts";
import { INSTALLER_MANIFEST_PATH, type ManifestReadDiagnostics, type ManifestReadResult } from "../domain/target-types.ts";
import type { TargetManifestReadPort, TargetReadOnlyFilePort } from "../ports/target-state.ts";
import { NodeTargetReadOnlyFile } from "./target-readonly-file.ts";

function diagnostics(status: ManifestReadDiagnostics["status"], validationIssues?: ManifestReadDiagnostics["validationIssues"]): ManifestReadDiagnostics {
  const reasonCode = {
    absent: "manifest-absent",
    invalid: "manifest-invalid",
    unreadable: "manifest-unreadable",
    valid: "manifest-valid",
  }[status] as ManifestReadDiagnostics["reasonCode"];
  return {
    status,
    reasonCode,
    manifestPath: INSTALLER_MANIFEST_PATH,
    ...(validationIssues !== undefined ? { validationIssues } : {}),
  };
}

export class FileSystemTargetManifestReader implements TargetManifestReadPort {
  constructor(private readonly files: TargetReadOnlyFilePort = new NodeTargetReadOnlyFile()) {}

  async readManifestForDetection(targetPath: string): Promise<ManifestReadResult> {
    const manifestPath = join(targetPath, INSTALLER_MANIFEST_PATH);
    if (!(await this.files.exists(manifestPath))) {
      return { status: "absent", diagnostics: diagnostics("absent") };
    }

    let content: string;
    try {
      content = Buffer.from(await this.files.readFile(manifestPath)).toString("utf-8");
    } catch {
      return { status: "unreadable", diagnostics: diagnostics("unreadable") };
    }

    const validation = validateInstallerManifestJson(content);
    if (!validation.ok) {
      return { status: "invalid", diagnostics: diagnostics("invalid", validation.issues) };
    }
    return { status: "valid", manifest: validation.manifest, diagnostics: diagnostics("valid") };
  }
}
