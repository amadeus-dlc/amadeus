# Scalability Design — u1-autonomy-core

上流入力(consumes 全数): business-logic-model.md(処理量の発生点)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 規模特性(CLI/file 境界 — cid:nfr-design:c1)

- refusal イベントの発生量は「人間裁定へ落ちた occurrence 数」に比例 — 実測ベース(Issue #2378 の計測)で per-intent 数十〜百件オーダー。shard は既存の append-only 運用の範囲内で、ローテーション・圧縮の新設は不要
- 並行 worktree・複数 intent での shard 分離は既存機構(per-clone shard)そのまま — u1 は書き手を増やさない(canonical 化でむしろ集約)
- 水平スケーリング・キャッシュ・サーキットブレーカは適用外(常駐サービス不在)

## 将来条件

ハーネス追加・intent 増加はイベント量に線形 — 集計(u5)は jq ストリーム処理で 10万行オーダーまで実用(既存 audit 全数計測の実績範囲)。
