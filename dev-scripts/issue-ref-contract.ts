import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Public skills that take a GitHub Issue as input (R005 / #252). Enumerated
// from the `amadeus` Intake path — the only entrypoint that reads a freeform
// description (and therefore a possible Issue reference) today. Extend this
// list if another public skill grows an Issue-input path.
const issueInputSkills = ["amadeus"];

const promotedRoot = ".agents/skills";

// The 3 contract clauses required by requirements.md R005 / business-rules.md
// "入力参照解決ルール（WF4）": the #nnn/URL equivalence rule, the explicit
// owner/repo#nnn form, and the ambiguous-context stop-and-ask rule.
const requiredMarkers = ["#nnn", "owner/repo#nnn", "equivalent", "ambiguous", "stop and ask"];

function markerIssues(relPath: string, text: string): string[] {
  const issues: string[] = [];
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) {
      issues.push(`${relPath}: missing required issue-ref-contract marker "${marker}"`);
    }
  }
  return issues;
}

function skillIssues(root: string, skillName: string, base: string): string[] {
  const relPath = join(base, skillName, "SKILL.md");
  const fullPath = join(root, relPath);
  if (!existsSync(fullPath)) return [`missing file: ${relPath}`];
  return markerIssues(relPath, readFileSync(fullPath, "utf8"));
}

export function issueRefContractIssues(root: string): string[] {
  const issues: string[] = [];
  for (const skillName of issueInputSkills) {
    issues.push(...skillIssues(root, skillName, "core/skills"));
    issues.push(...skillIssues(root, skillName, promotedRoot));
  }
  return issues;
}
