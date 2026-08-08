# Logical Components — stage-stats-cli(nfr-design)

上流入力(consumes 全数): business-logic-model(A1〜A9 の処理列を論理構成の正本として消費)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在 — 代替正本は requirements.md NFR-2〜NFR-4(テスト配置・被覆・配布)とする

## 論理構成(NFR 機構との対応)

単一ファイル `packages/framework/core/tools/amadeus-stage-stats.ts` 内の層構成(application-design C1〜C9 を NFR 面から再掲):

| 層 | コンポーネント | NFR 機構 |
|----|----------------|----------|
| FS 層 | C1 CorpusScanner / C4 ReviewBlockCollector | 部分故障のカウンタ集約(reliability)。実 FS 検証は t482 integration に配置(NFR-2、fs-tests-integration-first) |
| 純関数層 | C2 WindowBuilder / C3 IdleSubtractor / C5 SensorTallier / C6 ModelAttributor / C7 StatsComposer / C8 Renderer | 引数完結・export された in-process seam(NFR-3 — bun coverage の spawn 盲点回避)。t481 unit で lcov 計測(patch/project gate 通過の構造) |
| shell 層 | C9 CliShell | `export function main(argv)` + `import.meta.main` ガード(NFR-3 既習形)。exit ladder の唯一の所有者 |

## 配布・境界(NFR-4)

- `packages/framework/core/tools/` 配置 → coreDirs 投影で全ハーネスへ配布。出荷コメント・文字列に `scripts/` トークンを置かない(t258 boundary guard)
- 依存閉集合: `node:fs`(read)/ `node:path` / `amadeus-journal.ts`。`tests/` 非参照(p95 は鏡映実装 — 出荷境界)
- 上記の層分離は coverage gate(NFR-3)とテスト配置 ratchet(NFR-2)が機械的に強制するため、リファクタで崩れた場合は CI が赤くなる(構造保証の層別明示 — 一枚岩の断定を避ける: FS 層の被覆は integration、純関数層は unit、shell 層は in-process main 駆動が各々担う)
