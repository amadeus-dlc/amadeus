# architecture — 260706-model-overlay

正本は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（増分更新 2026-07-06T00:25:00Z、基準 commit 2a0a784b）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering 時点は、上流 2.2.0 同期（#428 系）と全面 rename（#553、CI 最終確認中）の churn 中にあり、codekb の一部（engine 構成の記述）は陳腐化が進行している。churn 中の再生成は rename 直後に無効化されるため行わず、codekb は背景知識として据え置き採用し、本 Intent の対象 seam（promote-skill.ts、parity 機構、agent 定義の modelOverride）は rename 後の姿（branch eng1/issue-526-rename の read-only 参照）に対する直接調査で裏取りした（調査結果は reverse-engineering-timestamp.md と diary を参照）。
