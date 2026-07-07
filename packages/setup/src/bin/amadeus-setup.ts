#!/usr/bin/env bun
import { runSetup } from "./run-setup.ts";

const result = await runSetup(process.argv.slice(2), process.env);

if (result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}
if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}

process.exitCode = result.code;
