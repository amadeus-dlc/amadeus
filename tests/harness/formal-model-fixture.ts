import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SHA256_PLACEHOLDER = "0".repeat(64);

export function activationModelMap(name = "FormalElection"): string {
  return `${JSON.stringify({
    schemaVersion: 2,
    models: [{
      name,
      model: { path: `specs/tla/${name}.tla`, identity: SHA256_PLACEHOLDER },
      cfg: { path: `specs/tla/${name}.cfg`, identity: SHA256_PLACEHOLDER },
      entries: [{
        implPath: "packages/framework/core/tools/amadeus-plugin-activation.ts",
        sha256: SHA256_PLACEHOLDER,
      }],
    }],
  })}\n`;
}

export function writeActivationModelMap(projectRoot: string, name = "FormalElection"): void {
  const path = join(projectRoot, "specs", "tla", "model-map.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, activationModelMap(name));
}

export function writeActivationModelAssets(
  projectRoot: string,
  name = "FormalElection",
): void {
  const root = join(projectRoot, "specs", "tla");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, `${name}.tla`), `---- MODULE ${name} ----\n====\n`);
  writeFileSync(join(root, `${name}.cfg`), "INIT Init\nNEXT Next\n");
  writeActivationModelMap(projectRoot, name);
}
