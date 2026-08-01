// otel-reset.ts — drop the per-process OTel state between fixture projects.
//
// The bootstrap seam enforces ONE workspace per process: a second
// ensureOtelBootstrap for a different project dir throws rather than
// re-registering, because in production a process only ever serves one
// workspace. A test file is the exception — it mints a fresh temp project per
// case and drives production code that bootstraps on the way to an emit — so
// the per-process records are dropped between cases, exactly as the provider
// registrations already are.
//
// BOTH SURFACES. Some suites import the subject from dist/ (the shipped copy)
// and others from packages/framework/core/ (the canonical source). Those are
// two module graphs with two sets of singletons, and a suite cannot generally
// know which graph the code under test will reach. Resetting both is cheap and
// removes the failure mode where a reset lands on the wrong copy.

import { resetOtelBootstrapForTests as resetBootstrapDist } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { resetFatalLatchForTests as resetLatchDist } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests as resetLoggerDist } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { resetTracerProviderForTests as resetTracerDist } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { resetOtelBootstrapForTests as resetBootstrapSrc } from "../../packages/framework/core/otel/bootstrap.ts";
import { resetFatalLatchForTests as resetLatchSrc } from "../../packages/framework/core/otel/fatal-latch.ts";
import { resetLoggerProviderForTests as resetLoggerSrc } from "../../packages/framework/core/otel/logger-provider.ts";
import { resetTracerProviderForTests as resetTracerSrc } from "../../packages/framework/core/otel/tracer-provider.ts";

export function resetOtelPerProject(): void {
  resetLatchDist();
  resetLoggerDist();
  resetTracerDist();
  resetBootstrapDist();
  resetLatchSrc();
  resetLoggerSrc();
  resetTracerSrc();
  resetBootstrapSrc();
}
