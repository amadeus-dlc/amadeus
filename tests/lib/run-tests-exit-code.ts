// Pure seam for the runner's process-exit code (#2577).
//
// `process.exit(N)` truncates to `N % 256` (POSIX 8-bit exit codes), so
// passing `failedFiles` straight through wraps to 0 -- a false green -- the
// moment the failure count hits an exact multiple of 256 (256, 512, ...).
// This function clamps any positive count into the 1..255 band that stays
// observably non-zero, while leaving 0 (an all-green run) untouched.
export function exitCodeFor(failedFiles: number): number {
  if (failedFiles <= 0) return 0;
  return Math.min(failedFiles, 255);
}
