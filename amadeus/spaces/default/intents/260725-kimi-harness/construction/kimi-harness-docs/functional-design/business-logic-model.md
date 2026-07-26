上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — kimi-harness-docs

unit-of-work.md の U7(完了定義: `docs/guide/harnesses/kimi-code.md` + `.ja.md` 新設・README 表追加・前提/配線/制約を実測どおりに記述)と unit-of-work-story-map.md の FR-8 を、components.md C1(onboarding fills)と ADR-4(snippet 単一ソース)に沿って手続き化する(requirements.md の FR-8 が根拠)。services.md の判定どおり、docs は実装確定後の実測に基づいて書く。

## 執筆フロー

1. 実測の収集(B1-B6 の着地内容): 前提(kimi 0.28.1+・bun on PATH)・配線手順(setup CLI の managed block マージと手動手順)・制約(ユーザーレベル config のみ・hook コマンドの cwd)・doctor の4チェック(component-methods.md の C4 表が定義源)・live journey の走らせ方
2. `docs/guide/harnesses/kimi-code.md`(英語)を既存章(codex-cli.md・cursor.md 等)の構成に倣って執筆: prerequisites / install / hook wiring / doctor / what's different on this harness
3. `.ja.md`(日本語)を同内容で作成(既存章の en/ja 対構造)
4. `docs/guide/harnesses/README.md` の表に kimi 行を追加
5. snippet 正本は docs に転記せず参照とする(ADR-4 の単一ソース)

## 検証シーケンス

- リンク切れなし(相対リンクの実在確認)
- 言語規則: docs は英語が既定で ja は対訳。手順のコマンド・パスは正確性優先で原文のまま
- 手順の再現性: 記載どおりに install → 配線 → doctor を辿れる(dogfood の実測と突合)

## 決定木(エラー経路)

- B1-B6 の実装と docs の記述が乖離 → 実装側を正として docs を修正(実測に基づく記述の原則)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T12:12:28Z
- **Iteration:** 1
- **Scope decision:** none

執筆フローは FR-8a と U7 の DoD を網羅し、5つの不変条件は FR-4a/TC-1/TC-6/ADR-4 にトレースできる。検出2件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / 3ファイル) component-methods.md の本文参照不足 → 修正済み(C4/C3 を実測源として明記)
- (minor / BR-5) (P2) のぶら下がり参照 → 修正済み(team.md First Principles P2 と明記)
