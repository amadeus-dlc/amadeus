# Performance Design — U4 subagent-started

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)。各面要件は requirements.md NFR-1〜3 から代替導出。business-logic-model.md(実在)の hook 経路(SUBAGENT_STARTED emit)と lifetime 突合規則を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## emit 経路のコスト

- SUBAGENT_STARTED は subagent 起動時の hook 1回のみ — 高頻度経路ではない。emit コストは既存 SUBAGENT_COMPLETED と同一(registry 検証+append 1回)
- Purpose 200字切詰めは文字列 slice の O(1)(先頭1行抽出は最初の改行までの走査 = O(先頭行長))

## lifetime 突合のコスト

- composeSubagentLifetimes は journal の後処理(オンデマンド・読取専用)— emit ホットパスに載らない。突合は started/completed の2リストに対する1パス貪欲マッチ(ID 一致 → Type LIFO 最近傍 → seq 順 tie-break)で O(n log n)(startedAt ソート)以内
- n = セッション内 subagent 数(典型 数十)— 実測不要の水準だが、決定的テストで並列3件以上の突合結果を固定(FD テスト義務5面)

## 検証

- counter/固定 fixture の決定的テストのみ — 実時間待機なし(bt-timeout-verification-shape)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:35:32Z
- **Iteration:** 1
- **Scope decision:** none

U4 subagent-started nfr-design 5成果物+questions: FD契約(79化ガード10項目・LIFO突合・Purpose200字)準拠、NFR-1〜3被覆、引用は現HEADで実測一致。iteration 1 READY。

### Findings

- None
