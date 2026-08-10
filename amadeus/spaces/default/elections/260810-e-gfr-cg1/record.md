# Election Record — E-GFR-CG1

- question: 260810-grilling-frontier-resync Bolt 1 PR #2828 の外部レビュー指摘(CodeRabbit、Major)への対応裁定 — 設計逸脱クラス。指摘: grilling-protocol.md の overlay で、回路遮断器到達時の『未提示質問』の扱いが未規定。§2.5 はラウンド内の全質問を提示前に空 [Answer]: として questions ファイルへ追記する契約(FR-PROTO-9 / BR-U1-7 の1問1件)だが、遮断器の残り枠がラウンド全体より小さい場合、追記済み・未提示の空タグが残り、stage-protocol §3 Step 4 の空タグ検査が遮断器後にそれらを再提示しうる(silent 打ち切り禁止と矛盾する再開経路)。承認済み BR-U1-5(遮断器)/ BR-U1-7(1問1件)はこの境界を規定していない — 新契約条項の追加は設計判断。choice 1 = 追記前ゲート形: 残り枠でラウンド全体を提示できない場合、そのラウンドの質問を questions ファイルへ追記せず、frontier を未解決として C-4(合意サマリ)へ渡し、未完走 frontier を開示する1段落を overlay §2.4(遮断器)へ追加する(CodeRabbit 提案準拠 — 追記と提示の原子性を保ち、空タグ残骸ゼロ)。choice 2 = 対応見送り: 本 Bolt では追加せず、レビュースレッドへ理由(境界ケースの契約化は別 enhancement)を返信して未解決のまま申し送る。choice 3 = 別案(留保に具体形を記す)。検証対象: PR #2828 の grilling-protocol.md §2.4/§2.5 実文、stage-protocol.md §3 Step 4 の空タグ検査の実在、BR-U1-5/7(record の business-rules.md)に当該境界規定が無いこと

裁定: 追記前ゲート形を追加(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): 追加する段落には『残り枠がラウンド全体に満たない場合、遮断器は数値上限より手前のラウンド境界で発火しうる(count は目標でなく上限 — §2.1)』を1文明記し、実装者が数値上限ちょうどまで部分ラウンドを提示する解釈へ流れないようにすること。
- 留保(subagent-2, GoA2): choice 1 の段落追加は、cid:code-generation:c1-external-review-contract-change に従い上流 FD(business-rules.md の BR-U1-5)への明示改訂+申告付き逸脱として同一変更で反映すること。あわせて追加段落は『残り枠がラウンド全体に満たない場合、そのラウンドは追記も提示もしない(ラウンドは全体提示か非提示かの二値)』という原子性の明文として書き、§2.4 既存文の『an unasked frontier is disclosed or it is asked』および BR-U1-5 の『提示済み全ラウンドの合計』という計数基準と整合させること — 追記抑止だけを書いて計数基準の原子性を明文化しないと、同じ曖昧さが計数側へ移るだけになる。
票タイムライン: 配信 2026-08-10T09:33:39Z → 配信 2026-08-10T09:33:39Z → subagent-1 2026-08-10T09:35:10Z → subagent-2 2026-08-10T09:36:16Z → 開票 2026-08-10T09:45:30Z
GoA[E-GFR-CG1]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
