# re-scan: 260811-pr-convergence-gate

## Observation

- Date: `2026-08-11`
- Prior observed base for this intent: `none`（既存 scan record なし）
- Newest observed base across existing re-scans: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（直前の共有 freshness pointer `260810-test-time-factor` の observed）
- Selected base commit: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`
- Observed commit: `854692fd7`
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Depth: `Minimal`
- Focus: [Issue #2838](https://github.com/amadeus-dlc/amadeus/issues/2838) — 4 self-* scope で pr-convergence を必須化し、手書き/copy/tamper report bypass を fail-closed にする。
- Scan mode: Developer scan の差分を Architect が synthesis。既存 CodeKB 全文は再調査せず、対象 component と既存 test evidence を統合した。

## Findings

### Implemented

- plugin activation と4 self-* scope binding、全 harness scope grid の EXECUTE 投影。
- plugin stage の `scopes: []` による非 self-* opt-in 維持。
- compose/drop による `code-generation.produces` overlay/restore。
- 通常 orchestrator path の per-unit required-artifact coverage。
- create/status/report/override/landed、GraphQL snapshot、Intent/Bolt/Unit PR provenance。
- Developer scan の関連5 test files、計81 tests は pass。

### Missing

- **BLOCKER**: report に CLI receipt、content digest、audit event identity、signature 等の attestation がない。
- **BLOCKER**: report-format sensor は advisory、stage は `sensors: []`、manual fire、failure でも exit 0 で completion を拒否しない。
- **BLOCKER**: `create` は local commit、clean branch、push、remote head SHA 一致を検査しない。
- **BLOCKER**: direct state completion guard は declared artifacts の最低1件で存在条件を満たし得る。
- **FOLLOW-UP**: stage の `produces` / `requires_stage` が空で report owner が code-generation overlay と分離する。
- **FOLLOW-UP**: 4 scope × 8 harness × compose/drop × resume × completion の回帰 matrix が不足する。

## Architectural Conclusion

Issue #2838 は部分実装済みだが未解決である。scope selection boundary は閉じた一方、delivery evidence boundary と completion boundary の間に真正性 contract がない。Requirements Analysis では report receipt の threat model、blocking owner、direct completion parity、local-vs-remote head binding を Must 要件として固定する必要がある。
