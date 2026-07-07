import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { TargetReadOnlyFilePort } from "../ports/target-state.ts";

export class NodeTargetReadOnlyFile implements TargetReadOnlyFilePort {
  exists(path: string): boolean {
    return existsSync(path);
  }

  readFile(path: string): Uint8Array {
    return readFileSync(path);
  }

  md5(path: string): string {
    return createHash("md5").update(readFileSync(path)).digest("hex");
  }
}
