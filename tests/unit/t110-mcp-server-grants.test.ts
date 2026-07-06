// covers: file:agents/amadeus-product-agent.md, file:agents/amadeus-design-agent.md, file:agents/amadeus-delivery-agent.md, file:agents/amadeus-architect-agent.md, file:agents/amadeus-aws-platform-agent.md, file:agents/amadeus-compliance-agent.md, file:agents/amadeus-devsecops-agent.md, file:agents/amadeus-developer-agent.md, file:agents/amadeus-quality-agent.md, file:agents/amadeus-pipeline-deploy-agent.md, file:agents/amadeus-operations-agent.md
//
// t110 — Claude defaults carry no project MCP registry. MCP servers are now an
// explicit project/user choice instead of a shipped AWS/Amazon-oriented default.
// This test pins that contract and keeps the agent tool allowlists free of
// malformed MCP grant tokens.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC, REPO_ROOT } from "../harness/fixtures.ts";

const MCP_JSON = join(REPO_ROOT, "dist", "claude", ".mcp.json");
const AGENTS_DIR = join(AMADEUS_SRC, "agents");

const AGENTS = [
  "product",
  "design",
  "delivery",
  "architect",
  "aws-platform",
  "compliance",
  "devsecops",
  "developer",
  "quality",
  "pipeline-deploy",
  "operations",
] as const;

function mcpTokens(agent: string): string[] {
  const file = join(AGENTS_DIR, `amadeus-${agent}-agent.md`);
  if (!existsSync(file)) return [];
  const body = readFileSync(file, "utf-8");
  return [...body.matchAll(/mcp__[A-Za-z0-9-]+(?:__[A-Za-z0-9_-]+)?/g)].map(
    (m) => m[0],
  );
}

function isFullyQualified(token: string): boolean {
  return /^mcp__[A-Za-z0-9-]+__/.test(token);
}

describe("t110 MCP defaults + agent grant hygiene", () => {
  test("Claude distribution does not ship a project .mcp.json by default", () => {
    expect(existsSync(MCP_JSON)).toBe(false);
  });

  test("no agent carries a bare mcp__<server> grant token", () => {
    const bare: string[] = [];
    for (const agent of AGENTS) {
      for (const tok of mcpTokens(agent)) {
        if (!isFullyQualified(tok)) {
          bare.push(`amadeus-${agent}-agent carries bare token '${tok}'`);
        }
      }
    }
    expect(bare, bare.join("\n")).toHaveLength(0);
  });
});
