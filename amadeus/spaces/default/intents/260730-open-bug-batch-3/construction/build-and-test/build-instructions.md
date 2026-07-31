# Build Instructions — 260730-open-bug-batch-3

上流入力(consumes 全数): fix-1752-boundary-report-create / fix-1773-ballot-blind-storage / fix-1772-choice-description の各 code-generation-plan.md と code-summary.md — 本書の対象面(正本2ツール+選挙2ツール+SKILL/docs+13配布面)は3 unit の plan/summary の変更ファイル目録から導出した。

## ビルド手順

本リポジトリはコンパイル成果物を持たず、「ビルド」= 配布物の再生成と drift 検査である。

1. `bun scripts/package.ts` — 正本(packages/framework/core/ + harness/)から dist/ 7ハーネスを再生成
2. `bun run promote:self` — self-install ツリー(.claude/ ほか)へ投影
3. 検査: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 必須)

## 本 intent の対象面

- #1752: `amadeus-orchestrate.ts` + `amadeus-mirror-state-codec.ts`(succeededMirrorCreateExists)
- #1773: `amadeus-election-store.ts`(pending lane)+ `.gitignore`/7ハーネス dot-gitignore
- #1772: `amadeus-election-model.ts`(Choice.description / DistributionView.question)+ SKILL.md + docs 対訳

3 Bolt とも PR(#1802/#1808/#1809)で配布同期済み・drift 0 を CI と本ステージで再確認する。
