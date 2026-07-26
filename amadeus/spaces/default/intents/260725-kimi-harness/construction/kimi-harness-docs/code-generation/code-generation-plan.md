上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

# Code Generation Plan — kimi-harness-docs(Bolt 7)

unit-of-work.md の U7 と requirements.md の FR-8、および本 unit の FD/NFR 成果物(business-logic-model.md §執筆フロー、business-rules.md BR-1〜BR-5、domain-entities.md §Harness Guide、nfr-design の security/reliability 設計)に基づく。story 相当は FR-8。

- [x] **Step 1: 実測の収集と確認**
  - B1-B6 の code-summary から前提(kimi 0.28.1+・bun)・配線(setup CLI の managed block マージと手動手順)・制約(ユーザーレベル config のみ・CLI がコメントを落とす・hook コマンドの cwd)・doctor の4チェック・live journey のノブ(`AMADEUS_KIMI_PRINT_LIVE`/`AMADEUS_KIMI_BIN`/`AMADEUS_KIMI_MODEL`・実機 `kimi login` 前提・symlink 供給)を収集
- [x] **Step 2: `docs/guide/harnesses/kimi-code.md`(en)執筆**
  - 既存章(codex-cli.md・cursor.md)と同じ構成: prerequisites / install / hook wiring / doctor / what's different on this harness。snippet 正本は参照(転記しない)
- [x] **Step 3: `kimi-code.ja.md`(対訳)**
  - en と同内容の日本語版(既存章の en/ja 対構造)
- [x] **Step 4: `docs/guide/harnesses/README.md` の表に kimi 行を追加**
- [x] **Step 5: 検証**
  - リンク実在・言語規則(docs は英語/ja 対訳)・手順が dogfood(B5)と journey(B6)の実測と一致すること

## テストファイルに関する注記

本 unit はドキュメント専用で、コードのテスト対象を持たない(stage の「as applicable to the unit」の範囲)。検証は Step 5 のリンク実在・言語規則・実測一致の確認をもって代替とする。

## トレーサビリティ

- FR-8a → Step 1-4 / 実測との一致 → Step 5
- 実装(B1-B6)が正で、docs はその転記

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T07:33:51Z
- **Iteration:** 1
- **Scope decision:** none

plan は FR-8a をカバーし、summary は BR-1〜5 と整合。3件の省略は BR-5 の正直な適用。検出2件は記録衛生の minor で同一 iteration で修正済み。

### Findings

- (minor / plan) チェックボックス未マーク → 修正済み(conductor が5件を [x] に更新)
- (minor / plan) テストファイル不在の一行注記 → 修正済み(docs 専用 unit の代替検証を明記)
