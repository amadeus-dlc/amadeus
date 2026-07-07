# NFR Design Questions — U1 Setup Package Shell

> Stage: construction / nfr-design  
> Unit: U1 Setup Package Shell  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Decision

U1 では追加の NFR design 質問を実施しない。

[Answer]: No additional questions. U1 NFR design decisions are fully determined by the approved NFR requirements and functional design artifacts.

## Rationale

- `performance-requirements.md` が help/startup/parser/wrapper の測定条件を固定している。
- `security-requirements.md` が wrapper delegation、package allowlist、secret-safe error rendering を固定している。
- `scalability-requirements.md` が single-process/O(1) parser/package growth guardrails を固定している。
- `reliability-requirements.md` が no-write/no-delegation/exit code/portability invariants を固定している。
- `tech-stack-decisions.md` と `business-logic-model.md` が Bun-first TypeScript、`packages/setup/`、`amadeus-setup` shell boundary を固定している。

## Design Decisions Already Fixed

| Question | Answer |
|---|---|
| Should U1 import version resolver or target adapters on help/error paths? | No. Help and parser errors must use shell-only modules. |
| Should the Node/npm wrapper shell-concatenate argv? | No. Delegation uses argv array and inherited stdio. |
| Should U1 validate target filesystem state? | No. U1 preserves target string only; U3/U5 own filesystem behavior. |
| Should `init` be accepted as an alias? | No. It is rejected as `unsupported-command`. |
| Should parser use a heavy runtime dependency? | No by default. Any dependency needs NFR-005 rationale. |

## Ambiguity Analysis

- Vague answers: none. The only answer is explicit no-additional-questions.
- Contradictions: none. The decision matches `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, and `business-logic-model.md`.
- Missing details blocking artifact generation: none. Module isolation, wrapper delegation, parser/error behavior, package metadata validation, and no-write boundaries are fixed by upstream artifacts.
