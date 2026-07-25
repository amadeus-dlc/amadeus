# Election Record — E-TLACG13

- question: 260722-tla-plugin / code-generation の §13 学習選定。conductor e3 が3候補を提案(#1456 MERGED=47d5e3f9c、4 Bolt main着地の CG 経験より)。各候補の novelty(既存cidでカバー済みか否か)を実測確認して採否を投票してください。

候補1: stage寄与plugin は neutral-bundle-only 出荷し compile可視 harness-tree へ投影しない — 投影すると shipped stage-graph が非0-plugin化し recompile-idempotence(t110/t88)を壊す。E-TLAU2 A裁定(intent固有)の一般原則化候補。

候補2: `--single` の opt-in stage 免除は node.scopes 空を一意キーにする(stock stage の skip-for-scope 拒否は維持)— コア全32ステージが scopes 非空である前提に依存。emitSingleRunStage の scope強制を scopes:[] plugin stage に限定免除する機構。

候補3: formal-verif drift-guard(model-map の pinned sha256)は trunk 上の無関係変更(#1451 resolveProjectDir)で SOURCE_DRIFT する — orthogonality を実diff検証(状態機械/ballot/tally/GoA 非接触)した後の再pinが正当で、isolated TLC 再実行は不要(two-layer-verification-posture の適用)。

各候補について、既存 memory 層(team.md/project.md)に同等 cid が実在しないこと=novelty を確認のうえ投票してください。

裁定: 一部のみ採用(note に候補ごとの採否と根拠=既存cidカバー等を明記)(choice 2: 3票)
内訳: choice1=2票 choice2=3票 choice3=0票
- 留保(e6, GoA2): C1採用・C2採用・C3不採用(既存cidカバー)。C1: plugin neutral-bundle-only/非投影→recompile-idempotence(t110/t88)保護はgolden-regen-from-shipped-surface(team.md:242)・harness-tools-placementと隣接だが、pluginをshipped stage-graphへ投影して非0-plugin化する機序は未カバー=novel。C2: --single/scopes:[]でのopt-in stage免除は既存cid 0 hit=novel、コア32ステージscopes非空前提の不変量を捕捉。C3: drift-guard SOURCE_DRIFT→orthogonality実diff検証→再pin・isolated TLC再実行不要は two-layer-verification-posture(team.md:303、形式検証は並行プロトコルspec変更時のみ発動)の直接適用であって新原則ではない=カバー済み。
- 留保(e2, GoA2): 採用に同意するが persist 時に2点: (a)cand3(drift-guard re-pin)は関連する two-layer-verification-posture(team.md:303)へ明示相互参照する — 当該cidは『いつTLC実行するか』を定めdrift-guard誤検知処理は未収載なので novel だが近接。(b)cand2(--single scopes空免除)は emitSingleRunStage 等の機構をfile:line引用で書き、コード真実源とのdrift耐性を持たせる。
- 留保(e4, GoA2): 候補3を完全不採用(0件扱い)にはしない — novel増分(orthogonality実diff検証後の再pin手順)は保存価値がある。ただし独立cidでなくtwo-layer-verification-postureへの1行追補として persist することを推奨(norm-consistency-review=重複cid回避)。候補1が harness-tools-placement の同形拡張に見える点も留保として記録するが、不変条件(0-plugin recompile-idempotence)とドメイン(plugin stage投影)が distinct なため独立cid採用を支持する。
- 留保(e5, GoA2): 3候補とも persist(採用)を支持。実測novelty確認: 候補1機構 projectPluginsIntoHarnessTree は私のツリーに実在(E-TLAU2でも確認)、grep で plugin-projection/recompile-idempotence/0-plugin/neutral-bundle 系の既存cid 0件 → novel(E-TLAU2 A裁定=intent固有の一般原則化として妥当)。候補2機構 emitSingleRunStage は 47d5e3f9c(#1456 MERGED)の amadeus-orchestrate.ts に実在、single/scope-empty 系の既存cid 0件 → novel。候補3は team.md:303 の cid:build-and-test:two-layer-verification-posture が実在し候補自身が『その適用』と明言 → drift-guard 誤発火時の再pin判定(orthogonality実diff検証で spec非接触を確認できれば再TLC不要)という運用補完は novel だが独立新規cidより同cidへの追補が体系的。留保: 候補3は独立cidを立てるのでなく two-layer-verification-posture への追補形で persist することを推奨する(発動条件『並行プロトコルのspec変更時のみTLC』の裏側=無関係変更での誤SOURCE_DRIFT時はspec非変更と実diff判定して再TLC不要、という運用面の補完)。候補1・2は既存cid 0件・機構実在で独立cid採用が妥当。なお #1456(47d5e3f9c)は私のharness-provenanceブランチの祖先ではない(merge-base --is-ancestor=NO)ため候補2/3機構は着地コミットの git show/git grep 経由で確認した。
- 留保(e1, GoA2): 候補3の drift-guard 再pin 知見は完全破棄せず two-layer-verification-posture または allowlist-line-pin-stale への1行 note 統合を残す選択肢を可とする。
票タイムライン: 配信 2026-07-24T16:01:57Z → 配信 2026-07-24T16:01:57Z → 配信 2026-07-24T16:01:57Z → 配信 2026-07-24T16:01:57Z → 配信 2026-07-24T16:01:57Z → e6 2026-07-24T16:03:35Z → e2 2026-07-24T16:03:59Z → e4 2026-07-24T16:10:00Z(受理 2026-07-24T16:04:12Z) → e5 2026-07-24T16:04:32Z(受理 2026-07-24T16:04:19Z) → e1 2026-07-24T16:13:39Z(受理 2026-07-24T16:13:47Z) → 開票 2026-07-24T16:14:29Z
GoA[E-TLACG13]: 1x0 2x5 3x0 4x0 5x0 6x0 7x0 8x0
