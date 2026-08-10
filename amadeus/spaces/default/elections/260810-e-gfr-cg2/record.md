# Election Record — E-GFR-CG2

- question: Bolt 2 (budget-sensor) の実装前停止ブロッカー: 刈りノード列挙節の write⇔check 非対称をどう解消するか。

【実測された事実(conductor 独立再実測済み)】
(1) 設計 BR-U2-2b(construction/budget-sensor/functional-design/business-rules.md:11)は、センサーの検出対象を questions ファイル本文中の見出し逐語『閾値未満として明示的に先送りした点』と規定する。出典は BR-U1-4(construction/protocol-core/functional-design/business-rules.md:12)と FR-PROTO-7(inception/requirements-analysis/requirements.md:25)。
(2) しかし着地済み U1 正本(PR #2828)は当該節を英語トークン "Deferred as below the threshold" として grilling-protocol.md:118 (§2.3) に規定し、その配置は『合意サマリ(§3, C-4)』である。当該日本語見出しは repo 全域で 0 hit(git grep -in '閾値未満として明示的に先送り' -- . はレコード成果物のみ hit、出荷面 0)。
(3) grilling-protocol.md:253 (§4 表)の Questions file 行(Grill me 列)が列挙する questions ファイル義務は『mode marker / one entry per question / blank [Answer] / write-back / justification line』のみで、列挙節は不在。stage-protocol.md の Step 3d・§8 接続段落も questions ファイルへ append するものとして justification line のみを名指す。
(4) 一方 components.md:31(承認済み AD)は『C3 → questions ファイル書き手(conductor): グリリングモードマーカーの1行契約と、超過記録行・刈りノード列挙節の様式』と規定し、列挙節を questions ファイル面に置いている。

【帰結】BR-U2-7 (iii) の missing-deferred-list(error)をこのまま実装すると、契約に完全準拠した grilling questions ファイルが全件 FAIL する恒久赤になる(検証劇場 Forbidden / cid:code-generation:c1-threshold-inside-observed-range に該当)。

【追加の制約(投票時に検証してほしい点)】Amadeus はフレームワークとして他プロジェクトへ配布される。『amadeus/**/*.md は日本語』は本プロジェクト固有のルール(ユーザーのグローバル指示)であり、フレームワークの契約ではない。出荷センサーが日本語逐語見出しを機械照合すると、他言語で questions ファイルを書く利用者の環境で構造的に恒久 FAIL する可能性がある。既存の他2トークン(モードマーカー・超過記録行)はいずれも言語中立な HTML コメントである。

各選択肢は『U1 正本(着地済み)への申告付き追補が必要か』『検出トークンは何か』『U2 の検査 severity』の3点で異なる。実測で裏取りしたうえで投票すること。

裁定: B(推奨): 言語中立マーカーへ統一して U1 へ追補(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票
- 留保(subagent-1, GoA2): B の U1 追補は出荷 protocol(ユーザー可視契約)へ questions ファイル書き手義務を新設する変更であり、エスカレーション正準リスト(4)の仕様変更に触れうる。追補の着地前に、追補内容(questions ファイルへも deferred 節+マーカーを書く義務の新設)をユーザーへ明示確認するか、少なくともゲート報告で申告付き逸脱として開示すること。あわせて、マーカー様式の正本は C1(U1)側に一意に置き、U2 は verbatim 参照のみとする(候補文の規定を弱めない)。
- 留保(subagent-2, GoA2): 追補は2つの列挙面へ同時に入れること — grilling-protocol.md §2.5 の Recording obligations 箇条(現行3項: :154 モードマーカー / :160 one entry per question / :165 超過記録行)と §4 表 :253 の Questions file 行(現行列挙: mode marker, one entry per question, blank [Answer], write-back, justification line)は、いずれも questions ファイル書込義務の全数列挙であり、片方だけの追補は同型の write⇔check 非対称を別箇所で再生産する(cid:requirements-analysis:enumeration-completeness-review)。あわせて、着地済み U1(PR #2828)への追補はユーザー可視契約の変更であるため申告付き逸脱として記録し、本裁定を出典に引くこと(cid:requirements-analysis:implementation-deviation-election)。また新トークンの正本様式は C1(grilling-protocol.md)側に単一定義として置き、U2 は verbatim 参照に留めること(既に BR-U2-2b / domain-entities.md:17 が採る C1 正本規律の継続)。刈り0件時もマーカー+節を必須とする点を追補本文に明記しない限り、Free セッションで missing-deferred-list の偽 FAIL が残る。
票タイムライン: 配信 2026-08-10T11:49:43Z → 配信 2026-08-10T11:49:43Z → subagent-1 2026-08-10T11:51:24Z → subagent-2 2026-08-10T11:51:59Z → 開票 2026-08-10T11:52:06Z
GoA[E-GFR-CG2]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
