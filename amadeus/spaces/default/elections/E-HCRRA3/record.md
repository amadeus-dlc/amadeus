# Election Record — E-HCRRA3

- question: 260720-hold-choice-resolution(#1267)RA Q3: tie の既存二値(adopted/rejected)と choice 指定の共存形は?

実測コンテキスト: HOLD_RESOLUTIONS.tie = {adopted, rejected}(:70)。t236 の既存ピンは block 経路のみで tie の二値を直接ピンするテストは不在(RE 実測)。E-TCRCG=A は「hold 裁定行の二値表現維持」を裁定したが、その主対象は当時の全 hold 共通語彙 — tie 固有の語彙集合の増減は未裁定。二値の tie における意味論は「多肢で adopted が何を指すか」が曖昧(#1267 の元問題)。

各自実測確認のうえ GoA 付き投票。

裁定: 採用
- 留保(e3, GoA2): 置換は tie 限定とし block/discussion/quorum の語彙は不変を要件に明記。エスカレーション(Q1 判定に関わらず束ね)は B 選択肢の記載どおり必須手順として RA 成果物に固定。
- 留保(e1, GoA2): 除去は tie 語彙に限定し(block/discussion/quorum の二値は E-TCRCG=A どおり不変)、受理域縮小につき Q1 判定に関わらずユーザーエスカレーションへ束ねる(選択肢文の規定どおり)。
- 留保(e4, GoA2): design で『多肢 clarification 型の tie に二値(adopted/rejected)を使った場合』の描画・受理規則を明記すること — 勝者 choice が不定のまま裁定行が『採用』と描画される #1261 同族の曖昧受理を無音で通さない(警告 or choice 明示要求のどちらかを設計裁定)。二値が自然な単一提案型(s13-adoption)との使い分けを docs に1行
票タイムライン: 配信 2026-07-20T03:41:44Z → 配信 2026-07-20T03:41:44Z → 配信 2026-07-20T03:41:44Z → e3 2026-07-20T03:42:49Z → e1 2026-07-20T03:43:13Z → e4 2026-07-20T03:46:28Z → 開票 2026-07-20T03:46:55Z
GoA[E-HCRRA3]: 1x0 2x3 3x0 4x0 5x0 6x0 7x0 8x0

---
## Leader 注記(2026-07-20)

choice 分布: B(tie のみ choice 指定へ置換)= 2票(e3 GoA2, e1 GoA2)/ A(共存)= 1票(e4 GoA2)。**勝者 choice = B(2-1)**。CLI の裁定行は choice 非表示(leader tree の CLI が pre-#1268 のため)。B は受理域縮小 = ユーザー可視契約の変更につき、選択肢文の明記どおり**ユーザーエスカレーションを経て確定**する(e1 の E-HCRRA1 留保「Q3=B なら Q1 該当へ反転」も同時発動)。エスカレーション結果は本注記の下に追記する。

### エスカレーション結果(2026-07-20)

ユーザー承認: **B(置換)で確定** — tie の受理語彙を choice 指定のみとし、二値(adopted/rejected)は tie では受理しない(block/discussion/quorum の語彙は不変)。承認は leader セッションの AskUserQuestion 回答(03:47Z 台)による。e1 の E-HCRRA1 留保(Q3=B なら Q1 該当へ反転)は本承認により充足。
