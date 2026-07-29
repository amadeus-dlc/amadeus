# Scalability Design — U2: event-registry

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の要件（Registry 規模の上界・拡張手順・水平垂直スケール対象外）に対する設計。

## 規模上界の設計

- Registry は不変の定義表として実装し、基数 78 件を unit test で固定する（vacuous 相等の回避、VER-1）。動的登録 API（runtime での event 追加）を提供しない
- event 追加時のコストは Map ルックアップ・型 union のいずれも数百件規模で実用上界に余裕があるため、分割・遅延ロードの仕組みは設けない（scalability-requirements.md § Registry 規模の上界）

## 拡張手順の構造化

- 新規 event の追加は Registry・reader（codec 定義表）・state machine 参照・テストを同一変更で行う運用を drift guard で強制し、writer-only／reader-only event を構造的に防ぐ（BR-6）
- schema version 変更は reader 側 migration を必須とし、migration なしの version 変更は drift guard が拒否する（BR-5）

## スケール対象外の明文化

- Registry は短命 CLI process 内の不変定義表であり、分散・共有状態・負荷分散の概念を持たない。水平・垂直スケールの設計は適用外（scalability-requirements.md § 水平・垂直スケール）
- 4集合の抽出コストはソース行数比例で CI のビルド／テスト時間内に収まる設計とし、抽出の並列化・キャッシュ機構は導入しない
