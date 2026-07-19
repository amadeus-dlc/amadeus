# Requirements Analysis Questions — 260719-tally-choice-ruling

> **E-OC1 判定ヘッダ**: Q1〜Q4 は未決の設計判断につき**エージェント選挙で裁定**する(leader ディスパッチ 22:28:13Z「修正方式は requirements で選挙依頼 — 単独決定禁止」)。[Answer] は裁定受領後にのみ記入(election-answer-after-ruling / no-election-judgment-gate)。選挙不要判定の質問なし。
> 選挙依頼送信: leader へ 2026-07-19T22:4xZ(agmsg)。裁定受領・記入時に本ヘッダへ開票タイムスタンプを追記する。

上流入力(consumes 全数): business-overview.md(N/A — 不参照根拠は requirements.md 冒頭注記)、architecture.md、code-structure.md(実参照は requirements.md §2)

## Q1. choice 勝者選出方式(tally の裁定導出)

背景(RE 実測、re-scans/260719-tally-choice-ruling.md): `tally`(model.ts:321)は GoA favor/against のみで adopted/rejected を決め、choiceInternalNo を不参照(:334-335)。org.md の GoA 集計規則 (i)「1-3・6=賛成側として多数決」は本来 choice 別母集団に適用されるべきもの。E-GMEBT 実データ: choice2:2票 / choice1:1票(全票 GoA2)で正 = choice2(不採用)、現行 = adopted 誤描画。

選択肢:
A. **choice 単純票数の多数決で勝者 choice を決定し、GoA は成立判定の軸として分離**(勝者決定 = 票数、8(block)1票で成立保留・5が2票以上で追加議論等の既存 GoA 規則 (iii)(iv) は全票横断で適用)— E-GMEBT のユーザー裁定(choice 2-1 で不採用)と一致する読み
B. choice 別に賛成側 GoA(1-3,6)票数を数えて勝者決定(GoA を勝者選出にも使う — 棄権 4 の choice 票を勝者選出から除外する効果)
C. その他(note に方式明記)

[Answer]:

## Q2. hold 分岐(tie 等)の choice 軸再定義

背景: 現行 tally の hold 系分岐(quorum 不足・block・discussion-needed)は GoA 軸で定義。choice 多数決導入後、**choice 同数 tie** の扱いが新たに必要。escalation-canonical (1)「選挙の可否同数」はユーザーエスカレーション事項。

選択肢:
A. choice tie は hold(人間エスカレーション)へ倒す — 正準リスト (1) と整合。既存 hold 分岐(quorum/block/discussion)は GoA 軸のまま維持し、tie 判定だけ choice 軸を追加
B. choice tie は GoA 賛成側合計の多い方を勝者とする(tie-break を機械化、hold は現行分岐のみ)
C. その他(note に方式明記)

[Answer]:

## Q3. TallyResult 型拡張の形

背景: 現行 `TallyResult`(model.ts:312-314)は `outcome:"adopted"|"rejected"`+GoaCounts のみで多肢を表現不能。型変更は rulingText(record.ts:107)・verify(election.ts:440 recompute 比較)・t234/t238 fixture へ機械的波及。

選択肢:
A. **winner(choiceInternalNo+label)+choice 別票数内訳+既存 GoaCounts を保持**し、outcome は winner から導出(record.md の裁定行に勝者 choice label を描画 — 監査可能性最大、波及も最大)
B. winner フィールドのみ追加(内訳は ledger から再導出可能として持たない — 波及最小)
C. その他(note に方式明記)

[Answer]:

## Q4. unknown-choice 受理検証のスコープ(e4 隣接ギャップ)

背景: Ballot.parse(model.ts:184-204)の5分類に choice 実在照合なし(:198 で無検証採用)— unknown-voter と対称の欠落。ただし e2 の 260719-ballot-failclosed-amend が同じ5分類ラダーへ invalid-timestamp/unknown-ref 等を追加予定(E-BFARA1/3 裁定済み)で、同一 PR に含めると分類ラダーの統合形が e2 の再接地負担になる。

選択肢:
A. 同一 PR で unknown-choice 分類を追加(same-root-inventory の前者。e1 先行着地につき e2 が再接地時に自分の分類を統合 — 直列合意済みの順序と整合)
B. Issue 化のみ(e2 の Ballot.parse 変更バッチへ委譲 — 分類追加を1箇所に集約)
C. その他(note に方式明記)

[Answer]:
