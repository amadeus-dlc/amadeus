# Questions：Feasibility

| # | 確認したいこと | 推奨回答 | 回答 |
|---|---|---|---|
| Q001 | この Intent で交渉不能な制約は何か。 | 日本語生成成果物契約、`skills/amadeus*/` から `.agents/skills/amadeus*/` への昇格フロー、PR 作成後の監視、merge は人間が行うことを交渉不能な制約として扱う。 | 日本語生成成果物契約、昇格フロー、PR 作成後の監視、merge は人間が行うことを制約として扱う。 |
| Q002 | 後続判断に効くリスクは何か。 | 英語化と意味変更が混ざること、source skill と昇格先成果物がずれること、子 Issue の完了証拠が追跡できなくなることを主なリスクとして扱う。 | 英語化と意味変更が混ざること、source skill と昇格先成果物がずれること、子 Issue の完了証拠が追跡できなくなることを主なリスクとして扱う。 |
| Q003 | 外部依存と前提は何か。 | GitHub Issue、Pull Request、CI、レビューボットの状態を外部依存として扱う。子 Issue の完了証拠は GitHub 上の PR merge または Issue close で確認できることを前提にする。 | GitHub Issue、Pull Request、CI、レビューボットの状態を外部依存として扱う。子 Issue の完了証拠は GitHub 上の PR merge または Issue close で確認できることを前提にする。 |
