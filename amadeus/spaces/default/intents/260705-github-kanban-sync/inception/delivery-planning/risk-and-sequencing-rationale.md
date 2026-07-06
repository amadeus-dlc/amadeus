# Risk and Sequencing Rationale（260705-github-kanban-sync）

上流入力: [bolt-plan.md](bolt-plan.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[raid-log.md](../../ideation/feasibility/raid-log.md)

## 順序付けの根拠

順序は **dependency-first** である（B001 → B002 → B003 = U001 → U002 → U003 の topological 順そのまま）。
依存 DAG が直線で分岐を持たないため、WSJF などの経済的スコアリングを適用する余地がない（heuristic 参照: Reinertsen CD3 / SAFe WSJF は「順序に選択肢がある場合」の道具である）。

## walking skeleton の位置（topological 順との乖離ではない）

walking skeleton は先頭の B001 ではなく **B002** に置く（delivery-planning-questions.md Q4 = A）。
Bolt の実行順は topological 順から変えていない。変えたのは skeleton マーカーの位置だけである。
理由: B001 は `intents.json` へのスキーマ追加というデータ前提の整備であり、アーキテクチャ層を貫かない。B002 が「ローカルスキャン → GraphQL → board 表示」の全層を貫く最小 end-to-end スライスであり、Cockburn の walking skeleton の定義に合致する。

## リスクと順序の関係

| リスク（raid-log 参照） | 対応する Bolt | 扱い |
|---|---|---|
| R01（GraphQL rate limit / スキーマ変更） | B002 | skeleton として最初に実データで検証する。失敗は halt-and-ask |
| I01（project scope 未付与）、org project 未作成 | B002 の前提 | B002 着手前の人間操作（external-dependency-map.md） |
| R03（hook レイテンシ） | B003 | B002 で CLI の実行時間を実測してから hook 化する順序が安全側 |
