# Election Record — E-SRF-RES13

- question: intent 260730-skill-reviewer-fixes / reverse-engineering ステージの §13 学習選定。diary(amadeus/spaces/default/intents/260730-skill-reviewer-fixes/inception/reverse-engineering/memory.md)から surface された候補は次の4件。

[c1](Interpretations) #1711 の現挙動は t186:351/t116:380 の verbatim ピン+amadeus-orchestrate.ts:3052「Zero behaviour change」コメントで仕様として3重固定されており、engine 側修正(候補A)はテスト契約の明示改訂を要する。方式裁定は requirements 段へ送る(implementation-deviation-election 準拠)。

[c2](Interpretations) 差分リフレッシュを base 22ee27dbe(祖先性 exit 0)→ observed 278d61d8e(34 commits)で実施。Developer scan → Architect 合成の直列2サブエージェント(c3 準拠)。Architect が Developer 引用の相違5件を独立再実測で是正して反映。

[c3](Deviations) intent birth 時に engine の select-intent 後、SKILL 記載の amadeus-utility.ts next --new-intent が #1736 のとおり Usage エラーになる経路を目視確認し、正所有者 amadeus-orchestrate.ts next --new-intent で回避して birth 成功(#1736 のライブ再現)。

[c4](Deviations) 宣言センサー3種は codekb 出力が sensor filter に構造不適合のため発火不能(既存 cid:reverse-engineering:re-sensors-codekb-filter-mismatch のとおり)。代替検証を conductor が実施。

問い: memory 層(project.md 等)へ persist する採用集合はどれか。判断材料: 既存 cid との重複は persist しない(c4 は既存 cid の再演。c2 は既存 c3/c1 規範の実践記録。c3 は #1736 の Issue/requirements 材料であり intent record に記録済み。c1 は本 intent の requirements で裁定される intent 固有事項か、それとも「テストで仕様ピンされた挙動の変更はテスト契約の明示改訂を伴う」級の一般則として persist に値するか)。各候補の実在根拠は diary と codekb(architecture.md / code-quality-assessment.md の現在節)で実測確認すること。

裁定: c1 のみ採用 — 「テスト verbatim ピン+設計コメントで固定された挙動の変更は、仕様裁定とテスト契約改訂を要件段で明示してから行う」を project 層へ persist(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票
- 留保(subagent-2, GoA2): persist する c1 の本文には、既存 cid:requirements-analysis:implementation-deviation-election(実装段での逸脱停止。team.md:66 は『要件どおりでは既存テストが壊れる』を明示的に射程に含む)および cid:code-generation:cg-invariant-conflict-explicit-revision(project.md:260、CG 段での不変条件の明示改訂)との差分面 — すなわち『RE/scan 段でテストの verbatim assertion を仕様のピンとして認定し、方式裁定を requirements 段へ上流ルーティングする』面 — を明記し、#1711 の未決の方式裁定(候補A/B)自体は persist 文に書かないこと。差分面の明記を欠くと第4の近重複 cid になる。
- 留保(subagent-1, GoA2): persist 文は適用条件を『現挙動がテストの verbatim ピンや設計コメントで明示的な契約として固定されている場合』に限定し、brownfield 修正一般へテスト契約改訂セレモニーを義務化しない範囲限定を明記すること。
票タイムライン: 配信 2026-07-30T12:50:52Z → 配信 2026-07-30T12:50:52Z → subagent-2 2026-07-30T13:05:00Z(受理 2026-07-30T12:52:54Z) → subagent-1 2026-07-30T12:56:00Z(受理 2026-07-30T12:52:54Z) → 開票 2026-07-30T12:53:12Z
GoA[E-SRF-RES13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
