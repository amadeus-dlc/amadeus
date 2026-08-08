# Election Record — E-SPR-FDS13

- question: intent 260807-stage-perf-report の functional-design ステージ §13 学習選定。diary は amadeus/spaces/default/intents/260807-stage-perf-report/construction/functional-design/memory.md(Interpretations 1 エントリ)。候補 c1: 恒等式(母集団検証)を設計するとき、複数ソース由来のカウンタを単一構造体へ平坦に束ねて恒等式の合算に使うと、互いに素な母集団の混在で恒等式が数学的に不成立になる — 恒等式に参加する部分集合を母集団別に層別し、「全数」「除外」の定義を設計段で確定してからテスト可能な契約にする(実測: FD iteration 1 BLOCKER — ExclusionCounts 平坦 7 フィールドの BR-14 恒等式不成立 → corpus/windowing/review の 3 グループ層別+恒等 W/M 分離で iteration 2 READY 閉包)。conductor の提案は「c1 を project.md へ persist(独立 cid または既存の数値検証ファミリ — ledger-count-mechanical-recalc / state-machine-cardinality-check — への追補)」— 根拠: 既存 cid は件数の機械再計算(過去実測値の転記)と状態機械の個数照合を縛るが、「恒等式の参加母集団の同一性を設計段で検証する」面は未被覆。反対考慮: 検証劇場 Forbidden(自己参照比較の禁止)や nfr-design:c7(断定的インベントリの後出し導出)の適用実績とみなせるか — 各自 diary・FD 成果物 3 点(domain-entities.md の母集団恒等節・business-rules.md BR-14)・project.md の関連 cid を独立に読み、GoA 付きで投票すること。

裁定: c1 を採用(persist)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 独立 cid を新設せず、既存の数値検証ファミリ(ledger-count-mechanical-recalc / state-machine-cardinality-check)への追補として、intent 固有の固有名(ExclusionCounts・BR-14 等)を落とした一般形で persist すること。
- 留保(subagent-1, GoA2): persist は独立 cid でなく既存の数値検証ファミリ(ledger-count-mechanical-recalc / state-machine-cardinality-check)への追補とし、intent 固有のフィールド名(ExclusionCounts 等)を落とした一般形で書くこと。
票タイムライン: 配信 2026-08-07T22:13:14Z → 配信 2026-08-07T22:13:14Z → subagent-2 2026-08-07T22:14:32Z → subagent-1 2026-08-07T22:14:36Z → 開票 2026-08-07T22:15:00Z
GoA[E-SPR-FDS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
