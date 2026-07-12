# Team Allocation — metrics-observation(Construction)

- conductor: e2(継続)。実装: builder サブエージェント(worktree 隔離)。
- ディスパッチ定型(全 Bolt): E-L65(同期完遂・モニタ待ち禁止)+c2(隔離規律・本線絶対パス非混入)+E-L59-3(逸脱は実装前停止)+E-L59-1(lcov 列挙チェック: 配線行・catch/brace・exit 隣接)+bun-spawn-env-snapshot。
- レビュー: 実装 PR 1名(leader 割当、e2 除外)。Bolt 1 はスケルトンゲートのため PR レビュー+人間ゲートの二段。
- 並行度: 直列計画のため同時アクティブ builder は常時1(≤4 制約内で余裕 — 他 intent への融通可)。
