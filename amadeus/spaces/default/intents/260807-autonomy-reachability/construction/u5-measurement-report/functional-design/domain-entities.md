# Domain Entities — u5-measurement-report

上流入力(consumes 全数): requirements.md(FR-4a〜4c)、components.md(FR-4 N/A 注記 — コード変更なし)、component-methods.md(u5 は method 変更なし)、unit-of-work.md(u5 境界 = record 内レポートのみ)、unit-of-work-story-map.md(物語「改善が数値で確認できる」)、services.md(u5 はサービス変更なし — 読取のみ)。

## レポートのデータモデル(成果物 = record 内 markdown 1本)

### MeasurementReport(`construction/u5-measurement-report/…` 配下の成果物)

| 節 | 内容 |
|---|---|
| 計測 ref | clone パス種別(committed corpus / local worktree)・observed SHA・述語の逐語・測定時刻(measurement-ref-in-artifacts) |
| ベースライン | C1(508/178/686、13 intents — mode.set 前後の human.turn)・C3(3 intent の tx/question.answered/human.turn 対照)。**C2(231件/63)は使わない**(xrev 2名が再現不能判定) |
| 測定述語 | `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(正準)+新設 `INTENT_AUTONOMY_HUMAN_REQUIRED`(u1)+`QUESTION_ANSWERED` の `Resolution Route` 属性(u3)。`AUTONOMY_MODE_SET` は legacy につき不使用 |
| 適用後計測 | 本 intent 自身(260807-autonomy-reachability)の audit shard を第一標本に: 宣言→最初のステージ前の mode 有効化(FR-4c「mode 設定前 human.turn = 0」— birth 同時宣言着地後の新規 intent で測る場合の手順も記載) |
| スキーマ注意 | shard は2スキーマ同居 — `(.attributes.Event // .event)` 正規化必須(xrev reviewer 2 の手法メモ継承) |

## 計測スクリプト(repo 外 scratch — 成果物に全文を貼付して再現可能化)

bash+jq。repo 内へは置かない(scratch-script-discipline)。レポートに逐語掲載し、第三者が committed corpus で再実行できる形にする。
