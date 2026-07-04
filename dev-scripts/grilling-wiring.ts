import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const annexRelPath = "skills/amadeus/references/question-rendering.md";
const conductorRelPath = "skills/amadeus/SKILL.md";
const bridgeRelPath = "skills/amadeus-grilling/references/engine-bridge.md";
const promotedRoot = ".agents/skills";

// Stage-runner boilerplate markers. The OLD form told the agent to follow the
// bridge unconditionally; the NEW form offers Grill me as the 2nd mode-selection
// option and only follows the bridge when the user picks it.
const oldStageWordingMarker = "asks the user questions, follow the grilling bridge protocol";
const newStageWordingMarker = "asks the user questions, offer Grill me as the 2nd option";

// A SKILL.md is a "stage-runner" skill (renders the mode selection for a
// <stage>-questions.md file) when it references engine-bridge.md AND talks
// about the stage asking the user questions — as opposed to the `ask`
// directive routing wiring in amadeus/SKILL.md and the scope-wrapper skills
// (amadeus-bugfix, amadeus-feature, amadeus-mvp, amadeus-security-patch),
// which reference engine-bridge.md for a different flow and are out of scope.
function isStageRunnerSkill(text: string): boolean {
  return text.includes("engine-bridge.md") && text.includes("asks the user questions");
}

function annexIssues(root: string): string[] {
  const path = join(root, annexRelPath);
  if (!existsSync(path)) return [`missing file: ${annexRelPath}`];
  const text = readFileSync(path, "utf8");

  const requiredMarkers = [
    "Grill me",
    "Guide me",
    "I'll edit the file",
    "Chat",
    "one question at a time",
    "[Answer]:",
    "aidlc-log.ts",
    "engine-bridge.md",
  ];
  const issues: string[] = [];
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) {
      issues.push(`${annexRelPath}: missing required marker "${marker}"`);
    }
  }

  const order = ["Guide me", "Grill me", "I'll edit the file", "Chat"];
  const positions = order.map((label) => text.indexOf(label));
  if (positions.every((position) => position >= 0)) {
    for (let index = 1; index < positions.length; index += 1) {
      if (positions[index] <= positions[index - 1]) {
        issues.push(`${annexRelPath}: mode selection order must be Guide me / Grill me / I'll edit the file / Chat`);
        break;
      }
    }
  }

  return issues;
}

function stageSkillDirs(root: string): string[] {
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir).filter((name) => {
    if (!name.startsWith("amadeus-")) return false;
    const skillPath = join(skillsDir, name, "SKILL.md");
    if (!existsSync(skillPath)) return false;
    return isStageRunnerSkill(readFileSync(skillPath, "utf8"));
  });
}

function stageWordingIssues(root: string, dirs: string[]): string[] {
  const issues: string[] = [];
  for (const dir of dirs) {
    const relPath = `skills/${dir}/SKILL.md`;
    const text = readFileSync(join(root, relPath), "utf8");
    if (text.includes(oldStageWordingMarker)) {
      issues.push(`${relPath}: still carries the OLD unconditional grilling-bridge wording`);
    }
    if (!text.includes(newStageWordingMarker)) {
      issues.push(`${relPath}: missing the NEW Grill me mode-selection wording`);
    }
  }
  return issues;
}

// Extracts every backtick-quoted `...engine-bridge.md` path reference from a
// file's text (e.g. `` `../amadeus-grilling/references/engine-bridge.md` ``).
function extractEngineBridgeRefs(text: string): string[] {
  const regex = /`([^`]*engine-bridge\.md)`/g;
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) refs.push(match[1]);
  return refs;
}

// Verifies that every engine-bridge.md reference found in `relPath` actually
// resolves to an existing file, relative to `relPath`'s own directory — a
// reference can name the right filename while pointing at the wrong number
// of `../` hops (e.g. a file nested one directory deeper than the skill's
// SKILL.md needs an extra `../`).
function pathResolutionIssues(root: string, relPath: string): string[] {
  const fullPath = join(root, relPath);
  if (!existsSync(fullPath)) return [];
  const text = readFileSync(fullPath, "utf8");
  const dir = dirname(fullPath);
  const issues: string[] = [];
  for (const ref of extractEngineBridgeRefs(text)) {
    const resolved = join(dir, ref);
    if (!existsSync(resolved)) {
      issues.push(
        `${relPath}: engine-bridge reference "${ref}" does not resolve to an existing file (expected ${relative(root, resolved)})`,
      );
    }
  }
  return issues;
}

function promotionIssues(root: string, relPaths: string[]): string[] {
  const issues: string[] = [];
  for (const relPath of relPaths) {
    const sourcePath = join(root, relPath);
    const promotedPath = join(root, promotedRoot, relPath.slice("skills/".length));
    if (!existsSync(sourcePath)) {
      issues.push(`missing file: ${relPath}`);
      continue;
    }
    if (!existsSync(promotedPath)) {
      issues.push(`missing promoted counterpart: ${promotedPath.slice(root.length + 1)}`);
      continue;
    }
    const sourceText = readFileSync(sourcePath, "utf8");
    const promotedText = readFileSync(promotedPath, "utf8");
    if (sourceText !== promotedText) {
      issues.push(`${relPath}: source and promoted (.agents/skills) copies differ`);
    }
  }
  return issues;
}

export function grillingWiringIssues(root: string): string[] {
  const issues: string[] = [];
  issues.push(...annexIssues(root));

  const dirs = stageSkillDirs(root);
  issues.push(...stageWordingIssues(root, dirs));

  const affectedRelPaths = [
    annexRelPath,
    conductorRelPath,
    bridgeRelPath,
    ...dirs.map((dir) => `skills/${dir}/SKILL.md`),
  ];
  issues.push(...promotionIssues(root, affectedRelPaths));

  for (const relPath of affectedRelPaths) {
    issues.push(...pathResolutionIssues(root, relPath));
    const promotedRelPath = join(promotedRoot, relPath.slice("skills/".length));
    issues.push(...pathResolutionIssues(root, promotedRelPath));
  }

  return issues;
}
