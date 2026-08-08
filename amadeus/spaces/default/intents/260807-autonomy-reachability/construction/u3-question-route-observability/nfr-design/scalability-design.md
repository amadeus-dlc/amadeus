# Scalability Design — u3-question-route-observability

上流入力(consumes 全数): business-logic-model.md(発生量の構造)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 規模特性

- 属性追加は既存 `QUESTION_ANSWERED` 行のサイズを数十バイト増やすのみ — 発生頻度は不変(1回答1行)。shard 運用への影響なし
- 旧形 shard(属性なし行)との混在は読み側が「経路不明(pre-u3)」として扱う(BR-U3-4)— スキーマ移行・変換ジョブは不要
- 水平スケーリング・キャッシュ適用外(cid:nfr-design:c1)

## 将来条件

ハーネス・intent の増加は行数に線形。u5 の集計はストリーム処理で吸収(u1 scalability-design と同一の実績範囲)。
