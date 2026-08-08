# Reliability Design — u3-question-route-observability

上流入力(consumes 全数): business-logic-model.md(エラー分類)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 失敗様式と回復

| 失敗点 | 挙動 | 回復 |
|---|---|---|
| `--decision-id` 形式不正(渡した場合のみ) | loud error、記録しない | 呼び出し側が正しい id で再実行 |
| decision-id 省略(常に妥当) | Route=human として記録(拒否経路なし) | — (設計どおり。ladder 渡し忘れは迂回検出の偽陽性へ倒れる安全非対称) |
| emit 失敗 | 既存の emit 失敗様式に従う(新設様式なし) | 既存どおり |

- failure injection: 形式不正1点をテストで固定。省略系は「拒否されないこと」を対照テストで固定(BR-U3-3)
- 旧形 shard の読取は「経路不明」扱いでエラーにしない(BR-U3-4)— 読み側 fail-open は集計の分類であり検証の丸めではない(不明は不明と表示)

## 一貫性

Route ⇔ Decision Id の同時性は導出の定義として構造的に常成立(検査不要のクラス不変条件)。
