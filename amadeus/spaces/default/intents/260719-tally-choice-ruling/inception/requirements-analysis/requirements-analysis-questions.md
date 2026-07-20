# Requirements Analysis Questions — 260719-tally-choice-ruling

> **E-OC1 判定ヘッダ**: Q1〜Q4 は未決の設計判断につき**エージェント選挙で裁定**する(leader ディスパッチ 22:28:13Z「修正方式は requirements で選挙依頼 — 単独決定禁止」)。[Answer] は裁定受領後にのみ記入(election-answer-after-ruling / no-election-judgment-gate)。選挙不要判定の質問なし。
> 選挙依頼送信: leader へ 2026-07-19T22:41Z 頃(agmsg)。選挙: E-TCRRA1〜4(/amadeus-election CLI、blind 配布 22:42:51-52Z → 開票 22:44:53Z/22:45:34Z、各 3-0 採用)。裁定通知受領: 2026-07-19T22:45:57Z(agmsg)。record: leader ブランチ `4a73cd901` の elections/E-TCRRA{1..4}/record.md(e1 直接実読 — 留保7件全文確認: Q1×3 / Q2×0 / Q3×2 / Q4×2)。

上流入力(consumes 全数): business-overview.md(N/A — 不参照根拠は requirements.md 冒頭注記)、architecture.md、code-structure.md(実参照は requirements.md §2)

## Q1. choice 勝者選出方式(tally の裁定導出)

背景(RE 実測、re-scans/260719-tally-choice-ruling.md): `tally`(model.ts:321)は GoA favor/against のみで adopted/rejected を決め、choiceInternalNo を不参照(:334-335)。org.md の GoA 集計規則 (i)「1-3・6=賛成側として多数決」は本来 choice 別母集団に適用されるべきもの。E-GMEBT 実データ: choice2:2票 / choice1:1票(全票 GoA2)で正 = choice2(不採用)、現行 = adopted 誤描画。

選択肢:
A. **choice 単純票数の多数決で勝者 choice を決定し、GoA は成立判定の軸として分離**(勝者決定 = 票数、8(block)1票で成立保留・5が2票以上で追加議論等の既存 GoA 規則 (iii)(iv) は全票横断で適用)— E-GMEBT のユーザー裁定(choice 2-1 で不採用)と一致する読み
B. choice 別に賛成側 GoA(1-3,6)票数を数えて勝者決定(GoA を勝者選出にも使う — 棄権 4 の choice 票を勝者選出から除外する効果)
C. その他(note に方式明記)

[Answer]: A — E-TCRRA1 裁定(2026-07-19 開票 22:44:53Z、3-0 採用、GoA 2x3)。choice 単純票数多数決+GoA 成立軸分離。留保転記3件(全票 GoA2、要旨収斂 = GoA4 棄権票の除外明文化): (e4)『GoA 4(棄権)票の choice は勝者選出の母集団から除外することを design で明文化 — 規則 (v) 定足数除外との整合。単純票数を無条件全票と読むと既存規則と衝突』 (e2)『棄権票の扱いを design で明文化 — GoA 4 の ballot が持つ choice は勝者選出母集団から除外(org 規則 (v) の choice 軸への一貫適用)。明文化しないと「棄権だが choice 欄は埋まっている」票の扱いが実装者判断に落ちる』 (e3)『GoA4 票は org 規則の定足数除外と整合させ choice 多数決の母集団からも除外することを要件文で明記 — 「GoA は成立判定軸として分離」だけでは棄権票の choice が勝者選出に数えられる読みが残る』。

## Q2. hold 分岐(tie 等)の choice 軸再定義

背景: 現行 tally の hold 系分岐(quorum 不足・block・discussion-needed)は GoA 軸で定義。choice 多数決導入後、**choice 同数 tie** の扱いが新たに必要。escalation-canonical (1)「選挙の可否同数」はユーザーエスカレーション事項。

選択肢:
A. choice tie は hold(人間エスカレーション)へ倒す — 正準リスト (1) と整合。既存 hold 分岐(quorum/block/discussion)は GoA 軸のまま維持し、tie 判定だけ choice 軸を追加
B. choice tie は GoA 賛成側合計の多い方を勝者とする(tie-break を機械化、hold は現行分岐のみ)
C. その他(note に方式明記)

[Answer]: A — E-TCRRA2 裁定(2026-07-19 開票 22:45:34Z、3-0 採用、GoA 1x3、留保なし)。choice tie は hold で人間エスカレーション(正準リスト (1) 整合)。既存 hold 分岐(quorum/block/discussion)は GoA 軸のまま維持。

## Q3. TallyResult 型拡張の形

背景: 現行 `TallyResult`(model.ts:312-314)は `outcome:"adopted"|"rejected"`+GoaCounts のみで多肢を表現不能。型変更は rulingText(record.ts:107)・verify(election.ts:440 recompute 比較)・t234/t238 fixture へ機械的波及。

選択肢:
A. **winner(choiceInternalNo+label)+choice 別票数内訳+既存 GoaCounts を保持**し、outcome は winner から導出(record.md の裁定行に勝者 choice label を描画 — 監査可能性最大、波及も最大)
B. winner フィールドのみ追加(内訳は ledger から再導出可能として持たない — 波及最小)
C. その他(note に方式明記)

[Answer]: A — E-TCRRA3 裁定(2026-07-19 開票 22:45:34Z、3-0 採用、GoA 1x1 2x2)。winner(choiceInternalNo+label)+choice 別票数内訳+GoaCounts 保持。留保転記2件: (e4, GoA2)『内訳のフィールド名・形は e2 intent の per-voter 最新解決(E-BFARA2=A)後の母集団を数える前提で設計 — amend 導入後に「どの票を数えたか」が内訳の意味を変えるため、design で母集団定義を1文固定する』 (e3, GoA2)『内訳は choice 別の単純票数のみに限定(choice×GoA のクロス分布は持たない)— 監査可能性を確保しつつ型と fixture の肥大を抑える』。

## Q4. unknown-choice 受理検証のスコープ(e4 隣接ギャップ)

背景: Ballot.parse(model.ts:184-204)の5分類に choice 実在照合なし(:198 で無検証採用)— unknown-voter と対称の欠落。ただし e2 の 260719-ballot-failclosed-amend が同じ5分類ラダーへ invalid-timestamp/unknown-ref 等を追加予定(E-BFARA1/3 裁定済み)で、同一 PR に含めると分類ラダーの統合形が e2 の再接地負担になる。

選択肢:
A. 同一 PR で unknown-choice 分類を追加(same-root-inventory の前者。e1 先行着地につき e2 が再接地時に自分の分類を統合 — 直列合意済みの順序と整合)
B. Issue 化のみ(e2 の Ballot.parse 変更バッチへ委譲 — 分類追加を1箇所に集約)
C. その他(note に方式明記)

[Answer]: A — E-TCRRA4 裁定(2026-07-19 開票 22:45:34Z、3-0 採用、GoA 1x1 2x2)。同一 PR で unknown-choice 分類を追加。留保転記2件: (e4, GoA2)『分類ラダー拡張時、スキーマコメントに分類順序の規約(現行5分類の順序+新分類の挿入位置)を明記し、e2 再接地時の統合が機械的になるようにする』 (e2, GoA2)『unknown-choice の挿入位置を「識別子の検証 → 内容の検証」の順序原則で明示 — unknown-voter 直後(識別子系)へ置けば、e2 再接地時に追加する invalid-timestamp(内容側先頭、E-BFARA1)との統合が機械的になり分類ラダーの順序衝突が消える(e2 AD の ADR-4 と同一原則)』。
