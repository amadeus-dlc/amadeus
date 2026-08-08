# Code Generation Plan — u6-plugin-docs-drift

上流入力(consumes 全数): functional-design/business-rules.md(BR-U6-1〜4 — grep 閉包・3分岐明記・挙動不変・対称面同時是正)、functional-design/domain-entities.md(PluginStageDoc 2ファイルと3分岐記述モデル)。補助参照: inception/requirements-analysis/requirements.md(FR-6a/6b 逐語)。

本 plan は invoke-swarm 経路のディスパッチブリーフを正本として、着手時点の計画を記録する(cid:code-generation:swarm-unit-artifact-backfill による conductor 事後作成)。

## 受け入れ基準(requirements.md FR-6 逐語)

- FR-6a: `plugins/formal-model-check/stages/formal-model-check.md:27` と `plugins/pr-convergence/stages/pr-convergence.md:27` の「Amadeus never runs it automatically」を実挙動(`amadeus-advisory-choice.ts:521,:576-586` — #2318)へ整合。両ファイル grep 0 件+none/semi/full 3分岐の文言実在
- FR-6b: 新 occurrence kind の追加はしない

## 実装方針

- 変更は文書2ファイルのみ(コード変更なし)。同一変更で対称是正(BR-U6-4)
- 是正前後の grep 対照(各1件 → 0 件)と、pin するテスト・fixture の repo 全域棚卸しを実装前に実施
- `scopes: []`(stock 非所属)の記述は不変

## 検証コマンド

`bun run typecheck` / `bun run lint` / plugin 関連テスト(conformance / compose 系)の全数実行。
