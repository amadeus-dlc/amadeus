# Risk And Sequencing Rationale — インストーラの実装

> Stage: delivery-planning / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `team-practices.md`

## Sequencing Heuristic

採用 heuristic は **walking-skeleton-first + risk-first**。`team-practices.md` の Walking Skeleton 合意、`requirements.md` の installer-first success criteria、`mockups.md` の terminal transcript、`components.md` の hexagonal package、`unit-of-work-dependency.md` の DAG を合わせると、最初に確認すべき最大リスクは「`@amadeus-dlc/setup` が package shell から source loading、target planning、apply、manifest、verify まで本当に接続できるか」である。

WSJF の数値 scoring は使わない。単一 intent・ソロメンテナ・AI-DLC dogfooding では、精密な value/time-criticality 点数よりも、Architecture risk を最初に潰す方が判断可能性が高い。

## Risk Register

| Risk | Impact | Earliest Bolt | Mitigation |
|---|---|---|---|
| `packages/setup` の bin/package metadata が publishable でない | installer 起動不能 | B1 | package shell と help startup を最初に作る |
| source archive から `dist/<harness>/` を安全に読めない | install/upgrade 不能 | B1/B2 | B1 は fake/local source、B2 で GitHub tag/archive retry を厚くする |
| target detection / planning / apply が分断される | no-write/backup/manifest safety が崩れる | B1/B2 | B1 で薄く接続、B2 で edge cases を完成させる |
| `--force` が backup policy を bypass する | user customization loss | B2/B3 | planner tests と backup fixtures を B3 で blocking 化する |
| manifest write failure が曖昧 | future upgrade detection が壊れる | B1/B2 | Application Service owner と failure classification を runtime tests で固定する |
| CI gates が advisory になる | release readiness bypass | B4 | B3 tests 後に blocking gates と path triggers を配線する |
| release workflow が credentials と混同される | publish 不能または unsafe publish | B5 | credentials/protected environment を external dependency として分離する |
| README が manual copy を主要導線に残す | user onboarding failure | B5 | docs を final runtime behavior と release posture に合わせる |

## Topology Validation

`unit-of-work-dependency.md` の direct dependencies は次の通り:

- U1 has no dependencies.
- U2 and U3 depend on U1.
- U4 depends on U2 and U3.
- U5 depends on U4.
- U6 depends on U1 through U5.
- U7 depends on U6.
- U8 depends on U5 and U7.

The proposed Bolt sequence respects this topology:

- B1 uses a deliberately thin slice across U1 through U5. This is not a topological violation because the slice implements only the minimum contracts needed to prove the path and does not claim U2/U3/U4/U5 complete.
- B2 completes U2 through U5 after B1 has established the integration path.
- B3 completes U6 after U1 through U5 behavior exists.
- B4 completes U7 after U6 produces tests and smoke fixtures.
- B5 completes U8 after U5 user-visible behavior and U7 package gates are concrete.

## Confidence By Bolt

| Bolt | What It Proves | Failure Signal |
|---|---|---|
| B1 | thin end-to-end architecture works and CLI contract is viable | package shell cannot invoke install path, or manifest/verify cannot be reached |
| B2 | safety-critical runtime branches can be implemented without policy drift | no-write, backup, manifest-first, or version branches contradict requirements |
| B3 | behavior is deterministic enough for CI and future refactors | tests require live GitHub/user projects or cannot cover negative cases |
| B4 | installer changes cannot bypass package/security/coverage gates | path triggers or required gates are advisory only |
| B5 | maintainer can release manually and users can follow docs | workflow lacks dry-run/provenance/publish validation or docs retain manual copy as primary path |

## Parallelism Rationale

Maximum parallelism is rejected for the initial Construction path because `team-formation` identifies a solo maintainer and `team-practices.md` requires a walking skeleton gate. Limited parallelism may be considered after B1, but only where DAG dependencies and review capacity allow it. The final choice between autonomous remaining Bolts and gate every Bolt is deferred to the Construction ladder prompt after B1 approval.

