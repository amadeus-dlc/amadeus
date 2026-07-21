export function extractCiSnapshotWiring(yaml: string) {
  const trigger = yaml.split("on:")[1]?.split("\nconcurrency:")[0] ?? "";
  const job = yaml.split("  metrics-snapshot:")[1]?.split("\n  ci-success:")[0] ?? "";
  const coverageHeadJob =
    yaml.split("  coverage-head:")[1]?.split("\n  coverage-base:")[0] ??
    yaml.split("  coverage:")[1]?.split("\n  metrics-snapshot:")[0] ??
    "";
  const uploadStep = coverageHeadJob.split("      - name: Upload coverage artifact")[1] ?? "";
  const ciSuccess = yaml.split("  ci-success:")[1] ?? "";
  return { trigger, job, uploadStep, ciSuccess };
}
