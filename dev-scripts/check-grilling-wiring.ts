#!/usr/bin/env bun

import { grillingWiringIssues } from "./grilling-wiring";

const issues = grillingWiringIssues(process.cwd());
if (issues.length > 0) {
  console.error("grilling wiring: drift detected");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("grilling wiring: ok");
