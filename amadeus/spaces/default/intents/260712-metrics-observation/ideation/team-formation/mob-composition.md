# Mob Composition — metrics-observation

- **編成**: conductor(e2)+ builder サブエージェント fan-out(規模は units-generation/delivery-planning で確定 — 単一〜少数 Unit 見込み)。mob(常時同席)編成は採らない: 本 intent は計測・保存の独立性が高く、swarm/worktree 隔離の非同期並行が house 標準(cid:parallel-bolts)
- **並行度**: 同時アクティブ builder ≤4/intent(#868)。ファイル交差時は c6 直列化
- **レビューボトルネック回避**: 実装 PR 1名レビュー体制(2026-07-11 補正)+レビュー要員2名以上の常時確保(claude-role-model 規則1)
- **プロンプト定型**: E-L65(同期完遂・モニタ待ち禁止)+c2(隔離規律)+E-L59-3(逸脱は実装前停止)を全ディスパッチに明記
