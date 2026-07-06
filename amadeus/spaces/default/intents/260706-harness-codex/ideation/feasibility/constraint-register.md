# Constraint Register — 260706-harness-codex（Issue #552）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 制約一覧

| ID | 制約 | 種別 | 出典 |
|---|---|---|---|
| C-1 | Phase 2（core/ 一本化 + build 化）は本 Intent で実装しない。設計確定成果物を添えて後続 Intent へ切り出す | 段取り | ディスパッチ（Maintainer 承認、2026-07-06 14:42 JST）、Issue #552「制約・段取り」 |
| C-2 | openai.yaml の適応は rename 契約に従う（aidlc-* → amadeus-*、/aidlc → /amadeus） | 命名 | ディスパッチ指示 3、#526 の rename 契約 |
| C-3 | 上流取り込みは純正性検証（#541 = fresh clone + provenance 照合）を伴う | 品質 | ディスパッチ指示 4 |
| C-4 | 基準 commit は b67798c3（parity-baseline の baselineCommit と同一） | 基準 | ディスパッチ承認要旨 |
| C-5 | openai.yaml を source `skills/amadeus-*/` へ置く場合は promote 単位に触れるため、配置設計の確定時に engineer3（#554）とピア確認する | 接触面 | ディスパッチ指示 2 |
| C-6 | PR merge は人間が行う。gate は auto 委任経路（人間 → leader → engineer4）。4 イベント報告 | 運用 | ディスパッチ、team.md 承認中継 |
| C-7 | PR 前に validator + `npm run test:all` を実行し記録する | 検証 | ディスパッチ指示 5、team.md PR 作成前検証 |
| C-8 | stage0/stage2 の採用状態はディレクトリで表現しない（git + 台帳 + manifest が担う） | 設計 | Issue #552「制約・段取り」（Maintainer 確認済み 2026-07-06） |
| C-9 | 生成物の手編集禁止・再生成が正の原則は Phase 2 の受け入れ条件。Phase 1 では既存の promote 規律（手動 cp 禁止）を維持する | 品質 | Issue #552 提案構造、.agents/rules/amadeus-artifacts-and-examples.md |

## 運用メモ

制約の追加・変更が生じた場合は、本表へ追記し、根拠（ディスパッチ、Issue、ピア協議）を出典列に記録する。C-1〜C-9 は requirements-analysis の制約節の入力になる。
