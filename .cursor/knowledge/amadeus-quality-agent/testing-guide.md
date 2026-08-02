# Testing Guide

## Test Pyramid

Structure tests in this ratio (approximate):
```
         /  E2E  \          ~5%   (slow, expensive, high confidence)
        / Integration \      ~20%  (moderate speed, cross-component)
       /     Unit       \    ~75%  (fast, isolated, high volume)
```

### Unit Tests
- Test a single function/method/class in isolation
- Mock all external dependencies (database, network, file system)
- Execute in milliseconds; run on every commit
- Target: every public function with non-trivial logic
- Naming: `test_[function]_[scenario]_[expected_result]`

### Integration Tests
- Test interactions between two or more components
- Use real dependencies where practical (test database, local queue)
- Execute in seconds; run on every PR
- Target: API endpoints, service-to-repository interactions, message flows
- Focus on contract verification between components

### End-to-End Tests
- Test complete user workflows through the full stack
- Use a deployed (or containerized) environment
- Execute in minutes; run before release
- Target: critical business workflows only (login, core CRUD, payment)
- Maximum 20-30 e2e tests; more indicates missing integration coverage

## Test Types Beyond the Pyramid

### Performance Tests
- **Load test**: Expected concurrent users for sustained period (establish baseline)
- **Stress test**: Increase load until failure (find breaking point)
- **Soak test**: Sustained load over hours (find memory leaks, connection exhaustion)
- Metrics: response time (p50, p95, p99), throughput, error rate, resource utilization

### Security Tests
- **SAST**: Static analysis of source code for known vulnerability patterns
- **DAST**: Dynamic testing of running application (injection, XSS, auth bypass)
- **Dependency scan**: Check third-party packages against CVE databases
- Integrate into CI pipeline as blocking quality gate

### Contract Tests
- Verify API consumer expectations match provider implementation
- Use Pact or similar consumer-driven contract framework
- Run independently of full integration environment
- Essential for microservices and multi-team projects

### Accessibility Tests
- Automated: axe-core or pa11y for WCAG violations
- Manual: keyboard navigation, screen reader walkthrough
- Run automated checks in CI; manual checks before release

## Depth-Aware Test Volume

Test volume scales with the active test strategy (defaults to depth level, overridable via `--test-strategy`). Requirements, changed behavior, boundary risk, regression history, and NFR evidence determine the cases; numeric values are planning ceilings rather than quotas. The 4/8/12 question budgets are a separate interaction contract and are not test-count ceilings:

| Strategy | Selection model | Planning ceiling | Test Types |
|----------|-----------------|------------------|------------|
| Minimal (Nyquist) | 1 per requirement + happy-path floor | No component quota | Unit only |
| Standard | Requirement and risk driven | Up to 8 per component | Unit + integration |
| Comprehensive | Requirement, risk, and NFR driven | Up to 15 per component | Unit + integration + E2E + perf + security |

- **Minimal** uses a requirement-driven model (1 test per requirement, not per component). The pyramid doesn't apply — unit tests only.
- **Standard** and **Comprehensive** use risk-based selection. When unit,
  integration, and E2E layers all apply, 75/20/5 is default guidance within
  that three-layer subset only. Requirements, risk, and NFR evidence — including
  performance and security needs — take precedence over the ratio.
- The ceilings are soft guidelines. Exceed one only with a documented safety-critical or regression-risk reason, never to meet a count.

See stage-protocol.md §8 "Test Strategy" for the authoritative guidance.

## Test Case Design Template

```
Test ID: TC-[NNN]
Requirement: [FR/NFR ID]
Title: [descriptive name]
Priority: [P0/P1/P2]
Type: [unit/integration/e2e/performance/security]
Preconditions: [setup required]
Steps:
  1. [action]
  2. [action]
Expected Result: [verifiable outcome]
Cleanup: [teardown required]
```

## Quality Gate Definitions

### Gate 1: Code Review (before merge)
- All unit tests pass
- No new linter warnings
- Code coverage does not decrease
- Security scan finds no high/critical issues

### Gate 2: Integration (after merge to main)
- All integration tests pass
- Contract tests pass
- Performance baseline not regressed (>10% degradation = fail)

### Gate 3: Release Readiness (before deploy)
- All e2e tests pass on staging environment
- Accessibility automated checks pass
- No open P0/P1 defects
- Stakeholder acceptance sign-off obtained

## Test Data Strategy

- **Factories**: Generate test objects with sensible defaults, override per test
- **Fixtures**: Static data loaded before test suite (reference data, lookup tables)
- **Builders**: Fluent API for constructing complex test scenarios
- **Synthetic**: Generated data for performance tests (realistic volume and distribution)
- **Isolation**: Each test owns its data. Never share mutable state between tests.
- **Cleanup**: Tests clean up after themselves. Use database transactions that roll back.

## Defect Report Format

```
Defect ID: BUG-[NNN]
Severity: [Critical/High/Medium/Low]
Component: [affected component]
Summary: [one-line description]
Reproduction Steps:
  1. [step]
  2. [step]
Expected: [what should happen]
Actual: [what actually happens]
Environment: [OS, browser, version, config]
Evidence: [logs, screenshots, error messages]
```
