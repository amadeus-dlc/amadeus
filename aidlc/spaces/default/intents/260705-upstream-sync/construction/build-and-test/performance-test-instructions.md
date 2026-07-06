# performance-test instructions（260705-upstream-sync）

上流入力: [code-summary.md](../upstream-sync/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

上流同期（無改変再コピー + 統合）であり、性能特性を変える変更（ループ、I/O パターン、大規模データ処理）を含まない。専用の performance-test 工程は不適用と判断する。

## 検証

決定論的 eval 群の実行時間が test:all の完走（exit 0）で観測され、顕著な劣化があれば CI 時間として表面化する。
