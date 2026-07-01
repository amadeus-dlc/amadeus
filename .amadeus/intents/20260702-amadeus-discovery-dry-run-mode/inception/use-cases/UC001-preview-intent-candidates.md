# UC001: Intent 候補を読み取り専用で表示する

## システム境界

- Agent は `amadeus-discovery dry-run` を使い、入力テーマまたは探索対象から Intent 候補を表示する。
- `dry-run` は候補表示を返すが、Discovery 成果物、Intent 成果物、GitHub Issue を作らない。

## 事前条件

- `.amadeus/` の steering layer が存在する。
- 入力テーマ、GitHub Issue、PR、validator 結果、evaluator 結果、CI 結果のいずれかが与えられている。

## 基本フロー

1. Agent は入力テーマまたは探索対象を確認する。
2. Agent は既存 Discovery と既存 Intent を読む。
3. Agent は候補抽出に必要な steering layer、Domain Map、Context Map を読む。
4. `dry-run` は既存 Discovery との関係と既存 Intent との関係を整理する。
5. `dry-run` は Intent 候補、候補ごとの分類、根拠、未確認事項を表示する。
6. `dry-run` は判定案と推奨次アクションを表示する。
7. `multi_intent` の場合、`dry-run` は recommended 候補を1件示す。

## 代替フロー

- 既存 Intent 更新が妥当な場合、`dry-run` は `existing_intent_update` の判定案を表示する。
- Intent 化が不要な場合、`dry-run` は `research_only` または `no_intent` の判定案を表示する。
- 判断材料が不足する場合、`dry-run` は `undecided` と未確認事項を表示する。

## 事後条件

- `.amadeus/` は更新されていない。
- GitHub Issue は作成されていない。
- `amadeus-ideation` は自動実行されていない。
- 人間が次に使う skill を判断できる候補表示が残る。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | dry-run request | 入力テーマまたは探索対象を受け取る。 |
| 制御 | candidate preview | 既存成果物と外部参照から候補を整理する。 |
| エンティティ | intent candidate preview | 候補、分類、根拠、未確認事項、推奨次アクションを保持する。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| `amadeus-discovery dry-run` | 候補表示と判定案を決める。 | Intent 候補、分類、根拠、未確認事項、推奨次アクション。 | 成果物作成は人間が明示した次の skill へ渡す。 |
