const TEMP_ROOT_PATTERN = /\/(?:private\/)?(?:var\/folders\/[^/]+\/[^/]+\/T\/|tmp\/)[^/\s]+/g;
const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;
const BACKUP_TIMESTAMP_PATTERN = /\d{8}T\d{6}Z/g;

export function normalizeInstallerOutput(text: string, replacements: Record<string, string> = {}): string {
  let normalized = text;
  for (const [from, to] of Object.entries(replacements)) {
    normalized = normalized.split(from).join(to);
  }
  return normalized
    .replace(TEMP_ROOT_PATTERN, "<TEMP>")
    .replace(ISO_TIMESTAMP_PATTERN, "<TIMESTAMP>")
    .replace(BACKUP_TIMESTAMP_PATTERN, "<BACKUP_TS>");
}

export function stablePlanSnapshot(planText: string): string {
  return normalizeInstallerOutput(planText)
    .replace(/version:\s+[\d.]+/g, "version:  <VERSION>")
    .replace(/tag:\s+v[\d.]+/g, "tag:      v<VERSION>");
}
