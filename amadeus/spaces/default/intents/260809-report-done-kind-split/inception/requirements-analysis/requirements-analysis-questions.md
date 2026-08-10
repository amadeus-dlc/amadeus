# Requirements Analysis 質問票 — 260809-report-done-kind-split

上流入力(consumes 全数): business-overview / architecture / code-structure(codekb — RE 断面の参照元)。一次入力: RE 正本 `codekb/amadeus/re-scans/260809-report-done-kind-split.md`(7サイト分類・多義2サイト・方式比較)と Issue #2762(クロスレビュー2名 ESTABLISHED_WITH_REFINEMENTS)。

## 質問と裁定

3問すべて Intent autonomy `semi` の decide-question 梯子で裁定(AUTO_DECIDED・unreviewed)。#2762 は「forwarding loop 契約(kind で分岐)と engine emit の非整合の是正」= 文書化済み契約への回復であり仕様変更ではない。

### Q1. 修正方式(REFRAME/レビュー裁定材料 — 方式選択)

RE 実測: `done` は7サイト、うち `:5382`/`:5849` は多義(terminal/非terminal を単一 emit から出す)。判別子 `isFinal` は両サイトに既存。

- A: **terminal フラグ** — `done` に `terminal: boolean` を追加。多義2サイトは `isFinal` で分岐して terminal を設定、非終端(`:5765` と `advance` 経路)は `terminal:false`、終端4サイトは `terminal:true`。Stop hook `:932` を terminal 参照へ改訂。directive.ts 4箇所+テスト追加のみ・件数語ドリフト非波及
- B: 別 kind 新設(`committed`/`advanced`)— 型で分離。directive.ts 7箇所+既存テスト約15改訂+件数語ドリフト(nine/ten/seven/13)巻き込み
- X. Other (please specify)

[Answer]: **A** — terminal フラグ。根拠: surgical(触る面が B の約半分・件数語ドリフトという患部外欠陥を巻き込まない — E-PM5 系 surgical 規範+org.md Forbidden「要求されない変更を足さない」)。多義サイトの本質は「terminal か否か」の1ビットであり、型 union の増設より状態の明示化が意図に合う。誤読耐性(型分離=B が強い)のトレードオフは、conductor 契約側で `terminal` 参照を MUST として明記することで補う(下記 Q2)。

### Q2. conductor 契約(SKILL.md)の改訂形

方式 A は同 kind に boolean を足すため、SKILL.md の forwarding loop が `terminal` を読む契約を明示する必要がある。

- A: SKILL.md の directive 表の `done` 行と forwarding loop の停止規則を「`done` は `terminal:true` のとき STOP、`terminal:false`(report/advance の成功 ack)のとき continue」へ改訂。docs/reference 17-skill-system(英日)も同期。**件数語(ten/nine/seven)は本 intent では触らない**(別 Issue 候補として記録のみ)
- X. Other (please specify)

[Answer]: **A** — 単一の合理的形(執行クラスに近い)。SKILL.md 6面のうち逐語同一の5面+pi 別文言、docs/reference 6ファイル(英日3対)を同一変更で同期(stderr-addition-consumer-grep 型の消費者棚卸し = RE 済み)。件数語ドリフトは患部外(RE 仮説C)— Out of scope に固定し別 Issue 候補として記録。

### Q3. `:2987`(read-only latch の done)の扱い

RE: stop 自体は正しい(read-only コマンドは前進しない)が SKILL.md「completion summary を提示」文言は不適合。

- A: `:2987` は `terminal:true` とする(read-only 完了は真の turn 終端)— 分類は素直。SKILL.md の「completion summary」文言との軽微な不適合は本 intent では触らず Open questions へ
- B: `:2987` を別扱い(第3の状態)にする
- X. Other (please specify)

[Answer]: **A** — read-only latch は「このターンで完了・停止」であり terminal:true が最も素直。文言の精密化は患部外の軽微事項として Open questions へ(スコープ最小化)。

## 裁定の記録

- Q1〜Q3: Intent autonomy `semi` の decide-question 梯子で AUTO_DECIDED — 全問 `kind: decided / basisKind: agent-recommendation`(Q1=a-terminal-flag / Q2=a-sync-terminal / Q3=a-terminal-true)。reviewState = unreviewed — `amadeus-bolt list-auto-decisions` で後日検収可能
- ユーザー承認: 2026-08-10T00:00:00Z(semi 宣言の実 HUMAN_TURN「#2762 を self-fix intent で」+「このまま完走」に基づく engine 権限での自動裁定)

## 裁定の改訂(CG 実測による方式変更、2026-08-10)

- Q1 の当初裁定 A(terminal フラグ)は、CG 実装で builder が方式 B(別 kind `committed`)を選好し、Issue #2762 期待結果1が両案を正規の選択肢として提示している点・(a)別 kind の論拠(done を『完了のみ』へ意味論純化 / DONE_FIELDS allowlist 非緩和 / Stop hook 無改修 / 非終端は :5382/:5765/:5849 の3サイト)を根拠に、**方式 B へ改訂**する(semi 梯子裁定 `cg-2762-q1b-method-revise` = decided / agent-recommendation / b-adopt-committed)。RA FR-1〜FR-7 の記述は方式 A 前提だったが、B では: FR-1 = `committed` kind 新設(terminal フィールドでなく)/ FR-2/3 = 非終端3サイトを `committed` へ・終端4サイトは `done` 不変 / FR-4 = Stop hook 無改修(committed は report のみ発行・next は出さない)/ FR-5 = SKILL 8面+docs に committed 行追加・件数語は count-free 化で吸収 / FR-6/7 は不変。件数語ドリフトは B では count-free 化として同一変更で触れた(FR-7 の『件数語不変』は B 採用に伴い『count-free 化(値の断定を除去)』へ緩和 — 逆に硬い件数語を残さない方向で org.md Forbidden と整合)。

## 裁定改訂の provenance 訂正(2026-08-10)

上記「裁定の改訂(CG 実測による方式変更)」節の**前提は取り違えだった** — conductor は並行する別セッションの方式 B PR(#2767)を自分の builder の PR と誤認し、「builder が A→B へ逸脱した」と誤って結論して裁定を B へ改訂した。実際には本 intent の builder は方式 A を正しく実装(PR #2770)しており逸脱はなかった。

ただし**結論(方式 B 採用)は独立検証で正当**: 両 PR の実 diff を6軸で実測比較した結果、B(report=committed / next=terminal の責務分離、Stop hook 無改修、多義サイトを型で解消)が A(report に terminal 判定を負わせ終端 ack が『continue』と言う Major 欠陥、Stop hook 改修、CONFLICTING)より優ると確定。#2762 は #2767(B、squash 34888d840)で解決・CLOSED。本 intent の CG 成果 #2770(A)は supersede クローズした。汚染は provenance の記述のみで、採用結論は実測に接地している。
