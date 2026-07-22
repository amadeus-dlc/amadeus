# External Dependency Map — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

| 依存 | 状態 | 影響 |
|---|---|---|
| e2 #1267(hold-choice)の record.ts/election.ts 共有 | 関数単位非交差合意(変動時相互通知) | requirements.md C-5 監視のみ |
| e1 留保の b 成分(persist 様式 norm PR トラック) | 本 intent 外(FR-1 留保転記どおり分離) | 影響なし |
| CI/coverage 既存ゲート | 変更なし(requirements.md FR-4・team-practices.md の CI 基準現行維持) | components.md の dist 再生成面+drift guard のみ |
| Unit 内部依存 | なし(unit-of-work.md U1 単独・unit-of-work-dependency.md の依存なし) | 外部依存は上2行のみ |
| 価値提供先 | unit-of-work-story-map.md の4ジャーニー | Bolt 1 完了で全充足 |
