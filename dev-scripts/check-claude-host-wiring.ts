#!/usr/bin/env bun

import { claudeHostWiringIssues } from "./claude-host-wiring";

const issues = claudeHostWiringIssues(process.cwd());
if (issues.length > 0) {
  console.error("claude host wiring: drift detected");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("claude host wiring: ok");
