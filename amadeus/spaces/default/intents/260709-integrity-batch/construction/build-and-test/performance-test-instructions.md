# Performance Test Instructions — integrity-batch

bugfix スコープにつき専用の性能テストは対象外(NFR に性能要件なし)。性能に関わる変更は mint-presence の stdin 読取追加のみで、フックは fail-open・exit 0 保証を維持し、UserPromptSubmit 1回あたり定数時間の prefix 照合が増えるのみ。既存フック健全性テスト(t13 hook robustness)がグリーンであることをもって足りる。
