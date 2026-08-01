# Election Record — E-CPG-NDS13

- question: 260801-cg-plan-guard nfr-design(4 unit)の §13 学習選定。候補 c1(§12a の是正記録: C-ID 誤引用2連発は mechanism-cite-verify-at-draft の違反実例、I/O 過大主張の精密化は numbers-from-command-output-only / 検証可能主張の実例、consumes N/A 同根展開は E-SRCNRS13 実例)— いずれも既存 cid の実例で新規規則を導かないため 0 件を提案。反対材料があれば record(ND diary・15成果物の Review 節)を実測して投票。

裁定: 0件(c1 は既存 cid の実例扱い)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): 『否定形の性能主張』面のみ留保。U3 iteration 1 の Major(『approve 経路は既に audit を読む』の偽主張 →『新規呼び出し1箇所・新規 parse 実装 0・有界 ≤12』へ精密化)は、既存 cid では cid:requirements-analysis:absence-claim-grep-verify(不在主張の反証確認)と Forbidden の検証劇場条項の合成として吸収できるが、いずれも『検査機構の不在』『ゲート結果の非導出』を主語としており、性能設計の『新規 I/O ゼロ』のような否定形コスト主張を検証可能形(呼び出し箇所数・新設 parse 数・有界上限)へ言い換える規律を正面から名指してはいない。今回は U1/U2/U4 の同型主張(『追加 I/O ゼロ』『新規 I/O ゼロ』)がいずれも構造レビュー(read 系呼び出し棚卸し)という検証形とセットで書かれており実害ゼロ、かつ §12a が iteration 1 で捕捉して無音通過していないため、独立 cid 化は不要と判断する。同型の偽主張が別 intent で再発した場合は、次回 PM 蒸留ラウンドで cid:nfr-design 系への追補として再判定することを予約する。
- 留保(subagent-2, GoA2): 頻度面のみ留保: C-ID 誤引用は本ステージ内で2 unit 連続(U1 off-by-one、U3 誤ラベル)であり、単発の違反実例ではなく反復シグナルである。既存 cid:requirements-analysis:mechanism-cite-verify-at-draft は散文規則のまま起草者の自律に依存しており、2件とも捕捉したのは reviewer 側であって起草側のセルフチェックではない(無音通過はゼロだが、検出は reviewer 予算を2 iteration 消費した)。次回の週次蒸留ラウンドで、C-ID 等の canonical 表参照については『起草時に canonical 表を grep して照合する1手』を機械セルフチェック側へ寄せる案(E-SRCNRS13 が consumes 面で総当たり grep を定めたのと同型の、コンポーネント ID 面への横展開)を再判定することを予約する。今回は新規 cid を立てず 0件とする — 反復は2回であり、E-PM8 蒸留ラウンド第1回が高チャーン候補を『機械化 enhancement 起票のうえ着地後に縮約』と裁定した手順に倣い、規範追加より先に機械化の可否を測るべきだから。
票タイムライン: 配信 2026-08-01T11:58:41Z → 配信 2026-08-01T11:58:41Z → subagent-1 2026-08-01T12:50:00Z(受理 2026-08-01T12:00:27Z) → subagent-2 2026-08-01T12:55:00Z(受理 2026-08-01T12:01:25Z) → 開票 2026-08-01T12:01:51Z
GoA[E-CPG-NDS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
