# Performance Test Instructions — bug-zero-batch

bugfix scope(Minimal depth)。本バッチの6修正はいずれも性能特性を変えない(ガード追加・エラー分類・状態保持の追加のみで、ホットパスやアルゴリズム計算量の変更なし)。専用の性能テストは実施しない — org.md の bugfix テスト姿勢(対象バグへのリグレッション+既存スイートのグリーン維持)に従う。

観測ポイント(参考): #678 の pendingExtHeader はチャンクごとの Buffer 結合を追加するが、対象は拡張ヘッダ本体(通常 <1KiB)のみで、既存の `current`(ファイル本文)と同一のパターン。
