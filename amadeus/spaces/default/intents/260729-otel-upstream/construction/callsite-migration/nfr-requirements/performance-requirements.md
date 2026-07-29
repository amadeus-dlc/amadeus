# Performance Requirements — U7: callsite-migration

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| call-site guard の CI 走査コスト | 通常 lint ジョブ内に内包できること。専用ジョブ・長時間ジョブへの分離を禁止し、lint ジョブの既存 timeout 内で完了する（VER-4） | guard ステップを lint ジョブの既存 timeout 予算内で実行し、grep ベース静地走査（構文解析・型解決なし）で全リポジトリを 1 パス走査する |
| guard 走査の複雑度 | 走査時間はリポジトリファイル数に対し線形 O(n)。allowlist サイズ・残存 site 数に依存する再帰検索を持たない | 走査実装が単一パスの正規表現走査＋allowlist 集合照合であることをレビューで固定 |
| 互換 Adapter の委譲オーバーヘッド | 直接 `emitEvent` 経路に対し計測可能なレイテンシ回帰を持たない。数値予算は NFR-1 の Phase 1 実測に連動し ADR で確定（Q2-A）。委譲は registry 引き当て（map 参照）＋1 回の関数呼出し追加のみで、I/O・ロック・動的 import を追加しない | 直接 emit と Adapter 経由 emit の同一イベントを skeleton 計測面で比較（Phase 1 ADR の入力） |
| shadow 比較ハーネスの実行コスト | 比較実行は通常 workflow の tool 呼出し経路に滞留を挟まない。比較自体は専用の手動／CI 実行とし、hot path から分離する（NFR-2 準拠） | ハーネスが emit 経路を同期的にブロックしないことを実装レビューで固定 |

## 制約

- guard はバッチ移行期間中、約1600 site の全走査を毎 CI 実行で繰り返す。走査は決定的（同一入力→同一残存 site 一覧）で、実行ごとの flake を許容しない
- batch 書換えの機械的変換は worktree 内のローカル操作に限定し、ネットワーク I/O を持たない（NFR-2）
- 数値予算（Adapter 委譲 p50/p95、guard 走査秒数）は Q2-A どおり Phase 1 計測後に ADR で確定し、本書を更新する。それまでは上記の構造的制約（lint 内包・単一パス・I/O なし）が合格条件

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: five docs cover all unit-relevant IDs with quantified-or-deferred targets, no BR contradictions, FR-DST-2 recorded.

### Findings

- None
