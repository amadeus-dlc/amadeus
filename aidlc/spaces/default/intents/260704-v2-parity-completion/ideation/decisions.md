# Decisions：Ideation

## 一覧

| ID | 判断 | 状態 | 詳細 |
|---|---|---|---|
| D001 | 本家 `dist/claude/`（MIT-0、基準 commit fde1e1af）からの適応コピーを基本戦略とする。適応点は amadeus-* への改名と amadeus-grilling への結線。基準 commit は固定し、更新は明示的に行う | active | [D001](decisions/D001-upstream-adaptive-copy.md) |
| D002 | 独自 skill は grilling、domain-modeling、validator の 3 個だけ残し、メタレビュー系 3 個と domain-grilling、event-storming を削除、steering を 0.1 / 2.2 へ畳み込む | active | [D002](decisions/D002-skill-lineup.md) |
| D003 | SKILL.md と TS スクリプトは英語必須へ規範を改定する。記述系成果物と gate 文言は日本語を維持する | active | [D003](decisions/D003-language-policy.md) |
| D004 | 検査体制は本家 sensor と amadeus-validator の併用とし、Issue #393 の sensor 不採用判断を上書きする | active | [D004](decisions/D004-sensor-validator.md) |
| D005 | Operation phase（4.1〜4.7）を完全採用し、「Operation は Amadeus 対象外」契約を撤廃する | active | [D005](decisions/D005-operation-adoption.md) |
| D006 | Intent モジュールファイルと `intents.md` 索引を廃止する（前 Intent の CD009「現状維持」を上書き） | active | [D006](decisions/D006-module-file-retirement.md) |
| D007 | 完了済み 2 record は現状のまま残し、新形式へ移行しない | active | [D007](decisions/D007-completed-records.md) |
