# Scalability Requirements — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): business-logic-model(§3.1 戻り型), business-rules(BR-S2), requirements(FR-4, Out of scope「第3モデル登録」)

## 非適用の根拠

本 Unit は単一プロセス内でローカルファイルを読む CLI 検証経路の改訂であり、負荷分散・水平スケール・容量計画・同時実行数の管理対象を持たない。サービスとしてのスケーラビリティ要求は非適用である。

## 構造的な拡張性の拘束(適用部分)

スケーラビリティに相当する実質的関心は「登録モデル数の増加に対する構造的健全性」であり、以下を要求として固定する。

| # | 要求 | 測定可能な基準 | 由来 |
|---|---|---|---|
| SC-U2-1 | loader は登録モデル数に対して汎化されていること: モデル数・モデル名・パスのハードコードを loader 内に残さない(`TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH` の固定導出撤廃)。第3モデルの登録が model-map.json への追記のみで loader 改変なしに成立する構造とする(第3モデルの実登録自体は Out of scope) | grep で loader 内の固定モデル名・固定パス参照が 0 件。t403 の2モデル fixture がモデル数に中立なコードで緑 | BR-S1, FR-4 |
| SC-U2-2 | `models` 配列の順序は宣言順(parser 強制の一意・名前昇順)で決定的とし、モデル数に依らず同一 map から同一順序を返す。fs 列挙順等の非決定的要因を順序に混入させない | t403 の配列順序 assert | BR-S2 |
| SC-U2-3 | 計算量はモデル数に線形(performance-requirements PR-U2-2 と同一拘束 — モデル増で指数悪化しない) | PR-U2-2 に同じ | performance-requirements |

負荷予測・スケーリングトリガ・データ増大計画は対象外(常駐サービス・蓄積データなし)。
