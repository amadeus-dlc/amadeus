#!/usr/bin/env bun

import { scaleTestTime } from "./lib/test-time-factor.ts";

const baseline = process.argv[2];
if (!baseline || !/^[1-9][0-9]*$/.test(baseline)) {
  throw new Error("test-timeout-ms requires one positive integer baseline in milliseconds");
}

process.stdout.write(`${scaleTestTime(Number(baseline))}\n`);
