# Constraint Register：Amadeus skill 英語化実施計画

## 制約一覧

| ID | 制約 | 種別 | 影響 | 扱い |
|---|---|---|---|---|
| C001 | Amadeus DLC が生成する成果物は日本語で維持する。 | 言語契約 | SKILL.md 英語化と生成成果物の言語を混ぜない。 | 交渉不能 |
| C002 | `skills/amadeus*/` から `.agents/skills/amadeus*/` への反映は昇格フローを使う。 | 開発手順 | source skill と昇格先成果物のずれを防ぐ。 | 交渉不能 |
| C003 | PR 作成後は CI、レビューボット、コメントを監視する。 | PR gate | 子 Issue の完了証拠を追跡する。 | 交渉不能 |
| C004 | merge は人間が行う。 | 権限分担 | Agent は merge を実行しない。 | 交渉不能 |
| C005 | 子 Issue の完了は対応 PR の merge または明示的な Issue close で観測する。 | 完了証拠 | #395、#400、#401、#402 の完了状態を追跡する。 | 交渉不能 |

## 前提

GitHub Issue、Pull Request、CI、レビューボットの状態を外部依存として扱う。

子 Issue の完了証拠は、GitHub 上の PR merge または Issue close で確認できることを前提にする。
