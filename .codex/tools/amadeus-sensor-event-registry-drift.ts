// amadeus-sensor-event-registry-drift.ts — per-sensor script for the
// `event-registry-drift` sensor (VER-1, layer 3 of the drift guard).
//
// Re-runs the four-set extraction of otel/event-registry-drift.ts against the
// harness's own shipped sources and prints the locked stdout JSON shape:
//
//   {"pass": <bool>, "errors": [{file, line, column, message}], "findings_count": <n>}
//
// The check is self-locating: the script lives in {{HARNESS_DIR}}/tools/, so
// the harness dir is its own parent — the same relative layout the unit test
// (tests/unit/event-registry-drift.test.ts) verifies against dist.
//
// Exit codes (dispatcher conventions, mirroring amadeus-sensor-type-check):
//   0   pass or fail (the JSON pass field carries the verdict)
//   1   harness sources unreadable (dispatcher reclassifies via branch e)

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectDriftSets, findRegistryDrift } from "../otel/event-registry-drift.ts";

interface SensorError {
	file: string;
	line: number;
	column: number;
	message: string;
}

interface SensorOutput {
	pass: boolean;
	errors: SensorError[];
	findings_count: number;
}

function parseArgs(argv: string[]): void {
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--stage" || a === "--file-path") {
			i++; // accepted for dispatcher parity; the check covers the whole registry
		} else if (a === "--help" || a === "-h") {
			process.stdout.write(
				"Usage: amadeus-sensor-event-registry-drift --stage <slug> --file-path <path>\n\n" +
					"Runs the VER-1 four-set drift check against the harness's shipped\n" +
					"event registry + audit vocabulary and prints {pass, errors[]} JSON.\n"
			);
			process.exit(0);
		} else {
			process.stderr.write(`unknown flag: ${a}\n`);
			process.exit(1);
		}
	}
}

parseArgs(process.argv.slice(2));

const harnessDir = dirname(dirname(fileURLToPath(import.meta.url)));

let output: SensorOutput;
try {
	const sets = collectDriftSets(harnessDir);
	const findings = findRegistryDrift(sets);
	output = {
		pass: findings.length === 0,
		errors: findings.map((message) => ({
			file: join(harnessDir, "otel", "event-registry.ts"),
			line: 0,
			column: 0,
			message,
		})),
		findings_count: findings.length,
	};
} catch (cause) {
	process.stderr.write(`event-registry-drift: cannot read harness sources: ${cause instanceof Error ? cause.message : String(cause)}\n`);
	process.exit(1);
}

process.stdout.write(`${JSON.stringify(output)}\n`);
