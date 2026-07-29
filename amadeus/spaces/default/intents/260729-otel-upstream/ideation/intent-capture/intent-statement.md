# Intent Statement — OTel Upstream 統合

## Problem Statement

Amadeus の監査・可観測性基盤は、現行方式（#1628: audit Journal と独自 timing buffer から Projector が OTLP Span を事後生成）において、本来の意味での可観測性を半分しか達成していない。耐久性と Collector 障害からの隔離は実現できている一方、次の3つの問題が同等に残っている。

- **因果関係の不正確さ** — async 処理、並行 Bolt、subagent、複数 clone/worktree の親子関係を時刻包含で推測しており、正確に表現できない
- **語彙の乖離と発行漏れ** — TypeScript ロジックのイベント語彙と OTel Signal が別系統のため、下流 Projection の欠落・ずれが起きうる
- **Context の分断** — TypeScript 内部で OTel Context を使わないため、実行時に親子・相関が確定しない

## Target Customer

- **Amadeus を使う開発チーム** — ワークフロー実行の因果が追えず、障害解析や並行 Bolt のデバッグが困難という痛みを抱えている
- **Amadeus 自体の開発者（この repo の保守者）** — audit 基盤と observability の二重系統の保守コストと語彙 drift が痛み

## Success Metrics

以下はすべて必須（#1672 の完了条件と一致）。

- **因果の正確性** — 並行 Bolt・subagent・子 process を含む実行で、trace の親子関係が推測なしに 100% 実行時に確定する
- **基盤の単一化** — TypeScript のイベント発行 Interface が OTel API ファミリーのみになり、`appendAuditEntry()` の直接 call site がゼロになる。Event Registry の drift guard が CI で語彙の乖離を拒否する
- **耐性の維持** — 短命 process が network flush を必要とせず、Collector 停止中でも workflow 結果が変わらない（現行の強みを失わない）
- **Phase 1 の実証** — #1678 の walking skeleton が合格条件を満たす。不合格なら撤回する hard gate 付き

## Initiative Trigger

本来の意味での可観測性を獲得すること。現行方式は耐久性・隔離という半分を達成したが、実行時に確定する因果・Context というもう半分が欠けており、その是正が動機（ユーザー回答 Q4）。背景には Projector の推測ロジックの保守限界と、Bolt swarm・subagent 利用拡大による推測誤りの実害化がある。

## Initial Scope Signal

- **Scope**: `amadeus-feature`（18 ステージ、Standard depth、comprehensive test strategy）
- **単位**: 6 Phase（#1673-#1678）を 1 Intent で扱う。並行化は Intent 分割ではなく Unit/Bolt（Phase 内 module 分割）で実現する
- **Hard gate**: Phase 1（#1678 walking skeleton）が不合格なら本番正本へ変更を波及させず撤回し、#1628 方式へ戻す。恒久 dual upstream へ妥協しない

## 参照

- 親 Issue: https://github.com/amadeus-dlc/amadeus/issues/1672（設計レビュー済み）
- Phase 1: https://github.com/amadeus-dlc/amadeus/issues/1678（テスト先行順序を合格条件に含有）
- 前提 Issue: https://github.com/amadeus-dlc/amadeus/issues/1628（現行方式）
