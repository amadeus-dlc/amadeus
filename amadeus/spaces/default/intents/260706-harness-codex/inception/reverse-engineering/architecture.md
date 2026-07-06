# architecture — 260706-harness-codex

正本は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（増分更新 2026-07-06T06:07:00Z、基準 commit 9dd93f50。本 Intent の reverse-engineering で鮮度確認・必要分のみ更新）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering は、前回基準 c50a0fe5 からの差分（PR #553 = 全面 rename のみ）を確認し、正本を採用した。codekb への影響は architecture.md の旧 workspace root 表記 1 行のみで、これを更新した（旧名参照のうち上流 repo 名と履歴記述は正当のため不変更）。差分が極小のため subagent 委譲はせず conductor が直接処理した（Maintainer の裁量許可）。更新内訳は [codekb/amadeus/reverse-engineering-timestamp.md](../../../../codekb/amadeus/reverse-engineering-timestamp.md) と [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md) を参照。
