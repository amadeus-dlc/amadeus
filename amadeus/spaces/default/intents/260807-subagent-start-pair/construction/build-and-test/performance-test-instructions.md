# Performance Test Instructions — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（変更面の確認元）、code-summary（変更クラスの確認元）

## 適用外の根拠（cid:build-and-test:c4 — NFR trace なき専用試験は新設しない）

本 intent の requirements（FR-A1〜A4 / FR-B1〜B4 / FR-C1）に性能 NFR は存在しない。変更は (a) 設定ファイルへのフックエントリ1件追加 (b) 文字列リテラル1件の集合定数化（includes 判定 — O(2) の定数比較）(c) doc 同期であり、実行経路の計算量・I/O 特性を変えない。

## 患部に対応する既存担保面

- フック実行のレイテンシは PreToolUse フック自体の起動コスト（bun ~20ms 級）が支配的で、本変更はそこに演算を追加しない
- CI の Tests ジョブ全体の wall-clock が実質的な回帰検知面として機能（PR #2427 / #2428 とも通常帯で green）

専用の負荷試験・ベンチマークは生成しない。
