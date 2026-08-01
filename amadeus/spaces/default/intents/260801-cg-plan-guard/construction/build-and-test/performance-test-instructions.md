# Performance Test Instructions — 260801-cg-plan-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(4 unit)

- 本 intent の性能面は NFR-3(新規 I/O ゼロ)に trace する範囲のみ検証する(bt-proportional-selection — 戦略名だけで負荷試験を機械追加しない)。

## 選定根拠

対象 NFR は NFR-3(新規 I/O ゼロ)のみ — 実在境界へ trace できない負荷試験・SLO 検証は生成しない(生成しなかった検査の根拠を本書に明記)。

## 検証形

- 発行ガード: DAG 読みは既存 read の移動(追加 I/O 0)— t403 が in-process で駆動し、実装 diff の grep(readBoltDagBatches 呼び出し数不変)で確認済み。
- approve 突合: audit 読みは宣言 batch 数に有界(≤ declared batches)— corpus sweep 24テスト 3.8秒の実測で退行なし。
- 専用の実時間負荷試験は対象 NFR が存在しないため生成しない(根拠: requirements.md NFR 節に性能 SLO なし)。
