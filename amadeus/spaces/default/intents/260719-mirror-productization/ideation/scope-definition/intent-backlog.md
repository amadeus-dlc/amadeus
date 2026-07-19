# Intent Backlog — mirror-productization

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## 本 intent の機能バックログ(F — S-ID へ遡及)

| ID | 項目 | 対応 S | 備考 |
|---|---|---|---|
| F-01 | mirror.ts の core/tools 移設+scripts 廃止+drift guard 配線 | S-01 | import 兄弟相対化(F-1 実測) |
| F-02 | status verb(乖離3クラス診断・読取専用・exit code 契約) | S-02 | 新規実装面 |
| F-03 | SKILL /amadeus-mirror(6ハーネス配布) | S-03 | 様式は design 委任(U-03) |
| F-04 | 3層 config 読取・解決モジュール(下位優先・キー単位上書き・テスト固定) | S-04 | R-3 緩和込み |
| F-05 | engine: phase boundary での mirror ask/print 指令発行 | S-05/S-06 | C-08 消費側棚卸し必須 |
| F-06 | gh optional ノルム改定 norm PR | S-07 | P-01 経由 |

## 将来 intent 候補(X — 本 intent に含めない)

| ID | 項目 | 由来 |
|---|---|---|
| X-01 | 既存設定(autonomy mode 等)の3層 config 移行 | W-01 |
| X-02 | マシンローカル config 層 | W-02 |
| X-03 | トラッカー抽象化(GitLab 等) | W-03 |
| X-04 | mirror 本文様式の拡張(進捗サマリー自動生成等) | W-04 |
