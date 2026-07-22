// scripts/harness-transform.ts — the harness-neutral → harness-specific prose
// transform, shared by the core packager (scripts/package.ts) and the plugin
// projector (scripts/plugin-projection.ts). Both surfaces apply the SAME two
// rules to Markdown prose — {{HARNESS_DIR}} token substitution and the
// rules-dir rename — so the operation lives in one place instead of a second
// copy per surface (intent-based dedup: identical operation, one owner).
//
// .json + .ts are copied verbatim (compiled JSON is regenerated per-tree;
// runtime .ts uses the harnessDir() seam), so only prose is transformed.

const HARNESS_TOKEN = /\{\{HARNESS_DIR\}\}/g;

// Substitute {{HARNESS_DIR}} → this harness's dir in a prose string.
export function substituteToken(s: string, harnessDir: string): string {
  return s.replace(HARNESS_TOKEN, harnessDir);
}

// Rewrite in-prose `<harnessDir>/rules/` → `<harnessDir>/<rulesRename>/` for a
// harness that renames its rules dir (kiro: steering, codex: amadeus-rules).
// Anchored on the post-substitution harness-dir form so it can't touch an
// unrelated `rules/` mention. No-op when rulesRename is null (claude).
export function applyRulesRename(s: string, harnessDir: string, rulesRename: string | null): string {
  if (!rulesRename) return s;
  return s.replaceAll(`${harnessDir}/rules/`, `${harnessDir}/${rulesRename}/`);
}

export function isMarkdownProsePath(path: string): boolean {
  return path.endsWith(".md") || path.endsWith(".md.example");
}

// Transform one file's bytes for a harness: token + rules-rename on prose,
// verbatim otherwise. `srcPath` selects the branch by extension only.
export function transform(
  srcPath: string,
  content: Buffer,
  harnessDir: string,
  rulesRename: string | null,
): Buffer {
  if (isMarkdownProsePath(srcPath)) {
    let s = substituteToken(content.toString("utf-8"), harnessDir);
    s = applyRulesRename(s, harnessDir, rulesRename);
    return Buffer.from(s, "utf-8");
  }
  return content;
}
