# Practices Discovery — 明確化質問(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。

## 選挙不要判定(E-OC1 3段順序)

判定: 全6論点を選挙不要(0問)とする。2026-07-17T23:08Z 頃に conductor e2 から leader へ申告し、leader が 2026-07-17T23:09:24Z に承認した(agmsg 出典)。回答の先取り記入はなく、本承認後にこの証跡を作成した。

| 論点 | 根拠種別 | 既決の所在 |
|---|---|---|
| Way of Working | 既決規則+git実測 | org/team/project の squash / PR 規則。`origin/main` first-parent 直近50件の merge commit 0件 |
| Walking Skeleton | 既決規則 | project.md の greenfield 要素規定。本 intent は既存 swarm 契約への加算(新パッケージ・新配布経路なし、`code-structure.md` / `architecture.md` で確認)。Bolt 構成は delivery-planning で確定 |
| Testing Posture | 既決規則+repo実測 | project.md の Bun テスト規則(`technology-stack.md` / `code-quality-assessment.md` 整合)。unit 212 / integration 148 / e2e 68 / smoke 14。CI blocking gate 現存(coverage-patch-gate 新設を含む) |
| Deployment | 既決規則+repo実測 | deploy 基盤なし(`business-overview.md` / `dependencies.md` 整合)、release.yml workflow_dispatch 一本 — 区間変更なし |
| Code Style | 既決規則+repo実測 | TS / ESM / Bun、Biome formatter 無効、strict tsc、core / harness 境界(`code-structure.md` 整合)— 区間変更なし |
| DevSecOps | 非該当・現状証拠 | SAST / DAST / secret scan / dependency-update 設定は repo 内不在 — 前回 260717-codekb-diff3-cleanup と同一状態。新設 risk 判断はスコープ外 |

## 質問

なし(0問)。
