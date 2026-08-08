# Performance Test Instructions — 260807-intent-2328-tests-e2e-au

上流入力(consumes 全数): code-generation-plan（変更面の確認元）、code-summary（変更クラスの確認元）

## 適用外の根拠（cid:build-and-test:c4 — NFR trace なき専用試験は新設しない）

本 intent の requirements に性能 NFR は存在しない。変更はテストコードの読み手置換（JSON.parse 直読 → 正規化関数経由 — 行単位の定数コスト）であり、本番実行経路には一切触れない。

## 患部に対応する既存担保面

- e2e tier の wall-clock（99ファイル）が回帰検知面として機能（builder/conductor 実測で通常帯）
- CI の Tests ジョブ wall-clock は本変更の対象層（e2e）を含まないため影響なし

専用の負荷試験・ベンチマークは生成しない。
