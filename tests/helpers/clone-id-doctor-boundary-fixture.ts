export type CloneIdDoctorBoundary =
  | "symlink-resolution"
  | "clone-id-derivation"
  | "process-launch"
  | "fixture-cleanup";

export interface CloneIdDoctorBoundaryPorts<ProcessResult> {
  resolveSymlink(): string;
  deriveCloneId(): string;
  launchProcess(): ProcessResult;
  cleanup(): void;
}

export interface CloneIdDoctorObservation<ProcessResult> {
  targetPath: string;
  cloneId: string;
  processResult: ProcessResult;
}

export class CloneIdDoctorBoundaryError extends Error {
  constructor(
    readonly boundary: CloneIdDoctorBoundary,
    cause: unknown,
  ) {
    super(
      `clone-id doctor fixture failed at ${boundary}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause },
    );
    this.name = "CloneIdDoctorBoundaryError";
  }
}

export function runCloneIdDoctorBoundaries<ProcessResult>(
  ports: CloneIdDoctorBoundaryPorts<ProcessResult>,
): CloneIdDoctorObservation<ProcessResult> {
  let activeBoundary: CloneIdDoctorBoundary = "symlink-resolution";
  let observation: CloneIdDoctorObservation<ProcessResult> | undefined;
  let primaryFailure: CloneIdDoctorBoundaryError | undefined;

  try {
    const targetPath = ports.resolveSymlink();
    activeBoundary = "clone-id-derivation";
    const cloneId = ports.deriveCloneId();
    activeBoundary = "process-launch";
    const processResult = ports.launchProcess();
    observation = { targetPath, cloneId, processResult };
  } catch (cause) {
    primaryFailure = new CloneIdDoctorBoundaryError(activeBoundary, cause);
  }

  try {
    ports.cleanup();
  } catch (cause) {
    if (primaryFailure === undefined) {
      primaryFailure = new CloneIdDoctorBoundaryError("fixture-cleanup", cause);
    }
  }

  if (primaryFailure !== undefined) throw primaryFailure;
  if (observation === undefined) {
    throw new Error("clone-id doctor fixture completed without an observation");
  }
  return observation;
}
