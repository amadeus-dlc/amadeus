# Bolt Plan — インストーラの実装

> Stage: delivery-planning / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `team-practices.md`

## Planning Summary

この plan は `unit-of-work-dependency.md` の DAG を尊重しつつ、`team-practices.md` の Walking Skeleton 合意に従って Construction の Bolt sequence を定義する。`requirements.md`、`stories.md`、`mockups.md`、`components.md`、`unit-of-work.md`、`unit-of-work-story-map.md` の traceability を維持し、最初の Bolt は必ず人間ゲートで確認する。

Sequencing heuristic は **walking-skeleton-first + risk-first**。WSJF の点数表は使わず、risk-reduction value と user-visible install path の検証を優先する。

## Bolt Sequence

| Bolt | Units | Walking Skeleton | Definition of Done | Confidence Hypothesis | Expected Demo |
|---|---|---|---|---|---|
| B1 Thin Installer Skeleton | Thin slice across U1, U2, U3, U4, U5 | yes | `amadeus-setup install --harness codex --target <tmp>` の最小 happy path が fake/local source distribution で plan -> apply -> manifest -> verify まで通る。CLI は `install`/`upgrade` を認識し、`init` を拒否する。 | package shell、source loading、target snapshot、plan、apply、manifest、verify の architecture が接続できる。以後の拡張前に最大の統合リスクを発見できる。 | temp target に codex harness の最小 required files と manifest が作られ、plain-text result が表示される。 |
| B2 Runtime Completeness | U2, U3, U4, U5 | no | stable SemVer tag resolution、archive fetch retry、manifest-first upgrade、manual/partial/none/unsupported target states、`kiro`/`kiro-ide` ambiguity、`--yes`/`--force`、backup path、already-up-to-date/downgrade/installed-newer branches が実装される。 | install/upgrade の主要 safety branches が `requirements.md` FR-005〜FR-014 と `stories.md` US-002〜US-008/US-012 を満たせる。 | fixture targets に対して install/upgrade/no-write/backup/error report が再現できる。 |
| B3 Installer Test Harness | U6 | no | fake ports、temp target fixtures、network retry fixture、manifest fixture、non-interactive fixture、snapshot tests が追加され、B1/B2 の behavior を deterministic に検証できる。 | runtime policy が filesystem/network に依存せず再現可能に検証でき、CI gate 化できる品質床ができる。 | `bun test` または installer-specific test command で unit/integration/smoke が通る。 |
| B4 CI And Package Gates | U7 | no | installer-related path detection、package dry-run、typecheck/lint、coverage registry/ratchet、dist/promote drift guard、audit/OSV、secret scan、package metadata validation が blocking gate として配線される。 | PR で installer 変更が release readiness を bypass できない。 | installer-related PR 相当の local/CI workflow check が失敗時に block する。 |
| B5 Manual Release And Docs | U8 | no | `workflow_dispatch` release workflow、latest stable tag default、package dry-run/SBOM/provenance/publish validation、README/setup docs の installer-first guidance が整う。 | メンテナが GitHub Actions から明示的に release/publish でき、ユーザーは手動 copy ではなく `install`/`upgrade` を選べる。 | GitHub Actions manual release surface と README の `bunx @amadeus-dlc/setup install` 導線を確認できる。 |

## Construction Gate Notes

- B1 は `team-practices.md` と team-formation Q3 に従い、walking skeleton gate を必ず提示する。
- B1 承認後、Amadeus Construction ladder prompt で remaining Bolts を autonomous にするか gate every Bolt にするかを改めて選ぶ。
- B2 以降は DAG 上の依存を守る。B3 は B1/B2 の testability を前提にするため B2 後、B4 は B3 後、B5 は B4 と runtime behavior 後に置く。

## Traceability

- B1: FR-001, FR-002, FR-003, FR-004, FR-005, FR-013, FR-014 / US-001, US-002, US-003
- B2: FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014 / US-004, US-005, US-006, US-007, US-008, US-012
- B3: NFR-001, NFR-002, NFR-003, NFR-004 / US-001..US-012
- B4: FR-016 / US-010
- B5: FR-015, FR-017 / US-009, US-011, US-013

