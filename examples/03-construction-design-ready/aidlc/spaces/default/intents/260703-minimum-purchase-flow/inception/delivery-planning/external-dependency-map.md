# External Dependency Map：260703-minimum-purchase-flow

## 外部依存

| 依存 | 影響する Bolt | 状態 | 対応 |
|---|---|---|---|
| 在庫管理システム（EXT001）の REST API | B001 | API 仕様と接続条件が未確認 | U001 の着手時に仕様と接続条件を確認する。確定までは契約を仮置きしたスタブで進め、確定後に在庫参照の接続部分へ反映する |
| リレーショナルデータベース | B001 | 使用は制約として確定済み。製品の選定は未確認 | Construction の NFR Requirements（Stage 3.2）の技術スタック判断で製品を確定する |
