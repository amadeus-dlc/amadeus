# Team Allocation — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`（参照済み）

team-formation（1.5）は本 scope では SKIP のため、全 Bolt の実行者は amadeus-developer-agent（AI）とする。ソロオーナー＋conductor 体制（approval-handoff AH-3）。

## 割当

| Bolt | 実行者 | 形態 |
|---|---|---|
| Bolt 1（skeleton） | amadeus-developer-agent（conductor 直下、単独） | 直列・人間ゲート必須 |
| Bolt 2-4（event-registry／journal-v2／context-propagation） | amadeus-developer-agent × 最大3 | gated swarm バッチ（DAG 上独立） |
| Bolt 5（local-exporters） | amadeus-developer-agent | 直列（U2＋U3 完了後） |
| Bolt 6-7（journal-reader-swap／metrics-logs） | amadeus-developer-agent × 最大2 | gated swarm バッチ |
| Bolt 8（callsite-migration） | amadeus-developer-agent | 直列（L サイズ） |
| Bolt 9-10（legacy-writer-removal／otlp-relay） | amadeus-developer-agent | 直列（削除ゲート・縮退は順序依存） |

## 統合方式（1 Bolt = 1 PR）

ユーザー指示（2026-07-29、delivery-planning 承認後の追加決定）: **各 Bolt は独立した1つの PR として着地させる。**

- 各 Bolt の worktree ブランチから1 PR を作成し、ゲート承認（＋必要なレビュー）後にマージする
- 直列 Bolt（5, 8, 9, 10）は先行 Bolt の PR マージ完了後に開始する（依存の基点を main のマージ済みコミットに置く）
- 並行バッチ（Bolt 2-4、Bolt 6-7）は並行して PR を開いてよいが、バッチ境界ゲートは全 PR のマージ後に通過する
- ミラー Issue（#1679）と record の同期は既存の record-sync 規則に従う

## 制約

- 同時アクティブ builder は最大4（`team-practices.md`／team.md の parallel-bolts 既定）
- 全 builder は worktree 分離（solo-bolt-worktree-required）。本線ツリーでの直接実装は行わない
- 各バッチの境界で人間のゲート承認（Q3-A gated モード）
- reviewer は各 Bolt のステージ reviewer（§12a）が担当し、conductor が fan-out と retry を所有する
