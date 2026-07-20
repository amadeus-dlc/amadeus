# Business Rules — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## BR-1: Ballot.parse の分類順(FR-1、NFR-1、ADR-4)

parse-failure → unknown-election → unknown-voter → **invalid-timestamp** → goa-out-of-range → reservation-missing。順序は「識別子の検証 → 内容の検証」で、invalid-timestamp は内容側先頭。fail-closed 順序を関数内コメントで明文化し、複数不正 ballot のエラー決定性をテストで固定。

## BR-2: invalid-timestamp の判定(FR-1)

SUBMITTED_AT_RE 不一致 **または** new Date が NaN → err("invalid-timestamp")。受理後の normalizeAt(election.ts:334)は恒等 — 残置+恒等コメント(ADR-1、E-BFARA1 e4 留保への設計回答)。

## BR-3: amend の受理(FR-3、E-BFARA3)

- parse 段: kind==="amend" は ref の3フィールド(electionId/voter/submittedAt)の型・様式検査(submittedAt は BR-2 と同じ二段検証)。欠落・不正は parse-failure。
- store 段(appendBallot、dup 判定 store.ts:131-133 の直後): ref が accepted(ballots+late)内の**同一 voter の既存 ballot**(original または先行 amend)と electionId/voter/submittedAt の3点一致することを照合。不在 → err("unknown-ref")(loud、CLI は storeFail 経路で表示)。
- ADR-5 不変: original は上書きせず共存。timeline は既存分岐(store.ts:167)で "ballot amendment: <voter>"。

## BR-4: per-voter 解決(FR-4、E-BFARA2、ADR-3 改訂版)

`resolveBallots(ballots)`: voter ごとに submittedAt 最大の1票、同時刻は amend 優先。適用点は AD 適用点表 #1〜#3・#5 の全数(tally 内部 / handleVerify の GoaFreq :447・checkGoaLine :448・verifyReservations :450・verifySelf :456 / handleRender :372→renderPersistDraft :386)。#4 materialize は blind lift 契約(非適用)。resolver は冪等。

## BR-4b: classifyLate / late レーンとの整合(FR-4 (c) の確定 — AD 逐語継承)

AD component-methods.md の確定を FD 契約として固定する: 「classifyLate は受理時分類のため非解決(素の ballot 単位)— late lane の amend も post-tally 到着なら late のまま」。すなわち:

- classifyLate(model.ts:296-298)は resolveBallots を**適用しない** — 受理時点の個別 ballot の submittedAt と talliedAt の比較のみ(kind 非区別の現行挙動を維持)。
- post-tally に到着した amend は late lane(store.ts:138-158 の分岐)へ入り、tally の fixed set(materialize 済み)には影響しない — 裁定の再計算は人間の再審判断(GoA 8 late の reexamRequired 経路は現行のまま)。
- FR-4 (c) の受け入れ根拠: late lane の amend が resolved 母集団(#1〜#3・#5)に混入しないこと(fixed set は tally 時点で確定済み)をテストで固定。

## BR-5: 後方互換(FR-1(d)、FR-3(a)、NFR-3)

kind 欠落 ballot・既存 mint 形 submittedAt の挙動完全不変。既存 corpus(実装時点の glob 全数)への遡及 sweep で両側実証(FR-2 — 固定件数ループ禁止)。

## BR-6: 落ちる実証(FR-2、E-GMECG 追補)

fix コミット後に pre-fix 面切替(checkout <fix コミット SHA 明示>)で赤を実測 → 復元。注入は実行時消費行へ(inject-runtime-consumed-lines)。ケース: __NOW__(Date NaN)/ 2026-07-19(日付のみ)/ ms 形 / TZ オフセット形 / 2026-13-45T99:99:99Z(regex 通過し得ない非実在日時=regex 段で拒否されることの確認)。
