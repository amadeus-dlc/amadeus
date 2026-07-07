# Units Generation Questions — インストーラの実装

> Stage: units-generation / Intent: `260706-installer-impl`  
> Mode: Grill me  
> Source of truth for unit boundary decisions.

## Q1: Unit Boundary Strategy

実装単位はどの境界で切りますか？

A. Capability-slice units（推奨） — `packages/setup` 内で、CLI/package entrypoint、version/source loading、target detection/planning、apply/manifest/verify、CI/release/docs のように、振る舞い単位で必要な layer をまたいで切る  
B. Layer units — CLI、domain、ports/adapters、tests、CI/docs のように水平 layer ごとに切る  
C. Story units — install、upgrade、release、docs のように user story ごとに大きく切る  
D. Single package unit — `packages/setup` 全体を 1 unit として扱う  
X. Other — 別案を指定する

[Answer]: A — Capability-slice units。`packages/setup` 内で、実装・テスト・CLI/CI/docs への接続を持てる振る舞い単位に分解する。

## Q2: Unit Granularity

unit の粒度はどの程度にしますか？

A. 6〜8 個の medium units（推奨） — package/entrypoint、source resolution、target detection/manifest、planning/safety、apply/verify/report、CI/release、docs のように、1 unit が独立レビュー可能な大きさ  
B. 3〜4 個の coarse units — core installer、upgrade safety、release/docs のように大きめにまとめる  
C. 10〜12 個の fine units — parser、resolver、adapter、manifest、backup、reporter など component 単位に近く細かく切る  
D. 1〜2 個の large units — installer 本体と CI/docs 程度に大きく切る  
X. Other — 別案を指定する

[Answer]: A — 6〜8 個の medium units。1 unit が独立レビュー可能で、後続の Construction DAG が過度に細分化されない粒度にする。

## Q3: CI / Release / Docs Units

CI、手動 release workflow、README/docs 更新は unit DAG にどう含めますか？

A. 同じ DAG の support units に含める（推奨） — package/runtime unit の上に CI/release unit を置き、CLI contract と install/upgrade 振る舞いの上に docs unit を置く  
B. 各 feature unit に分散する — install unit に install docs、upgrade unit に upgrade docs、package unit に CI を含める  
C. Stage 2.8 Delivery Planning まで分解を遅らせる — ここでは code units だけを作り、CI/docs は配送計画で扱う  
D. Out of scope として unit 化しない — CI/release/docs は別作業として扱う  
X. Other — 別案を指定する

[Answer]: A — CI、手動 release workflow、README/docs 更新は同じ DAG の support units として含め、Stage 2.7 では依存のみを定義する。

## Decomposition Plan

### Approach

- Boundary strategy: capability-slice units
- Granularity: 8 medium units
- Deployment model: single publishable package `@amadeus-dlc/setup` plus repository CI/release/docs support units
- Dependency policy: Stage 2.7 defines topology only; delivery order and critical path remain Stage 2.8 responsibility

### Proposed Units

| Unit | Boundary | Depends on |
|---|---|---|
| U1 Setup Package Shell | `packages/setup/package.json`, bin, Bun/npx startup, command parser, help contract | none |
| U2 Version And Distribution Source | stable SemVer tag resolution, GitHub archive fetch, archive extraction, source metadata reading | U1 |
| U3 Target State And Manifest | manifest schema/store, manifest-first target detection, sentinel classification, target snapshot | U1 |
| U4 Operation Planning And Safety | file classification, install/upgrade planning, `--yes`/`--force`, backup path policy, no-write decisions | U2, U3 |
| U5 Apply Verify And UX | file applier, prompt adapter, reporter output, manifest write after apply, post-install verification | U4 |
| U6 Installer Test Harness | unit/integration/smoke fixtures for package shell, source resolution, planning, apply/verify, non-interactive cases | U1, U2, U3, U4, U5 |
| U7 CI And Package Gates | package dry-run, typecheck/lint, coverage/ratchet, audit/OSV, secret scan, dist/promote checks | U6 |
| U8 Manual Release And Docs | `workflow_dispatch` release contract, latest-tag default, publish validation, README/setup docs | U5, U7 |

[Plan Approval]: Approve Plan — 8 medium capability-slice units で成果物を生成する。
