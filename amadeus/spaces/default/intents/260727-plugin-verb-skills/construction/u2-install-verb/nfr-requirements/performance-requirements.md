# Performance Requirements — U2 u2-install-verb

上流入力(consumes 全数): business-logic-model.md(swap フロー)、business-rules.md(BR-U2-2)、requirements.md(FR-1・横断チェックリスト)、technology-stack.md(Bun FS API)

## PR-U2-1: コピー規模の前提

install のコストは plugin ディレクトリ1個のコピー(requirements.md 横断チェックリスト: 想定 plugin 数は一桁。参照 plugin の実規模は conductor 実測で `find plugins/formal-model-check -type f` = 3ファイル)。専用の性能予算は設けない — 強制メカニズムが存在せず数値を発明しない(constants-from-code)。business-logic-model.md の swap(tmp→rename)は rename が O(1) であり、コピー本体のコストと分離される(technology-stack.md の Bun ランタイム前提)。

## 検証形

性能専用テストなし。business-rules.md BR-U2-6 の機能テスト(実 FS tmp dir)が既存ランナーのタイムアウトに服する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:57:25Z
- **Iteration:** 2
- **Scope decision:** none

it.1 の Critical×2(『数十ファイル』捏造数値 → 実測3ファイルへ是正・出典を conductor 実測に訂正)/ Minor×2(paraphrase の敷衍明示・domain-entities.md 追加参照)を閉包。reviewer 独立実測で照合済み。残存なし。

### Findings

- None
