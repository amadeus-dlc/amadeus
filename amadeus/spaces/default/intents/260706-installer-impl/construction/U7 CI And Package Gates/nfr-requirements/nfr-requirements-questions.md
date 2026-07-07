# NFR Requirements Questions — U7 CI And Package Gates

> Stage: construction / nfr-requirements  
> Unit: U7 CI And Package Gates  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

U7 では追加の人間質問を実施しない。

## Rationale

- `business-logic-model.md` が installer-related 判定、GatePlan、Concrete Gate Execution Contract、allowlist workflow、secret scan workflow、coverage registry workflow を定義している。
- `business-rules.md` が blocking gate、metadata、test/coverage、security、drift guard、reporting rules を定義している。
- `requirements.md` の FR-016 が CI blocking gate の必須範囲を定義している。
- `technology-stack.md` が Bun/TypeScript、既存 CI command、Bun 1.3.13 baseline を固定している。

## Resolved Questions

| Question | Answer |
|---|---|
| Should U7 publish to npm or create GitHub Releases? | No. U7 is PR/package validation only; U8 owns manual release and publish. |
| Should installer-related PR gates be blocking? | Yes. FR-016 requires package dry-run, tests, security scan, coverage registry/ratchet, typecheck, lint, `dist:check`, and `promote:self:check` as blocking gates. |
| Should non-installer PRs run package-specific installer gates? | No. They may skip U7 package-specific gates, while global repository gates remain intact. |
| Should High/Critical vulnerabilities ever pass? | Only as `passed-with-exception` when allowlist id/package/range/reason/owner/expiry are valid. |
| Should line coverage percentage replace coverage registry? | No. Requirement/story coverage registry and ratchet are the quality floor. |

