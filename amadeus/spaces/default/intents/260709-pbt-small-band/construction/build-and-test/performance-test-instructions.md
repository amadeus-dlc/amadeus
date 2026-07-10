# Performance Test Instructions — pbt-small-band

FR-1.4 の時間予算(+60 秒以内)で管理: --ci 実測は B1 時点で前 173.67s → 後 158.11s、最終統合ツリーでも RESULT: PASS(ci_exit=0)。深掘りモード(50k numRuns)は 12 tests / 3.40s で PR CI 外の実行に十分軽量。専用性能テストは対象外(refactor スコープ、NFR に性能要件なし)。
