import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

type WiringPair = { agentsDir: string; claudeDir: string };

const wiringPairs: WiringPair[] = [
  { agentsDir: ".agents/skills", claudeDir: ".claude/skills" },
  { agentsDir: ".agents/rules", claudeDir: ".claude/rules" },
];

const settingsPath = ".claude/settings.json";

export function claudeHostWiringIssues(root: string): string[] {
  const issues: string[] = [];
  for (const pair of wiringPairs) issues.push(...pairIssues(root, pair));
  issues.push(...settingsIssues(root));
  return issues;
}

function pairIssues(root: string, pair: WiringPair): string[] {
  if (!existsSync(join(root, pair.agentsDir))) return [`missing directory: ${pair.agentsDir}`];
  if (!existsSync(join(root, pair.claudeDir))) return [`missing directory: ${pair.claudeDir}`];

  const agentsEntries = readdirSync(join(root, pair.agentsDir)).sort();
  const claudeEntries = readdirSync(join(root, pair.claudeDir)).sort();

  const issues: string[] = [];
  for (const entry of agentsEntries) {
    if (!claudeEntries.includes(entry)) {
      issues.push(`missing symlink: ${pair.claudeDir}/${entry} -> ${pair.agentsDir}/${entry}`);
    }
  }
  for (const entry of claudeEntries) {
    issues.push(...linkIssues(root, pair, entry));
  }
  return issues;
}

function linkIssues(root: string, pair: WiringPair, entry: string): string[] {
  const linkPath = `${pair.claudeDir}/${entry}`;
  if (!lstatSync(join(root, linkPath)).isSymbolicLink()) return [`not a symlink: ${linkPath}`];

  let resolved: string;
  try {
    resolved = realpathSync(join(root, linkPath));
  } catch {
    return [`dangling symlink: ${linkPath}`];
  }

  const expectedPath = join(root, pair.agentsDir, entry);
  if (!existsSync(expectedPath)) return [`extra entry: ${linkPath}`];
  if (resolved !== realpathSync(expectedPath)) {
    return [`wrong symlink target: ${linkPath} -> ${resolved}`];
  }
  return [];
}

function settingsIssues(root: string): string[] {
  const path = join(root, settingsPath);
  if (!existsSync(path)) return [`missing file: ${settingsPath}`];
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [`invalid JSON: ${settingsPath} (${detail})`];
  }
  return [];
}
