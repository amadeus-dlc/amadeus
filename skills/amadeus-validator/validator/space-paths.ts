// aidlc workspace の Space 解決。
// Space は aidlc/active-space（存在する場合）が指し、なければ default を使う。

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function resolveActiveSpace(workspaceRoot: string): string {
  const cursor = join(workspaceRoot, "aidlc/active-space");
  if (!existsSync(cursor)) return "default";
  const name = readFileSync(cursor, "utf8").trim();
  return name === "" ? "default" : name;
}

export function spaceBase(workspaceRoot: string): string {
  return `aidlc/spaces/${resolveActiveSpace(workspaceRoot)}`;
}
