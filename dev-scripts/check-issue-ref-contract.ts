#!/usr/bin/env bun

import { issueRefContractIssues } from "./issue-ref-contract";

const issues = issueRefContractIssues(process.cwd());
if (issues.length > 0) {
  console.error("issue-ref contract: drift detected");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("issue-ref contract: ok");
