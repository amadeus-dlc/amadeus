# External Dependency Map：260703-minimum-purchase-flow

## 外部依存

| 依存 | 影響する Bolt | 状態 | 対応 |
|---|---|---|---|
| 在庫管理システムの REST API（EXT001） | B002 | API 仕様と接続条件が未確認 | B002 の着手前に確認先を特定し、API 仕様と接続条件を確認する。確認できるまで B002 の Construction ステージに入らない。 |
| リレーショナルデータベース | B001 | 製品選定が未確認 | Construction の NFR Requirements の技術スタック判断で確定する。注文の記録に必要な最小構成から選ぶ。 |
