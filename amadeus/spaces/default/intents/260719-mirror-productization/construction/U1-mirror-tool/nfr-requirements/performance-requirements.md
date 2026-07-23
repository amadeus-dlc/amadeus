# Performance Requirements — U1-mirror-tool

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md

## PR-U1-1: status の応答時間

status verb は gh read 1〜2回+ローカル読取のみで完了する。数値目標は置かない — 律速は gh のネットワーク往復であり、ツール側の強制メカニズム(タイムアウト等)を新設しない(nfr-requirements:c3: 数値は強制メカニズムから導出 — 本 verb に強制メカニズムは存在せず、置くべき根拠となる NFR 要求も requirements.md にない)。gh 呼出は既存 spawnGh の同期実行(挙動不変面と同一様式)。

## PR-U1-2: 追加負荷ゼロ(挙動不変面)

既存3 verb の実行経路に status 追加による性能影響なし(分岐追加のみ、共有初期化の増加なし)— t232 の既存アサーション不変(N-1)で担保。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:21:39Z
- **Iteration:** 1
- **Scope decision:** none

U1 NFR-R READY(引用捏造ゼロ・数値扱い妥当)。Minor の装飾トークン(technology-stack.md ヘッダ3件)は除去して即時解消

### Findings

- ヘッダ装飾トークン3件を除去(是正済み・upstream-coverage 再 PASSED)
