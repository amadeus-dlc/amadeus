// Child process for the U5 cross-process restore test: restore the persisted
// intent anchor in a separate process (FR-TRC-4, BR-6) and print it as JSON
// on stdout for the parent test to assert against.
//
// usage: otel-restore-child <dir> <intentId>
import { restoreIntentContext } from "../../dist/claude/.claude/otel/context.ts";

const [dir, intentId] = process.argv.slice(2);
if (!dir || !intentId) throw new Error("usage: otel-restore-child <dir> <intentId>");

process.stdout.write(JSON.stringify(restoreIntentContext(dir, intentId)));
