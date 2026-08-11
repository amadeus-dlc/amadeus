import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SHA256_PLACEHOLDER = "0".repeat(64);

export function activationModelMap(name = "FormalElection"): string {
  return `${JSON.stringify({
    schemaVersion: 2,
    models: [{
      name,
      model: { path: `amadeus/spaces/default/specs/tla/${name}.tla`, identity: SHA256_PLACEHOLDER },
      cfg: { path: `amadeus/spaces/default/specs/tla/${name}.cfg`, identity: SHA256_PLACEHOLDER },
      entries: [{
        implPath: "plugins/formal-model-check/tools/plugin-activation.ts",
        sha256: SHA256_PLACEHOLDER,
      }],
    }],
  })}\n`;
}

export function writeActivationModelMap(projectRoot: string, name = "FormalElection"): void {
  const path = join(projectRoot, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, activationModelMap(name));
  const implementation = join(projectRoot, "plugins", "formal-model-check", "tools", "plugin-activation.ts");
  mkdirSync(dirname(implementation), { recursive: true });
  writeFileSync(implementation, "export const fixture = true;\n");
}

export function writeActivationModelAssets(
  projectRoot: string,
  name = "FormalElection",
): void {
  const root = join(projectRoot, "amadeus", "spaces", "default", "specs", "tla");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, `${name}.tla`), `---- MODULE ${name} ----\n====\n`);
  writeFileSync(join(root, `${name}.cfg`), "INIT Init\nNEXT Next\n");
  writeActivationModelMap(projectRoot, name);
}
