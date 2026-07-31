<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
2026-07-30T12:49:04Z — #1711 の現挙動は t186:351/t116:380 の verbatim ピン+:3052「Zero behaviour change」コメントで仕様として3重固定されており、engine 側修正(候補A)はテスト契約の明示改訂を要する。方式裁定は requirements 段へ送る(implementation-deviation-election 準拠)。
2026-07-30T12:49:04Z — 差分リフレッシュを base 22ee27dbe(祖先性 exit 0)→ observed 278d61d8e(34 commits)で実施。Developer scan → Architect 合成の直列2サブエージェント(c3 準拠)。Architect が Developer 引用の相違5件(default: :6182、stage-protocol :898、新規 core tool 3件(5件は誤)、technology-stack「6 sensors」は履歴節内、code-structure :462 は非陳腐)を独立再実測で是正して反映。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
2026-07-30T12:49:04Z — intent birth 時に engine の select-intent 後、SKILL 記載の amadeus-utility.ts next --new-intent が #1736 のとおり Usage エラーになる経路を目視確認し、正所有者 amadeus-orchestrate.ts next --new-intent で回避して birth 成功(#1736 のライブ再現として requirements の一次材料)。
2026-07-30T12:49:04Z — 宣言センサー3種(required-sections / upstream-coverage / answer-evidence)は codekb 出力が sensor filter に構造不適合のため発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch)。代替検証を conductor が実施: 成果物10点の実在 ls、現在マーカー line3 全9一致、旧現在マーカー残存0、conflict-marker 正準3語彙 grep(ヒット2件はいずれも歴史節の語彙引用と実測確定)、H2 floor、git diff --check clean。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
2026-07-30T12:49:04Z — #1711 修正方式: 候補A(engine で degrade 時に実 unit 名解決 — stage-protocol.md:898 の unchanged 契約と整合するがテスト契約改訂を伴う)vs 候補B(reviewer-runtime 側解決 — テスト無傷だが層の逆転)。requirements で裁定する。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
