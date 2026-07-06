// @ts-nocheck
// Fixture helper for t92 lock-orphan recovery test. Acquires the audit
// lock via withAuditLock, then calls process.exit(1) from inside the
// callback. The withAuditLock helper at amadeus-lib.ts:462-467 installs
// an `process.on("exit")` handler that reaps the lock dir on graceful
// exit — this fixture exercises that recovery path. After this script
// runs, the lock dir should NOT exist; a follow-up `amadeus-sensor fire`
// must acquire the lock without burning the 5×100ms retry budget.
//
// Args: <projectDir> — passed through to withAuditLock.
//
// NOTE: This is invoked directly by the test (not via the sensor
// dispatcher); it imports withAuditLock from the real amadeus-lib.ts.
// Lives next to the dispatcher (copied at test runtime) so the
// `./amadeus-lib.ts` relative import resolves.

import { withAuditLock } from "./amadeus-lib.ts";

const projectDir = process.argv[2];
if (!projectDir) {
	process.stderr.write("usage: lock-exit-helper.ts <projectDir>\n");
	process.exit(2);
}

withAuditLock(projectDir, () => {
	// Exit while holding the lock. Bun's process.exit skips finally blocks
	// (per amadeus-lib.ts:401-411 commentary), so the lock would leak without
	// the on-exit handler. The handler is the contract under test.
	process.exit(1);
});
