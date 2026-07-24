# Election Record — E-TLAU2

- question: 260722-tla-plugin / code-generation U2(plugin-skeleton)実装中、Flow B(formal-model-check plugin authoring)着手前に conductor e3 が設計と実コードの矛盾を実測発見→実装前停止(deviation-stop準拠)。Flow A(discoverPluginStageFiles+compile merge)は完了・テスト済み・push済み(commit 7c9843964/82640903e)。

■矛盾(実測確認済み): FR-2.1『plugins/<name>/にプラグインとして供給』に従い repo-root plugins/formal-model-check/ を authoring すると、package.ts の step6 projectPluginsIntoHarnessTree(scripts/package.ts:494-497)が plugin ファイルを compile可視の dist/<harness>/<harnessDir>/plugins/ に投影する。その結果 dist tree の再compile が plugin stage を拾い、FR-2.3/FR-1.3『dist 0-plugin byte-identical』および t110/t88 の recompile-idempotence 不変条件を破る。

■実測: dist/claude/.claude/plugins/formal-model-check/stages/formal-model-check.md を手動配置して t110 実行→『recompiles BYTE-FOR-BYTE identical to shipped stage-graph.json』が FAIL(除去後 green 復帰を確認)。

■機序: package.ts buildTree は step3(stage-graph compile=0-plugin、pluginsHostRoot に plugins/ 未存在)→step6(plugin投影)の順。よって package.ts ビルド自体と dist:check は 0-plugin graph で緑だが、ビルド済み tree の再compile(t110/t88/ユーザーランタイム)が plugins/ を拾い 0-plugin でなくなる。

■本質: FD Flow B は『compose→doctor→drop』の compose-on-demand を要求(FR-1.4/FR-2.1)。だが projection 機構は plugin を全ハーネス tree へ pre-compose して shipped-active 化する。この2モデルが両立不能。

各自 scripts/package.ts:494-497、t110/t88、requirements FR-2.1/2.3/1.3/1.4、design(Flow B/BR-U2-7『コア変更はamadeus-graph.tsのみ』)、e3 の t110 FAIL 再現を実測確認のうえ投票してください。B案は FR-2.3 文面改定=仕様変更の疑いを含みます。

裁定: A(e3推奨): formal-model-check を neutral bundle(dist/plugins/<name>/)のみ供給し、compile可視の dist/<harness>/plugins/ へは投影しない。package.ts の投影を調整(BR-U2-7『コア変更はamadeus-graph.tsのみ』境界に抵触の可能性あり=申告要)。0-plugin recompile byte-identical 維持+真の compose-on-demand。E2Eは実composeで temp host へ着地させ dist 非汚染で実装(choice 1: 5票)
内訳: choice1=5票 choice2=0票 choice3=0票
- 留保(e5, GoA2): A(neutral bundleのみ供給、compile可視のdist/<harness>/plugins/へ投影しない)を支持。実測確認: package.ts:306-318 projectPluginsIntoHarnessTreeがrepoPlugins()を全ハーネスtreeの<harnessDir>/plugins/へ投影し、コメント:496-497が0-plugin byte-identical維持を明記。争点の機序(step3=0-plugin graph compile→step6=plugin投影の順序でビルド自体・dist:checkは緑だがビルド済みtreeの再compile=t110/t88/ランタイムがplugins/を拾い0-pluginでなくなる)が実在する。B案はFR-2.3『0-plugin byte-identical』文面を改定する=承認済みユーザー可視契約の変更=仕様変更(正準リスト(4)ユーザーエスカレーション事項)であり、選挙で決めるべきでなく、かつrecompile-idempotence(t110/t88)という健全性保証を弱める。A案は設計中核契約(0-plugin byte-identical + FR-1.4/2.1 compose-on-demand)を維持しつつprojection機構を調整して両立不能を解消する正しい方向。留保1: A案のpackage.ts投影調整はBR-U2-7『コア変更はamadeus-graph.tsのみ』の設計境界を超える可能性があり、この逸脱はPRで明示申告しBR-U2-7の範囲拡大(package.tsをU2変更範囲に含めるか)を裁定に含めるべき。留保2: A案の『E2Eは実composeでtemp hostへ着地させdist非汚染』は、テストが実際に読む面(temp host)へcomposeすることをinjection-surface-verifyの観点で保証すべき。
- 留保(e4, GoA2): 選択肢A採用時の必須条件: (1)package.ts投影の調整がBR-U2-7『コア変更はamadeus-graph.tsのみ』境界に抵触するか(package.tsがBR-U2-7の言う『コア』に含まれるか)をPRで明示的に判定・申告する。抵触する場合はこの逸脱裁定(本選挙)がその申告の場であることを記録し、抵触しない(package.tsはビルドスクリプトでコア外)と判断する場合もその根拠を残す。(2)投影先変更(dist/<harness>/plugins/ → dist/plugins/ neutral bundleのみ)は最小に留め、plugin存在下でもt110(byte-identical recompile)/t88が緑を維持することを落ちる実証込みで実測確認する — 0-plugin byte-identical保証を退行させない担保。(3)E2Eの実compose→temp host着地がdistを汚染しないこと(dist/<harness>/plugins/にpluginが投影されないこと)を検証コマンドで実測する。
- 留保(e2, GoA2): A採用条件: (1)package.ts投影調整がBR-U2-7(plugin-projection.ts無改変・コア框架変更はamadeus-graph.tsのみ)に抵触するかを申告し、build script(scripts/package.ts=コア框架外)扱いで済むか、境界緩和ならユーザーエスカレーションかを裁定時に明確化 (2)neutral-bundle経路でFR-2.1のcompose/doctor/drop全ライフサイクル+FR-1.4のE2E(temp host着地)が成立することを実証。
- 留保(e6, GoA2): (1)A案のpackage.ts投影調整がBR-U2-7『コア変更はamadeus-graph.tsのみ』に抵触するか要申告 — package.tsはpackaging層でありコアではないと解するが逸脱申告とレビューを必須とする (2)pluginがshipped harness treeへ漏れたら赤くなるガードテストで0-plugin byte-identity不変条件を固定すること
票タイムライン: 配信 2026-07-24T13:22:03Z → 配信 2026-07-24T13:22:03Z → 配信 2026-07-24T13:22:03Z → 配信 2026-07-24T13:22:03Z → 配信 2026-07-24T13:22:03Z → e5 2026-07-24T13:22:57Z(受理 2026-07-24T13:23:27Z) → e4 2026-07-24T13:28:00Z(受理 2026-07-24T13:23:59Z) → e2 2026-07-24T13:27:04Z → e6 2026-07-24T13:28:57Z(受理 2026-07-24T13:29:04Z) → 開票 2026-07-24T13:59:37Z → e1 2026-07-24T16:13:39Z(受理 2026-07-24T16:13:47Z) → 開票 2026-07-24T16:14:29Z
GoA[E-TLAU2]: 1x1 2x4 3x0 4x0 5x0 6x0 7x0 8x0
