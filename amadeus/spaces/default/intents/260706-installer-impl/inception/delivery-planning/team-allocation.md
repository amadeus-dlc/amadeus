# Team Allocation — インストーラの実装

> Stage: delivery-planning / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `team-practices.md`

## Allocation Model

`team-formation/team-assessment.md` と `team-practices.md` に従い、体制は **ソロメンテナ + AI-DLC agents** とする。物理的な複数チームは組まない。メンテナはレビュー、承認、マージ、npm publish を担当し、AI agents が Construction stages を実行する。

この allocation は `requirements.md`、`stories.md`、`mockups.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md` にトレースする Bolt を、実行ロールへ割り当てる。

## Bolt To Mob Allocation

| Bolt | Primary Executor | Supporting Roles | Human Gate / Approval | Notes |
|---|---|---|---|---|
| B1 Thin Installer Skeleton | amadeus-developer-agent | amadeus-architect-agent, amadeus-quality-agent | メンテナ gate 必須 | walking skeleton。`packages/setup` の最小 end-to-end path を構築し、人間が確認する。 |
| B2 Runtime Completeness | amadeus-developer-agent | amadeus-architect-agent, amadeus-quality-agent | ladder prompt の選択に従う | target detection、planning safety、upgrade branches、archive retry、backup policy を厚くする。 |
| B3 Installer Test Harness | amadeus-quality-agent + amadeus-developer-agent | amadeus-architect-agent | ladder prompt の選択に従う | fake ports、fixtures、unit/integration/smoke、snapshot tests を整える。 |
| B4 CI And Package Gates | amadeus-pipeline-deploy-agent | amadeus-quality-agent, amadeus-devsecops-agent | ladder prompt の選択に従う | package gates、coverage registry/ratchet、audit/OSV、secret scan、dist/promote checks。 |
| B5 Manual Release And Docs | amadeus-pipeline-deploy-agent + amadeus-developer-agent | amadeus-product-agent, amadeus-quality-agent | メンテナ release 承認必須 | workflow_dispatch release、publish validation、README/setup docs。npm publish はメンテナ権限。 |

## RACI

| Work Area | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Runtime implementation | amadeus-developer-agent | メンテナ | amadeus-architect-agent | メンテナ |
| Architecture coherence | amadeus-architect-agent | メンテナ | amadeus-developer-agent | メンテナ |
| Tests and quality gates | amadeus-quality-agent | メンテナ | amadeus-devsecops-agent | メンテナ |
| CI/release workflow | amadeus-pipeline-deploy-agent | メンテナ | amadeus-quality-agent, amadeus-devsecops-agent | メンテナ |
| Docs and user guidance | amadeus-developer-agent | メンテナ | amadeus-product-agent | メンテナ |
| npm publication | メンテナ | メンテナ | amadeus-pipeline-deploy-agent | users/contributors |

## Capacity And Review Constraints

- ソロメンテナ体制のため、最大並列化は採用しない。
- B1 は必ず直列で実行し、walking skeleton gate で止める。
- B2 以降の並列化は ladder prompt の選択と DAG に従う。メンテナのレビュー負荷を超える場合は gate every Bolt を選ぶ。
- npm publish と GitHub Actions release はメンテナの権限と明示操作に依存する。

## Program Board View

| Dependency | Blocks | Owner | Mitigation |
|---|---|---|---|
| B1 skeleton acceptance | B2, B3, B4, B5 | メンテナ | B1 gate で architecture と CLI/DX を確認する |
| B2 runtime behavior | B3, B5 docs accuracy | amadeus-developer-agent | docs は draft 可能だが final wording は B2 behavior に合わせる |
| B3 tests | B4 blocking gates | amadeus-quality-agent | CI wiring before deterministic tests is prohibited |
| B4 package gates | B5 release workflow | amadeus-pipeline-deploy-agent | dry-run and publish validation are release prerequisites |

