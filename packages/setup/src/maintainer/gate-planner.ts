export { buildInstallerGatePlan, GATE_REGISTRY, type GateCheck, type GateName, type GatePlan } from "./gate-registry.ts";
export { runInstallerGatePlan, type GatePlanRunReport, type GateRunResult } from "./run-installer-gates.ts";
export {
  classifyInstallerChange,
  INSTALLER_CHANGE_RULES,
  requiresDistDriftGates,
  requiresSecretScan,
  type InstallerChangeScope,
  type InstallerChangeSet,
  writeChangeSetReport,
} from "./change-detector.ts";
