# Code Generation Plan：B004 文書と実証

対象 Unit: U007（規範文書改定）+ U008（examples 再生成と dogfooding）。

## 変更内容と順序

| # | 変更 | 対象 | 検証方法 |
|---|---|---|---|
| 1 | GD009 の実施 | Intent モジュールファイル 3 件と `intents.md` 索引の削除、IndexGenerate の退役、validator の Index 検査を「存在する場合のみ検査」へ変更（examples の旧 snapshot は保全）。TDD | validator と test:all green |
| 2 | 規範文書改定 | AMADEUS.md（エンジン駆動入口、補助 3 skill、Operation 採用、英語必須）、`.agents/rules/amadeus-artifacts-and-examples.md`（英語必須化）、`docs/amadeus/skill-language-policy.md`（英語必須化）、`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`（D004 による上書き注記） | 削除済み skill と廃止成果物への参照が残らない |
| 3 | dogfooding | park 済み workflow を resume し、エンジン駆動で本 Intent の残ステージを進める（Construction Autonomy Mode: autonomous）。エンジンの audit 記録を record に残す | エンジン記録イベントの存在（R011） |
| 4 | 【人間判断待ち】examples 再生成と旧 skill 削除 | real provider のコスト消費と生成ハーネスの適応が必要なため halt-and-ask。承認後に実施し、provenance を新 skill へ切替後、旧 stage skill 22 個 + amadeus-steering を削除 | 承認後: examples validator pass、provenance staleReason 解消 |
