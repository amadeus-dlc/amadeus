export function extractMetricsPublicationWiring(ciYaml: string, maintenanceYaml: string) {
  const trigger = ciYaml.split("on:")[1]?.split("\nconcurrency:")[0] ?? "";
  const snapshotJob = ciYaml.split("  metrics-snapshot:")[1]?.split("\n  ci-success:")[0] ?? "";
  const coverageHeadJob =
    ciYaml.split("  coverage-head:")[1]?.split("\n  coverage-base:")[0] ??
    ciYaml.split("  coverage:")[1]?.split("\n  metrics-snapshot:")[0] ??
    "";
  const uploadStep = coverageHeadJob.split("      - name: Upload coverage artifact")[1] ?? "";
  const ciSuccess = ciYaml.split("  ci-success:")[1] ?? "";
  const maintenanceTrigger = maintenanceYaml.split("on:")[1]?.split("\npermissions:")[0] ?? "";
  const maintenanceConcurrency = maintenanceYaml.split("concurrency:")[1]?.split("\njobs:")[0] ?? "";
  const maintenanceJob = maintenanceYaml.split("  publish:")[1] ?? "";
  return {
    trigger,
    snapshotJob,
    uploadStep,
    ciSuccess,
    maintenanceTrigger,
    maintenanceConcurrency,
    maintenanceJob,
  };
}
