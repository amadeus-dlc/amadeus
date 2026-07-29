# Code Generation Plan — U1: otel-walking-skeleton

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、scalability-design.md、reliability-design.md、logical-components.md、unit-of-work.md、requirements.md（すべて参照済み）

Traceability note: the scope skips user-stories (2.4), so steps map to requirement IDs
(FR/NFR/VER/BR) from requirements.md + the unit's business rules — NOT to the captured
intent only (this scope carries a full requirements artifact; the intent-only fallback
does not apply).

Spike evidence already collected this session (pre-plan):
- `@opentelemetry/context-async-hooks` AsyncHooksContextManager: BROKEN on Bun 1.3.13
  (context lost at every await) → falsified for Bun.
- Same package's AsyncLocalStorageContextManager: PASSES await / Promise.all isolation /
  timer / exception boundaries on Bun 1.3.13 → adopted (off-the-shelf, no custom Adapter
  needed; BR-12 / assumption A-1 resolved by the in-package alternative).
- `@opentelemetry/api-logs` 0.221.0: `logger.emit({ eventName, attributes, context })`
  shape accepts the canonical contract on Bun → Q2-A tentative adopt, pinned.
- Pinned: @opentelemetry/api@1.9.1, @opentelemetry/api-logs@0.221.0,
  @opentelemetry/context-async-hooks@2.10.0 (devDependencies — bundle inputs, FR-DST-1).

Test-first order per VER-3: failure contract → Context → Exporter contract → shadow prototype.

- [ ] Step 1: Failure-contract tests FIRST, red (VER-3, FR-EVT-3/4/5/6, BR-3/4/5)
  `tests/integration/t-otel-failure-contract.test.ts`: write failure → sync throw + latch set;
  middle-layer catch does not clear latch; assertMutationAllowed refuses when set;
  span/log/metric exporter failures are fail-open; health probe is non-destructive.
- [ ] Step 2: Context tests FIRST, red (FR-TRC-3, BR-8b)
  `tests/integration/t-otel-context.test.ts`: maintenance across await / timer / exception,
  isolation across Promise.all siblings, via the registered global context manager.
- [ ] Step 3: Exporter-contract tests FIRST, red (FR-JRN-3, BR-2/8/9/10, FR-EVT-2/6)
  `tests/integration/t-otel-exporter-contract.test.ts`: emitEvent → record readable from audit
  JSONL in-process; registry required-attributes validation; two-layer redaction;
  unknown canonical name rejected; diagnostic path fail-open.
- [ ] Step 4: Bundle + Logs-API spike tests FIRST, red (NFR-3, A-3, Q2-A)
  `tests/integration/t-otel-bundle.test.ts`: `bun build` of an otel entry → single self-contained
  file that runs in a node_modules-free cwd; API singleton unique inside the bundle.
- [ ] Step 5: `packages/framework/core/otel/` implementation (FR-EXP-1/2/3/4/5/6, FR-EVT-2..6)
  fatal-latch.ts, redaction.ts, event-registry.ts (minimal: DECISION_RECORDED +
  QUESTION_ANSWERED), audit-log-exporter.ts (reuses appendAuditEntry lock/seq/idempotency),
  local-span-exporter.ts, local-log-exporter.ts, local-metric-exporter.ts (fail-open,
  `<record>/.amadeus-otel/{spans,logs,metrics}-<clone>.jsonl`), tracer-provider.ts,
  logger-provider.ts (api-logs), meter-provider.ts (Counter/Histogram subset),
  context.ts (AsyncLocalStorage manager + IntentTraceContext persist/restore +
  W3C injectToSubprocess), bootstrap.ts.
- [ ] Step 6: Representative connections (BR-1, Q1-A)
  tools/amadeus-log.ts: decision/answer via emitEvent (canonical path swap only).
  hooks/amadeus-session-end.ts: bootstrap + startActiveSpan around projector spawn +
  injectToSubprocess env (gated by the existing observability.enabled opt-in;
  finally { span.end(); } sample per FR-TRC-2).
- [ ] Step 7: Measurement harness as integration test (NFR-1/2 inputs)
  `tests/integration/t-otel-measurement.test.ts`: sync-append cold/warm p50/p95 of
  AuditLogExporter vs current appendAuditEntry; startup overhead with/without providers;
  emits JSON numbers for the Phase 1 ADR.
- [ ] Step 8: VER-2 credential-free gate prototype + shadow comparison prototype
  `scripts/otel-credential-scan.ts` (shares redaction vocabulary, scans real Stores) +
  `scripts/otel-shadow-compare.ts` (machine-readable report: event count, linkage,
  status, allowed attributes) + unit tests with fixtures.
- [ ] Step 9: Distribution (FR-DST-2, BR-14)
  Add `{ src: "otel", dst: "otel" }` coreDirs row to all 7 harness manifests;
  `bun scripts/package.ts`; `bun scripts/package.ts --check`;
  `bun scripts/promote-self.ts --apply` + `promote:self:check`.
- [ ] Step 10: Config + gates
  tsconfig.json include `packages/framework/core/otel/*.ts`; `bun run typecheck`;
  `bun run lint` green; new tests green (red → green same session).
- [ ] Step 11: Phase 1 ADR append to inception/application-design/decisions.md
  Logs API adopt + version pin (Q2-A), Context Manager result (A-1), bundle composition
  (A-3), Journal health probe = read-parse (FR-EVT-5), measured numbers from Step 7.
- [ ] Step 12: code-summary.md + state update

Explicitly out of scope (other units): relay.ts (U11), migration-adapter.ts (U7),
full 78-event registry + 4-set drift guard (U2/VER-1), schema v2 codec (U3),
production redaction vocabulary / CI wiring of VER-2 (U4), production context
propagation wiring (U5), metrics/logs stores beyond minimal subset (U9/U10).
