# Unit of Work Story Map

User Stories stage は本 scope で非実行のため、[`requirements.md`](../requirements-analysis/requirements.md) の FR/NFR を delivery story として扱う。設計根拠は [`components.md`](../application-design/components.md)、[`component-methods.md`](../application-design/component-methods.md)、[`services.md`](../application-design/services.md)、[`component-dependency.md`](../application-design/component-dependency.md)、[`decisions.md`](../application-design/decisions.md)。

## Requirement-to-Unit Mapping

| Delivery story / requirement | Primary Unit | Supporting Unit | Unit 内の実装順 |
|---|---|---|---|
| FR-OUT-1,2: audit-backed outcome projection / correlation | U1 | Build and Test | Red transition table → reducer → conflict diagnostics → selector |
| FR-OUT-3,4: Retry / Skip Unit Z | U1 | Build and Test | Red single/multi-failure cases → transition union → adapter |
| FR-OUT-5,6: Abort / autonomous parked | U1 | Build and Test | Red abort projection → preserved outcomes → parked wiring |
| FR-OUT-7: existing Stop hook terminal | U1 | Build and Test | public stop test; production Stop hook unchanged |
| FR-OUT-8,9: evidence/worktree preservation, escape non-use | U1 | Build and Test | evidence retention assertions → selector integration |
| FR-OUT-10: report failed exit 0 + error | U1 | Build and Test | baseline contract pin → integrated regression |
| FR-DIR-1,3,4,5: population fan-out / presence / fail-closed | U2 | Build and Test | Red table → pure expansion → presence adapter |
| FR-DIR-2: 7 consumer / 19 edge closure | U2 | Build and Test | mechanical inventory test → full directive matrix |
| FR-DIR-6: legitimate placeholder preservation | U2 | Build and Test | existing t116/t186 baseline → targeted regression |
| FR-DIR-7: reviewer scope completeness | U2 | Build and Test | Red missing-required scope → guard → regression |
| FR-DIR-8: upstream sensor non-regression | U2 | Build and Test | existing slug-sensor suite remains unchanged |
| NFR-1,5: determinism / auditability | U1,U2 | Build and Test | pure ordering/correlation tests → public directive checks |
| NFR-2: TDD | U1,U2 | Build and Test | 各vertical UnitでRed→Green |
| NFR-3: regression gates | U1,U2 | Build and Test | focused → lint/typecheck/build → full/coverage/source-only |
| NFR-4: minimal source-only change | U1,U2 | Build and Test | ownership check → generated boundary check |

## Cross-Cutting Stories

- U1とU2は各Issueのpure contractからpublic directiveまでをverticalに所有する。横断Build and Testは検証工程であり第三Unit/PRではない。
- determinism、TDD、source-only、監査可能性は両Unitに適用する。共有entrypointのsemantic ownership逸脱は実装せず裁定へ戻す。

## Coverage Verification

- FR-DIR-1〜8: すべて U2 に割当済み。
- FR-OUT-1〜10: すべて U1 に割当済み。
- NFR-1〜5: すべて少なくとも1 Primary Unitへ割当済み。
- U1/U2: すべて1件以上の requirement を持ち、orphan Unit はない。
- #2833 と #2834 は1 intent内に留め、Unit と Bolt で分離する。
