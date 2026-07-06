# technology-stack — 260706-pr-gate-discipline

正本は [codekb/amadeus/technology-stack.md](../../../../codekb/amadeus/technology-stack.md)（増分更新 2026-07-06T01:15:14Z、基準 commit 2a0a784b。本 Intent の reverse-engineering で鮮度確認・必要分のみ更新）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering は、前回基準 616d063e からの非 aidlc 差分（PR #531 の 10 ファイルのみ）を developer scan → architect synthesis の subagent 経路で影響評価し、正本を採用した。同範囲を先行反映していた Intent 260706-docs-lang-guide（PR #536 同乗）との二重更新は、leader 調整指示に基づき main 側を正として重複分を落とし、本 Intent 固有の差分（api-documentation.md の amadeus-learnings persist CLI 行、dependencies.md の cid marker 依存行）だけを保持した（decision 記録済み）。更新内訳は [codekb/amadeus/reverse-engineering-timestamp.md](../../../../codekb/amadeus/reverse-engineering-timestamp.md) と [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md) を参照。
