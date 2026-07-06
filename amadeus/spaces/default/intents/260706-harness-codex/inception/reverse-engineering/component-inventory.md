# component-inventory — 260706-harness-codex

正本は [codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md)（増分更新 2026-07-06T05:44:48Z = Intent 260706-engine-consistency による同範囲更新を正とし、本 Intent の reverse-engineering は鮮度確認 + 残存旧名 1 行の補正のみ実施）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering は、前回基準 c50a0fe5 からの差分（PR #553 = 全面 rename のみ）を確認し、正本を採用した。同範囲の増分更新は Intent 260706-engine-consistency が先行しており（PR #559 で merge、main 側を正として統合）、本 Intent の固有寄与は architecture.md に残存していた旧 workspace root 表記 1 行の補正のみ（timestamp.md に記録）。旧名参照のうち上流 repo 名と履歴記述は正当のため不変更。差分が極小のため subagent 委譲はせず conductor が直接処理した（Maintainer の裁量許可）。更新内訳は [codekb/amadeus/reverse-engineering-timestamp.md](../../../../codekb/amadeus/reverse-engineering-timestamp.md) と [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md) を参照。
