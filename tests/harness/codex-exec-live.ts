export function codexExecLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  if (env.GITHUB_ACTIONS === "true") {
    return "live codex-exec E2E is disabled on GitHub Actions";
  }
  if (env.AMADEUS_CODEX_EXEC_LIVE !== "1") {
    return "set AMADEUS_CODEX_EXEC_LIVE=1 to run live codex-exec E2E";
  }
  return null;
}
