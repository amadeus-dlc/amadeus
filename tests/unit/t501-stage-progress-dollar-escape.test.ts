// covers: function:replaceStageProgressSection
// size: small
//
// t501 — Issue #2580 regression pin for replaceStageProgressSection.
//
// The function spliced the rebuilt `## Stage Progress` body via
// `content.replace(STAGE_PROGRESS_SECTION_RE, \`## Stage Progress\n...\n${body}\`)`
// — a TEMPLATE replacement string. `body` is built from stage slugs and (when a
// per-unit line is supplied) caller-controlled text, so a `$`-special sequence
// in `body` (`$1`/`$&`/`` $` ``/`$'`/`$$`) would have been interpreted as a
// replacement pattern instead of stored verbatim — corrupting the section
// (e.g. re-injecting the pre/post-match text, most alarmingly `$'`, which
// duplicates whatever followed the section onto one line). Fixed by switching
// the splice to a replacer function.
//
// Pure in-process: no fs, no spawn — the exported function only reads/returns
// strings.

import { describe, expect, test } from "bun:test";
import { replaceStageProgressSection } from "../../packages/framework/core/tools/amadeus-lib.ts";

const BASE_CONTENT = [
  "# Amadeus State",
  "",
  "## Stage Progress",
  "<!-- old header comment -->",
  "- [x] old-stage — EXECUTE",
  "",
  "## Next Section",
  "- **Field**: untouched",
  "",
].join("\n");

const DOLLAR_BODIES: Array<[label: string, body: string]> = [
  ["$1 (capture group)", "- [x] stage-a — EXECUTE $1 tail"],
  ["$& (whole match)", "- [x] stage-a — EXECUTE $& tail"],
  ["$' (post-match)", "- [x] stage-a — EXECUTE prefix-$'-suffix"],
  ["$$ (silent collapse)", "- [x] stage-a — EXECUTE total $$5"],
  ["trailing lone $", "- [x] stage-a — EXECUTE amount$"],
];

describe("t501 replaceStageProgressSection stores $-special bodies verbatim (Issue #2580)", () => {
  for (const [label, body] of DOLLAR_BODIES) {
    test(label, () => {
      const out = replaceStageProgressSection(BASE_CONTENT, body);
      // The rebuilt body must appear byte-for-byte, not $-expanded.
      expect(out).toContain(`## Stage Progress\n<!-- Checkbox states:`);
      expect(out).toContain(body);
      // The following section must be untouched — exactly one occurrence,
      // with no $&/$'-driven duplication or bleed from the splice.
      expect(out.match(/^## Next Section$/gm)?.length).toBe(1);
      expect(out.match(/^- \*\*Field\*\*: untouched$/gm)?.length).toBe(1);
    });
  }
});
