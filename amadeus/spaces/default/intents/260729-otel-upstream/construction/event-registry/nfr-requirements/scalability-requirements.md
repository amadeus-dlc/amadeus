# Scalability Requirements — U2: event-registry

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## Registry 規模の上界と拡張手順

- Registry は現行 78 event（#1672 由来のカウント）で基数を固定し、unit test で基数検証を行う（vacuous 相等を回避、VER-1）
- event 追加は線形に増えうるが、1 Intent あたりの追加は個位数を想定。数百件規模でも Map ルックアップ・型 union 生成のコストは問題にならない（Node/Bun の Map・tsc の union で実用上界に余裕）
- 新規 event の追加は Registry・reader・state machine 参照・テストを同一変更で行い、writer-only／reader-only event を構造的に防ぐ（BR-6）
- schema version 変更は必ず reader 側 migration を伴い、migration なしの変更は drift guard が拒否する（BR-5）

## 水平・垂直スケール

- 対象外。Registry は短命 CLI process 内の不変の定義表であり、分散・共有状態・負荷分散の概念を持たない（technology-stack.md の現行断面どおり HTTP server・DB なし）
- 4集合の抽出コストはソース行数に比例し、CI のビルド／テスト時間内に収まる（repository-native 4 層ランナーの既存範囲）
