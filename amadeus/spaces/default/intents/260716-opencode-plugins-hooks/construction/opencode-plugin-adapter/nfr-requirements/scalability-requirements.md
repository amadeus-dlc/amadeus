# Scalability Requirements — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(ワークフロー2 — 単発イベント処理)、`../functional-design/business-rules.md`(R-1)、`../../../inception/requirements-analysis/requirements.md`(スコープ境界)、codekb `technology-stack.md`(ローカル Bun 実行)。2026-07-17。

## 判定: 根拠付き N/A

スケーラビリティ要件の**対象実体が存在しない**(environment-provisioning:c3 の N/A 様式 — 反証可能な不存在根拠を併記):

| 検討軸 | 不存在根拠 |
|---|---|
| 負荷成長(load projections) | plugin はローカル開発者1名の opencode セッション内イベントハンドラ — 多重ユーザー・多重テナントの負荷主体が構成上存在しない(services.md「ネットワーク・永続化・デーモンの追加なし」) |
| スケーリング戦略・トリガー | 常駐プロセスなし(1 イベント = 1 処理で終端、business-logic-model ワークフロー2)— スケールさせる対象プロセスが存在しない |
| データ成長(capacity planning) | plugin 自身は永続データを持たない(domain-entities「全型が単発イベント処理内で生成・消費される値」)。audit シャードへの追記は core hooks 側の既存契約で、本 unit の変更面ではない(AC-2b 無改変) |
| 同時実行(concurrency) | opencode のフック呼び出し粒度に従属(plugin 側で並行制御を導入しない)。共有可変状態なし(frozen リテラルのみ)につき競合面もなし |

## 将来条件(requirements-analysis:c4 チェックリストへの応答)

規模増・ページング・クラッシュ耐性・別 OS の将来条件は、本 unit では「対象データ構造を持たない」ことで構造的に非該当。opencode 側のフック増設・イベント増加時も 1 イベント = 1 純関数写像+1 spawn の線形構造は不変で、スケーラビリティ設計の再訪トリガーは存在しない。
