# External Dependency Map：最小購入フロー

## 外部依存

| 依存 | 影響する Bolt | 状態 | 対応 |
|---|---|---|---|
| 在庫管理システムの REST API（EXT001） | B002 | 連携仕様と確認先が未確認 | B001 の実行中に仕様を確認する。影響は C006 在庫参照クライアントに閉じている（GD004）。確定できるまで B002 を開始しない |
| リレーショナルデータベースの具体的な製品 | B001、B002 | 未確認 | Construction の NFR Requirements（tech-stack-decisions）で確定する |
| Web UI のフレームワーク | B001、B002 | 未確認 | Construction の NFR Requirements（tech-stack-decisions）で確定する |
