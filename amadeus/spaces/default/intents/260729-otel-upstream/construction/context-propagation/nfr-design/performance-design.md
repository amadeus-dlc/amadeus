# Performance Design — U5: context-propagation

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（env 注入・抽出コスト、Intent Context 復元、carrier サイズ）を business-logic-model.md の伝播シーケンス上で実現する設計。

## carrier 生成・解析の設計

- env 注入は `traceparent`（55 bytes 固定）＋ `tracestate` の 2 キーのみを既存 spawn 様式（`env: process.env` 明示）へ追加する形とし、spawn 機構自体は変更しない（tech-stack-decisions.md）。生成は文字列フォーマット 1 回で、正規表現・パースを hot path に持たない
- 子 process 側の抽出は env 2 キーの読取と W3C 形式検証のみ。形式検証は固定長チェック＋hex 検証の O(1) とする
- 注入・抽出いずれの経路にも network I/O・batch 待ち・外部 process 呼出しを置かない（performance-requirements.md § 制約）

## Intent Context 永続化・復元の設計

- `persistIntentContext` は intent あたり 1 record の書込、`restoreIntentContext` は record 配下ファイルの 1 回 read で完結させ、lock 待ち・network I/O を持たない（business-logic-model.md § Intent Context の確立と永続化）
- 復元は bootstrap 内で同期的に行い、失敗しても起動を遅延させない（fail-open、reliability-design と整合）

## 計測設計

- 注入有無・抽出有無で hook／sensor 起動の wall time を比較計測し、U1 の計測ハーネスへ追加する。数値閾値は Phase 1 ADR で確定（Q2-A）
- 注入後の env 値サイズをアサートするテストで carrier 1 KiB 未満を固定する

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:26Z
- **Iteration:** 1
- **Scope decision:** none

READY: all four requirement sets addressed; only declared context.ts API surface used; no contradictions.

### Findings

- None
