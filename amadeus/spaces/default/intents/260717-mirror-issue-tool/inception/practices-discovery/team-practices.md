# Team Practices — 260717-mirror-issue-tool(差分確認)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md(codekb)

## 確認結果(practices-discovery:c1 — RE codekb 代用)

affirm 済みの `amadeus/spaces/default/memory/team.md` / `project.md` は本 intent の作業面(scripts/ ローカル CLI、bun 直接実行、Biome lint、tsc 型検査、tests/run-tests.sh)を全面カバーしており、**変更セクションなし(部分ドラフトなし、practices-discovery:c2 の live 温存)**。

- Way of Working / Testing Posture / Code Style / Forbidden / Mandated: 変更なし — mirror ツールは scripts/ 配下で既存配線(biome.json:41、tsconfig.json:19)に自動収容(RE 重点5)
- 新規差分は「gh CLI への外部依存」1点のみ → discovered-rules.md に境界ルールとして記録(Q1 裁定)

## 適用プラクティス(本 intent への写像)

- CLI 様式: `scripts/metrics-timeseries.ts` の既習様式(main(argv): number、exit 0/1/2、判別ユニオン Result、node:fs/path のみ)に倣う
- テスト: bugfix 系ではないため、コードと並行してテストを作成(org.md スコープ別デフォルトの mvp/feature 系に準拠。テスト層の確定は build-and-test 段)
