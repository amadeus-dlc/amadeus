import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hooksHealthDir } from "../../packages/framework/core/tools/amadeus-lib.ts";

/** Seed the exact run-stage output scope consumed by the sensor-fire hook. */
export function seedSensorInvocation(
  projectDir: string,
  stage: string,
  produces: string[],
  optionalProduces: string[] = [],
): void {
  const healthDir = hooksHealthDir(projectDir);
  mkdirSync(healthDir, { recursive: true });
  writeFileSync(
    join(healthDir, "sensor-invocation.json"),
    `${JSON.stringify(
      {
        version: 1,
        stage,
        produces,
        optional_produces: optionalProduces,
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}
