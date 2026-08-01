# Scalability Design — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): scalability-requirements(SC-U2-1〜3), performance-requirements(PR-U2-2 線形計算量共有), tech-stack-decisions(TS-U2-2 単一実装共有), business-logic-model(§0-3 固定導出撤廃, §1.1 全モデルループ, §3.1 戻り型)

本 Unit は単一プロセス内でローカルファイルを読む短命 CLI 検証経路であり、負荷分散・水平スケール・容量計画・同時実行数管理・スケーリングトリガの設計対象を持たない。スケーラビリティ設計の実質は「登録モデル数の増加に対する構造的健全性」であり、SC-U2-1〜3 を functional-design 規定済みの機構へ写像する。新規機構は導入しない。

## NFR → 機構マッピング

| # | 要求 | 設計機構(functional-design 参照) | 検証方法(証明するテスト/AC) |
|---|---|---|---|
| SC-U2-1 | モデル数・名前・パスのハードコード撤廃。第3モデル登録が model-map.json 追記のみで成立 | business-logic-model §0-3: `TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH` の固定導出を撤廃し、モデル特定情報は model-map.json の宣言に一元化。§1.1 の全モデルループは map 宣言を唯一の入力として駆動し、loader コードはモデル数に中立(第3モデルの実登録自体は Out of scope) | grep で loader 内の固定モデル名・固定パス参照 0 件、t403 の2モデル fixture green |
| SC-U2-2 | `models` 配列は宣言順(= 名前昇順)で決定的。モデル数に依らず同一 map から同一順序 | §3.1: parser 強制の一意・名前昇順をそのまま戻り型の配列順に使い、追加ソートも fs 列挙順の混入もしない | t403 の配列順序 assert |
| SC-U2-3 | モデル増で指数悪化しない(線形計算量) | PR-U2-2 と同一拘束(重複設定しない): §1.1 のループはモデル数 n × 資産数 m の単純直列、宣言照合は u1 リゾルバの線形境界に乗る。詳細は performance-design の PR-U2-2 行を参照 | performance-design に同じ |

## 非適用カテゴリ

負荷分散・水平/垂直スケール・容量計画・同時実行数上限・負荷予測・データ増大計画は非適用。根拠は scalability-requirements「非適用の根拠」節のとおり: 対象はローカルファイルを読む単一プロセスの CLI 検証経路であり、常駐サービスも蓄積データも持たない。スケーラビリティに相当する実質的関心は「登録モデル数の増加に対する構造的健全性」であり、上表 SC-U2-1〜3 で完全に表現できる。TLC 探索の時間的拡張性(全モデル化が CI 時間に与える影響)は u5-ci-all-models-measure の測定プロトコル(実測 + 30 分 timeout 整合)へフォワード参照する。
