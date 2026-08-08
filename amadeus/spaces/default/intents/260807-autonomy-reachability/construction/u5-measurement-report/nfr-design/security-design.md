# Security Design — u5-measurement-report

上流入力(consumes 全数): business-logic-model は u5(kind: spec)の FD では produces_kinds 解決により生成対象外のため不在(設計どおりの不在)— 代替として u5 の functional-design 実在2成果物(domain-entities.md / business-rules.md)を消費した。nfr-requirements 系成果物は self-feature スコープで nfr-requirements SKIP のため未生成(同じく設計どおりの不在)。

## セキュリティ面の評価

- 計測は audit shard の read-only 集計 — 書込・状態変更なし(BR-U5-6 の repo 外 scratch 実行)
- レポートに載せる値は件数・比率・イベント名・intent slug — 質問本文・回答内容・ユーザー入力の逐語は転載しない(機微情報の複製回避)
- スクリプト全文の掲載(BR-U5-4)は再現可能性のためであり、秘匿情報(トークン・ローカル絶対パスの個人領域)を含めない — 掲載前に grep 検査

## 非対象の明示(N/A)

- 新規の攻撃面・認可変更: なし(read-only レポート作業)
- redaction 契約: 変更なし(既存語彙のみを集計)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T22:00:20Z
- **Iteration:** 1
- **Scope decision:** none

read-only 前提・非転載規律・秘匿 grep 検査・BR-U5 整合・cid 実在を確認。指摘なし

### Findings

- None
