# Performance Requirements — U1 Setup Package Shell

> Stage: construction / nfr-requirements  
> Unit: U1 Setup Package Shell  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U1 の performance target は CLI shell の起動、help rendering、parser validation、Node/npm wrapper delegation に限定する。`business-logic-model.md` が定義する通り、U1 は version resolution、GitHub archive fetch、target detection、file planning、apply を実行しないため、network latency や target filesystem traversal は U1 の性能対象ではない。

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| `bunx @amadeus-dlc/setup --help` equivalent local bin startup | p95 <= 750ms on CI runner after dependency install | U6 smoke timing |
| `amadeus-setup --help` direct Bun invocation | p95 <= 300ms on CI runner | U6 smoke timing |
| invalid command such as `init` | p95 <= 300ms and no application-service delegation | unit/smoke test |
| duplicate or unsupported harness parse error | p95 <= 300ms and no target access | unit test with fake service spy |
| Node/npm wrapper with Bun absent | p95 <= 500ms and clear stderr | smoke test with PATH fixture |

These targets are not user-facing SLA guarantees. They are quality gates that keep the package shell from gaining expensive imports or accidental network/filesystem work.

## Measurement Protocol

All timing measurements use the U6 smoke harness and run on the GitHub Actions Ubuntu runner configured by `technology-stack.md` unless a portability lane overrides the OS. The measurement is intentionally warm-start after `bun install --frozen-lockfile`; dependency installation time is excluded.

| Scenario | Command shape | Samples | Cold/warm handling | Pass condition | Fail condition |
|---|---|---:|---|---|---|
| Bun direct help | `bun packages/setup/src/bin/amadeus-setup.ts --help` or built equivalent | 20 | first 3 discarded as warmup | p95 <= 300ms, exit 0, help excludes `init` | p95 above target, non-zero exit, target access |
| Bunx/local package help | local packed/bin invocation equivalent to `bunx @amadeus-dlc/setup --help` | 20 | first 3 discarded as warmup | p95 <= 750ms, exit 0, Bun-required caveat present | p95 above target, non-zero exit |
| Invalid command | `amadeus-setup init` | 20 | first 3 discarded as warmup | p95 <= 300ms, non-zero exit, `unsupported-command`, no delegation | p95 above target, application service called |
| Duplicate/unsupported harness | `amadeus-setup install --harness codex --harness claude` and unsupported value case | 20 each | first 3 discarded as warmup | p95 <= 300ms, non-zero exit, no target access | p95 above target, target read/write |
| Node/npm wrapper without Bun | npm bin wrapper with PATH fixture that hides Bun | 10 | no warmup discard because failure path is wrapper-only | p95 <= 500ms, non-zero exit, Bun-required stderr | p95 above target, shell error, target access |

Timing failures are NFR failures only when the functional output also satisfies its expected exit/output contract. If command output is wrong, classify the test as reliability/functional failure rather than only performance failure.

## Resource Constraints

- Help and parse paths must not import GitHub archive, extraction, target snapshot, or file apply adapters.
- Help and parse paths must not perform network calls.
- Help and parse paths must not inspect the target directory.
- U1 startup should keep dependency footprint minimal; any runtime dependency added for CLI parsing or wrapper behavior must be justified under `requirements.md` NFR-005.
- `technology-stack.md` fixes TypeScript/ESM and Bun as the implementation stack; performance tests use Bun 1.3.13-compatible behavior.

## Benchmarks And Evidence

| Evidence | Required by | Notes |
|---|---|---|
| U6 smoke timing for help startup | `business-rules.md` BR-U1-008 | Runs without real GitHub or target mutation |
| Unit test for parser no-delegation | `business-logic-model.md` Command Parsing Workflow | Invalid grammar returns before U2-U5 |
| Package dry-run size report | `requirements.md` FR-001 / NFR-005 | Guards accidental large publish contents |
| CI typecheck/lint | `technology-stack.md` CI and Toolchain | Ensures TypeScript path remains valid |

## Upstream Coverage

- `business-logic-model.md`: Startup, help, parse, and delegation workflows define the measured paths.
- `business-rules.md`: Runtime and safety rules become timing/no-target-access conditions.
- `requirements.md`: FR-001 / FR-002 / FR-011 and NFR-005 define startup and dependency constraints.
- `technology-stack.md`: Bun/TypeScript/CI details define the measurement environment.
