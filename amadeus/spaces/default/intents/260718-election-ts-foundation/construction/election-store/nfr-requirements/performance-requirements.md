# Performance Requirements — election-store(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 性能特性と目標

U2 は選挙1件分のファイル I/O 層(business-logic-model.md ストアレイアウト — election.json/ledger.json ほか6面)。入力規模は投票者数(現登録 14 名 — stage diary Interpretations の team.sh 実測記録)に比例する小規模ファイル群で、専用の性能 SLO を新設しない(observability-setup:c3)。

- appendBallot/appendTimeline は追記列への O(1) 追加+全量書き戻し(tmp+rename)。ファイルサイズは票数規模(数十 KB 未満)で読み書きの最適化を要求しない
- 数値目標は置かない(未実測の数値を SLO 化しない)。停止ガードは既存テストランナーのタイムアウトのみ

## 測定と検証

- I/O は integration 層テストの実 FS 実行で検証(requirements.md NFR-2 — fs-tests-integration-first)。ベンチマークは追加しない(規模正当化 — 既存で代替できない根拠なし)
- ランタイムは既存スタック(technology-stack.md の Bun/TS 実測)を踏襲する
