export function extractCiSnapshotWiring(yaml: string) {
  const job = yaml.split("  metrics-snapshot:")[1]?.split("\n  codecov-status:")[0] ?? "";
  const coverageJob = yaml.split("  coverage:")[1]?.split("\n  metrics-snapshot:")[0] ?? "";
  const uploadStep = coverageJob.split("      - name: Upload coverage artifact")[1]?.split("\n      - name: Upload coverage to Codecov")[0] ?? "";
  const ciSuccess = yaml.split("  ci-success:")[1] ?? "";
  return { job, uploadStep, ciSuccess };
}
