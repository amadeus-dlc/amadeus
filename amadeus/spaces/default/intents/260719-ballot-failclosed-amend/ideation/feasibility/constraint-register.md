# Constraint Register — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md

## 制約一覧

| # | 制約 | 種別 | 根拠(実測) |
| --- | --- | --- | --- |
| C-1 | 修正面は `scripts/amadeus-election-*.ts` 系+テストに限定(配布フレームワーク `packages/framework/` / `dist/` に触れない) | スコープ | leader ディスパッチ要件(4)。`scripts/` は配布外(W-04) — dist:check / promote:self:check への影響なし |
| C-2 | `tests/unit/t238-election-record.test.ts` は e1 の #1226 intent が反転予定 — 触る場合は着手前に e1 と非交差確認、交差なら当該ファイルのみ直列化を leader へ報告 | 並行作業 | leader ディスパッチ要件(4)。本 intent の主修正面は t234/t235/t236 で現時点非交差 |
| C-3 | submittedAt 検証は regex+Date の二段(e4 所見)。落ちる実証に「NaN にならない ISO 風文字列」(e1 所見)を含める | 品質 | ディスパッチ要件(3)、#1252 クロスレビュー成立済み所見 |
| C-4 | amend の tally 解決規則は設計裁定(選挙)なしに実装しない — tally(`model.ts:321-338`)は無差別集計のため write 経路だけ開けると二重計上 | プロセス | 本ステージ実測+ディスパッチ要件(5)(設計判断は選挙依頼) |
| C-5 | 逸脱は実装前停止・選挙(deviation-stop-before-implement)。完了・ブロッカーは自発報告 | プロセス | ディスパッチ要件(5) |
| C-6 | 検証は `bun run typecheck` / `bun run lint`(Biome が scripts/ を対象に含む)/ `bash tests/run-tests.sh --ci` を green 維持。PR 前に deslop+lcov 実測(local-lcov-pre-push) | 品質 | package.json 実測+Testing Posture 既決 |
| C-7 | ADR-5(original は上書きしない — amend は共存し correction trail 維持)は既決設計 — amend 経路はこの不変条件を保つ | 設計既決 | `store.ts:122-124` コメント実文 |

## 制約の消費先

C-1〜C-3 は requirements の受け入れ基準へ、C-4・C-7 は design 段の amend 解決規則選挙の前提条件へ、C-5・C-6 は code-generation / build-and-test の検証手順へそれぞれ引き継ぐ。intent-statement.md の Success Metrics と 1:1 で対応(C-3 → 指標1、C-4/C-7 → 指標2、C-6 → 指標3)。
