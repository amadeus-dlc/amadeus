# Security Design — u6-plugin-docs-drift

上流入力(consumes 全数): business-logic-model は u6(kind: spec)の FD では produces_kinds 解決により生成対象外のため不在(設計どおりの不在)— 代替として u6 の functional-design 実在2成果物(domain-entities.md / business-rules.md — 文書2ファイルの is/ToBe)を消費した。nfr-requirements 系成果物は self-feature スコープで nfr-requirements SKIP のため未生成(同じく設計どおりの不在)。

## セキュリティ面の評価

- 変更は plugin stage 文書2ファイルの文言のみ — 実行コード・認可判定・監査経路への影響なし(BR-U6-3 が全検証コマンド green で機械確認)
- **誤解の除去こそが本 unit のセキュリティ寄与**: 「Amadeus never runs it automatically」の文言は、semi/full 有効時に advisory が無人で `run-now` に解決されうる実挙動(#2318)を隠す — 利用者が「自動起動しない」前提でリスク評価する誤りを誘発していた。3分岐の明記により opt-in ステージの無人起動可能性が可視化される

## 非対象の明示(N/A)

- 新規の攻撃面・入力面・秘匿情報: なし(文書のみ)
- redaction・監査契約: 変更なし

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T21:52:53Z
- **Iteration:** 1
- **Scope decision:** none

不在理由の明示・3分岐モデル整合・N/A 根拠付き・コード変更混入なしを確認。指摘なし

### Findings

- None
